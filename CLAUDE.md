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
- **Spatie Laravel Permission** — Roles: `ADMIN`, `OPERADOR`, `JEFE_DEPENDENCIA`, `FUNCIONARIO`
- **Google Gemini Flash 2.5** — PDF analysis via `GeminiService`
- **Brevo REST API** — Email (not SMTP) via `BrevoMailService`

### Architecture

All routes are under `/api/v1/`. Public: `POST /auth/login`. Everything else requires Sanctum Bearer token. Admin routes additionally require `EnsureAdmin` middleware.

Service layer pattern: controllers delegate business logic to `app/Services/`. Key services: `RadicadoService`, `GeminiService`, `BrevoMailService`, `PdfStorageService`, `NotificacionService`.

The main domain entity is `Radicado` — a correspondence record with soft deletes, PDF attachments (`RadicadoDocumento`), action history (`RadicadoActuacion`), and a configurable status workflow (`EstadoCorrespondencia` with color, order, terminal flag). The `nro_radicado + año_radicado` pair is the unique reference (number resets per year); sequential numbering uses a DB lock in `RadicadoService::siguienteNumeroConLock()` to avoid duplicates under concurrency.

`Radicado` update uses `POST /radicados/{id}` instead of `PUT` because browsers can't send multipart/form-data via PUT — the controller handles this transparently.

Expected `EstadoCorrespondencia` codes (seeded): `RADICADO`, `EN_TRAMITE`, `RESPONDIDO`, `CERRADO`, `ANULADO`. `RADICADO` is always the initial status on creation.

Catalogs (read-only in normal use): `TipoCorrespondencia`, `TipoIdentificacion`, `TipoAnexo`, `AuxTip`, `MedioIngreso`, `EstadoCorrespondencia`, `Dependencia`.

External parties linked to radicados: `Tercero` (categoria: `EMPRESA` | `CIUDADANO`, with `TerceroContacto` sub-records) and `Personal` (municipal staff).

### Environment

Copy `.env.example` to `.env`. Key vars:
- `DB_CONNECTION=pgsql` (or `sqlite` for local dev)
- `GEMINI_API_KEY` — required for AI PDF analysis
- `BREVO_API_KEY` — required for email notifications
- `FRONTEND_URL` — used by CORS and Sanctum stateful domains

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
| Primary dark | `#1B3A6E` | Headers, sidebar |
| Primary bright | `#2B5BA8` | Buttons, links, focus rings |
| Primary light | `#DBEAFE` | Backgrounds, badges |
| Accent gold | `#C8A800` | Secondary highlights |
| BG neutral | `#F1F5F9` | Page backgrounds |
| Border | `#CBD5E1` | Card/input borders |
| Text primary | `#1E293B` | Body text |
| Text muted | `#64748B` | Labels, placeholders |

Font: Inter. Focus ring: `2px solid #2B5BA8`.

## Deployment

Production on Railway.app:
- Backend: `https://radicacion-api.railway.app`
- Frontend: `https://radicacion.railway.app`

CORS is configured in `radicacion-backend/config/cors.php` and Sanctum stateful domains in `config/sanctum.php` — update both when adding new origins.
