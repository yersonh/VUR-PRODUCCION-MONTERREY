<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Exception;

class ClienteCore
{
    protected string $baseUrl;
    protected string $token;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.core.url'), '/');
        $this->token = config('services.core.token');
    }

    private function cliente()
    {
        return Http::withToken($this->token)
            ->acceptJson()
            ->timeout(15);
    }

    private function get(string $path, array $query = [])
    {
        $response = $this->cliente()->get("{$this->baseUrl}/{$path}", $query);

        if ($response->failed()) {
            Log::error("Core API error en GET {$path}", [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new Exception("Error al consultar Core API ({$path}): HTTP {$response->status()}");
        }

        return $response->json();
    }

    private function post(string $path, array $data = [])
    {
        $response = $this->cliente()->post("{$this->baseUrl}/{$path}", $data);

        if ($response->failed()) {
            Log::error("Core API error en POST {$path}", [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new Exception("Error al consultar Core API ({$path}): HTTP {$response->status()}");
        }

        return $response->json();
    }

    private function put(string $path, array $data = [])
    {
        $response = $this->cliente()->put("{$this->baseUrl}/{$path}", $data);

        if ($response->failed()) {
            Log::error("Core API error en PUT {$path}", [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new Exception("Error al consultar Core API ({$path}): HTTP {$response->status()}");
        }

        return $response->json();
    }

    // ── Dependencias ────────────────────────────────────────────────
    // Respuesta: array plano (sin paginación)

    public function dependencias(): array
    {
        return Cache::remember('core:dependencias', 300, function () {
            return $this->get('dependencias');
        });
    }

    public function dependencia(int $id): ?array
    {
        return collect($this->dependencias())->firstWhere('id', $id);
    }

    public function crearDependencia(array $data): array
    {
        $dependencia = $this->post('dependencias', $data);
        Cache::forget('core:dependencias');

        return $dependencia;
    }

    // ── Tipos de identificación ─────────────────────────────────────
    // Respuesta: array plano. Catálogo fijo, cache larga.

    public function tiposIdentificacion(): array
    {
        return Cache::remember('core:tipos_identificacion', 3600, function () {
            return $this->get('tipos-identificacion');
        });
    }

    public function tipoIdentificacion(int $id): ?array
    {
        return collect($this->tiposIdentificacion())->firstWhere('id', $id);
    }

    // ── Funcionarios ─────────────────────────────────────────────────
    // Respuesta: paginada, con 'persona' y 'dependencia' anidados

    public function funcionarios(array $filtros = []): array
    {
        return $this->get('funcionarios', $filtros);
    }

    public function funcionario(int $id): array
    {
        return $this->get("funcionarios/{$id}");
    }

    public function crearFuncionario(array $data): array
    {
        return $this->post('funcionarios', $data);
    }

    public function actualizarFuncionario(int $id, array $data): array
    {
        return $this->put("funcionarios/{$id}", $data);
    }

    // Crea la persona en el Core si no existe (por tipo_identificacion_id +
    // numero_identificacion) y luego crea el funcionario asociado a esa persona.
    public function crearFuncionarioConPersona(array $datosPersona, array $datosFuncionario): array
    {
        $persona = $this->buscarPersonaPorIdentificacion(
            $datosPersona['tipo_identificacion_id'],
            $datosPersona['numero_identificacion']
        );

        if (!$persona) {
            $persona = $this->crearPersona($datosPersona);
        }

        return $this->crearFuncionario([
            ...$datosFuncionario,
            'persona_id' => $persona['id'],
        ]);
    }

    // ── Personas ───────────────────────────────────────────────────
    // Respuesta: paginada. Catálogo base de identificación (cédula).
    // El filtro del Core SOLO se activa si mandas tipo_identificacion_id
    // Y numero_identificacion juntos; con uno solo, ignora el filtro
    // y devuelve la lista completa paginada (comportamiento real del Core).

    public function personas(array $filtros = []): array
    {
        return $this->get('personas', $filtros);
    }

    public function persona(int $id): array
    {
        return $this->get("personas/{$id}");
    }

    public function buscarPersonaPorIdentificacion(int $tipoIdentificacionId, string $numeroIdentificacion): ?array
    {
        $resultado = $this->personas([
            'tipo_identificacion_id' => $tipoIdentificacionId,
            'numero_identificacion'  => $numeroIdentificacion,
        ]);

        $data = $resultado['data'] ?? [];

        return $data[0] ?? null;
    }

    public function crearPersona(array $data): array
    {
        return $this->post('personas', $data);
    }

    public function actualizarPersona(int $id, array $data): array
    {
        return $this->put("personas/{$id}", $data);
    }

    // ── Ciudadanos ───────────────────────────────────────────────────
    // Respuesta: paginada. Mismo patrón de filtro que 'personas':
    // requiere tipo_identificacion_id + numero_identificacion juntos.

    public function ciudadanos(array $filtros = []): array
    {
        return $this->get('ciudadanos', $filtros);
    }

    public function ciudadano(int $id): array
    {
        return $this->get("ciudadanos/{$id}");
    }

    public function buscarCiudadanoPorIdentificacion(int $tipoIdentificacionId, string $numeroIdentificacion): ?array
    {
        $resultado = $this->ciudadanos([
            'tipo_identificacion_id' => $tipoIdentificacionId,
            'numero_identificacion'  => $numeroIdentificacion,
        ]);

        $data = $resultado['data'] ?? [];

        return $data[0] ?? null;
    }

    public function crearCiudadano(array $data): array
    {
        return $this->post('ciudadanos', $data);
    }

    public function actualizarCiudadano(int $id, array $data): array
    {
        return $this->put("ciudadanos/{$id}", $data);
    }

    // ── Empresas ───────────────────────────────────────────────────
    // Respuesta: paginada. Filtro soportado: nit.

    public function empresas(array $filtros = []): array
    {
        return $this->get('empresas', $filtros);
    }

    public function empresa(int $id): array
    {
        return $this->get("empresas/{$id}");
    }

    public function buscarEmpresaPorNit(string $nit): ?array
    {
        $resultado = $this->empresas(['nit' => $nit]);
        $data = $resultado['data'] ?? [];

        return $data[0] ?? null;
    }

    public function crearEmpresa(array $data): array
    {
        return $this->post('empresas', $data);
    }

    // ── Contratistas ─────────────────────────────────────────────────
    // Respuesta: paginada, con 'persona', 'empresa' y 'dependencia' anidados.
    // IMPORTANTE: el Core solo filtra contratistas por 'persona_id', no por
    // cédula directamente. Por eso, buscar por identificación implica dos
    // pasos: 1) encontrar la persona en /personas, 2) buscar el contratista
    // asociado a esa persona_id.

    public function contratistas(array $filtros = []): array
    {
        return $this->get('contratistas', $filtros);
    }

    public function contratista(int $id): array
    {
        return $this->get("contratistas/{$id}");
    }

    public function buscarContratistaPorIdentificacion(int $tipoIdentificacionId, string $numeroIdentificacion): ?array
    {
        $persona = $this->buscarPersonaPorIdentificacion($tipoIdentificacionId, $numeroIdentificacion);

        if (!$persona) {
            return null;
        }

        $resultado = $this->contratistas(['persona_id' => $persona['id']]);
        $data = $resultado['data'] ?? [];

        return $data[0] ?? null;
    }

    // ── Verificación de conexión ──────────────────────────────────────

    public function verificarConexion(): bool
    {
        try {
            $this->dependencias();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}