# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema de Radicación de Correspondencia for the Alcaldía de Monterrey Casanare. A government document registry that handles incoming correspondence with AI-assisted PDF processing, multi-user workflow, and audit trails. Developer brand: **NexGovIA**.

## Repository Structure

```
Radicacion de remitente Monterrey/
├── radicacion-backend/    Laravel 13 REST API (port 8000)
├── radicacion-frontend/   React 19 + TypeScript SPA (port 5173)
└── Imagenes/              Branding assets
```

## Backend (`radicacion-backend/`)

### Commands

```bash
# Development (run each in a separate terminal)
php artisan serve        # API server on http://localhost:8000
php artisan queue:listen # Process queued jobs (email, notifications)
php artisan pail         # Stream logs

# Testing
php artisan config:clear && php artisan test
php artisan test --filter=TestName   # Single test

# Database
php artisan migrate
php artisan migrate:fresh --seed
```

### Tech Stack

- **PHP 8.3 + Laravel 13** with PostgreSQL (production) / SQLite (dev)
- **Redis** for sessions, cache, and queues
- **Laravel Sanctum** — Bearer token auth for SPA
- **Spatie Laravel Permission** — Roles: `ADMIN`, `OPERADOR`, `FUNCIONARIO`
- **Google Gemini Flash 2.5** — PDF analysis via `GeminiService`
- **Brevo REST API** — Email (not SMTP) via `BrevoMailService`

### Architecture

All routes are under `/api/v1/`. Public: `POST /auth/login`. Everything else requires Sanctum Bearer token. Admin routes additionally require `EnsureAdmin` middleware.

Service layer pattern: controllers delegate business logic to `app/Services/`. Key services: `RadicadoService`, `GeminiService`, `BrevoMailService`, `PdfStorageService`, `NotificacionService`.

The main domain entity is `Radicado` — a correspondence record with soft deletes, PDF attachments (`RadicadoDocumento`), action history (`RadicadoActuacion`), and a configurable status workflow (`EstadoCorrespondencia` with color, order, terminal flag). The `nro_radicado + año_radicado` pair is the unique reference (number resets per year); sequential numbering uses a DB lock in `RadicadoService::siguienteNumeroConLock()` to avoid duplicates under concurrency.

`Radicado` update uses `POST /radicados/{id}` instead of `PUT` because browsers can't send multipart/form-data via PUT — the controller handles this transparently.

Expected `EstadoCorrespondencia` codes (seeded): `RADICADO`, `EN_TRAMITE`, `RESPONDIDO`, `CERRADO`, `ANULADO`. `RADICADO` is kept only for historical rows — new radicados are created directly in `EN_TRAMITE` (`RadicadoService::crear()` skips the `RADICADO` step). There is no manual "cambiar estado" UI; `RESPONDIDO` happens automatically when the response PDF is attached, and `ANULADO` is the only state reachable via a manual action (admin-only "Anular" button).

Local catalogs (own tables, read-only in normal use): `TipoCorrespondencia`, `TipoAnexo`, `AuxTip` (optionally scoped to a `TipoCorrespondencia` via nullable `tipo_correspondencia_id`), `MedioIngreso`, `EstadoCorrespondencia`.

A `Radicado`'s destino is always an internal dependencia (never an external tercero/ciudadano) — `Radicado.dependencia_destino_id` is `required` in `RadicadoController::reglasValidacion()`. Each `TipoCorrespondencia` carries its own default `dependencia_destino_id` (set via the admin catalog), and the frontend auto-fills/locks the destino dependencia field from that default when the user picks a tipo de correspondencia — unless `GeminiService`'s PDF analysis already detected a destino dependencia, in which case that detection wins and later tipo-de-correspondencia changes don't override it. The legacy `tipo_destino`/`tercero_destino_id`/`nombre_persona_destino` columns on `Radicado` still exist for historical rows but are no longer written on create.

### Core Institucional integration

VUR does **not** own its master data for people/companies/departments — that data lives in a separate system, the **Core Institucional** (a different Laravel API, reachable at `CORE_API_URL` with a Bearer token in `CORE_API_TOKEN`). All access goes through `app/Services/ClienteCore.php`; never query these as local Eloquent models — the corresponding tables and models (`Personal`, `Dependencia`, `TipoIdentificacion`) were removed from VUR.

- **Dependencias** and **tipos de identificación**: read-only catalogs from the Core (`ClienteCore::dependencias()`, cached 5 min; `tiposIdentificacion()`, cached 1 hour). The Core's field is `nombre`, not `descripcion` — controllers remap it before returning JSON to keep the frontend's `Dependencia { descripcion }` shape.
- **Funcionarios** (`funcionario_id`/`personal_destino_id` columns on `Radicado` and elsewhere): fetched/created via `ClienteCore::funcionario()`/`crearFuncionarioConPersona()`. A funcionario wraps a `persona` (identification/contact data) + a `dependencia_id`/`cargo`.
- **Ciudadanos** and **empresas** (the two `Tercero.categoria` values): fetched/created via `ClienteCore::ciudadano()`/`empresa()` and `crearCiudadano()`/`crearEmpresa()`.
- **`Tercero`** is now a thin local bridge table — `{id, codigo, categoria, core_id}` — not a data table. It exists only so `Radicado.tercero_id` (remitente) has a stable local FK to point to; the actual name/NIT/email etc. are always fetched live from the Core (`TerceroController`/`RadicadoService::terceroInfo()` do a find-or-create on this bridge table keyed by `{categoria, core_id}`). `TerceroContacto` (a contact person for an EMPRESA, e.g. "who to address correspondence to") is VUR-only — the Core has no such concept — and references the Core's `empresa_id` directly (no local FK).
- Columns like `funcionario_id`, `personal_destino_id`, `dependencia_remitente_id`, `dependencia_destino_id` on `Radicado`/`User`/`TipoCorrespondencia`/etc. are **plain integer columns, not FKs** — they hold the Core's own id. Look at `RadicadoService`'s `dependenciaInfo()`/`funcionarioInfo()`/`terceroInfo()` helpers for the pattern to resolve them into display data; don't add an Eloquent `belongsTo` for them.

**Known Core API limitations** (don't assume otherwise without checking with whoever owns the Core):
- No free-text search on `funcionarios`/`ciudadanos`/`empresas`/`personas` — only exact filters (`nit`, or `tipo_identificacion_id`+`numero_identificacion` together for personas/ciudadanos). Controllers that need "search as you type" (e.g. `PersonalController`, `TerceroController`) fetch a page and filter client-side in PHP — this only searches within that page, not the whole dataset.
- `dependencias` has no update or activate/deactivate endpoint. `funcionarios` has no activate/deactivate endpoint either. Controllers return `501` with an explanation rather than pretending these work.
- Creating a funcionario/ciudadano requires a two-step Core flow (find-or-create the `persona`/base record, then create the funcionario/ciudadano pointing at it) — see `ClienteCore::crearFuncionarioConPersona()`.

### Environment

Copy `.env.example` to `.env`. Key vars:
- `DB_CONNECTION=pgsql` (or `sqlite` for local dev)
- `CORE_API_URL` / `CORE_API_TOKEN` — required for the Core Institucional integration above; without them, `ClienteCore` throws on construction (its `$token` property is a non-nullable `string`) and every controller that injects it 500s
- `GEMINI_API_KEY` — required for AI PDF analysis
- `BREVO_API_KEY` — required for email notifications
- `FRONTEND_URL` — used by CORS and Sanctum stateful domains

On Windows, outbound HTTPS calls from PHP (Gemini, Brevo, the Core) fail with a cURL SSL error unless `curl.cainfo`/`openssl.cafile` are set in `php.ini` to a CA bundle (e.g. the one from https://curl.se/ca/cacert.pem) — PHP on Windows doesn't fall back to the OS cert store the way Linux builds do.

## Frontend (`radicacion-frontend/`)

### Commands

```bash
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

### Tech Stack

- **React 19 + TypeScript** with Vite 8
- **React Router DOM v7** — SPA routing with lazy-loaded pages
- **Zustand** — Global state (`authStore`, `catalogoStore`)
- **Axios** — API client with auth interceptors in `src/services/api.ts`
- **React Hook Form + Zod** — Form validation
- **Tailwind CSS v4** — Utility-first styling
- **Framer Motion** — Animations
- **HeroIcons** — Icon library
- **react-hot-toast** — Toast notifications

### Architecture

Path alias `@` resolves to `src/`. All API types are centralized in `src/types/index.ts`.

**Routing** (`src/App.tsx`): `/login` is public; all other routes are wrapped in a protected route that checks `useAuthStore`. Pages are lazy-loaded with Suspense.

**State**: Auth state (user, token, isAuthenticated) lives in `authStore`. Catalog data (dropdowns) is cached in `catalogoStore`. Server state is not cached — components fetch on mount via services.

**Services** (`src/services/`): Each service module corresponds to a backend resource. `api.ts` configures the Axios instance with base URL from `VITE_API_URL` and injects the Bearer token from the auth store. Use the `parsePaginated<T>(raw)` helper exported from `api.ts` to transform Laravel's flat pagination response into the `{ data, meta }` shape expected throughout the frontend.

**Auth store** (`authStore`): persisted to `localStorage` under key `radicacion-auth` via `zustand/middleware persist`. Role check pattern: `user.role.nombre === 'ADMIN'` — the `role` is a direct relation, not Spatie's permission system at the frontend level.

**Key UI patterns**:
- `LookupField` — Async search-to-select for Tercero/Personal entities
- `SearchModal` — Full modal search for those same entities
- `IASugerencias` — Renders Gemini AI field suggestions from uploaded PDFs
- `AdminTable` — Generic CRUD table used across all admin pages
- `EstadoBadge` — Status chip with color from `EstadoCorrespondencia.color_hex`

### Environment

Create `.env` at `radicacion-frontend/` (Vite reads it from the project root):
```
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Sistema de Radicación - Alcaldía Monterrey Casanare
```

## Institutional Design System

Defined in `radicacion-frontend/src/index.css`. Do not deviate from these tokens:

| Token | Value | Use |
|-------|-------|-----|
| Primary dark | `#0B1220` | Headers, sidebar, footer |
| Primary bright / accent | `#C8A800` | Buttons, links, focus rings, active nav |
| Primary light | `#1A2E28` | Soft dark-glass backgrounds, badges |
| Success / teal accent | `#1F8C6F` | Secondary highlights, gradients |
| BG neutral | `#F1F5F9` | Light page backgrounds (forms, tables) |
| Border | `#CBD5E1` | Card/input borders |
| Text primary | `#1E293B` | Body text |
| Text muted | `#64748B` | Labels, placeholders |

Font: Inter. Focus ring: `2px solid #C8A800`.

## Deployment

Production on Railway.app:
- Backend: `https://radicacion-api.railway.app`
- Frontend: `https://radicacion.railway.app`

CORS is configured in `radicacion-backend/config/cors.php` and Sanctum stateful domains in `config/sanctum.php` — update both when adding new origins.
