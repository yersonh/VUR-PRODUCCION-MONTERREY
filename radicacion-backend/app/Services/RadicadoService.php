<?php

namespace App\Services;

use App\Jobs\EnviarSolicitudResidenciaACdr;
use App\Models\EstadoCorrespondencia;
use App\Models\Radicado;
use App\Models\RadicadoActuacion;
use App\Models\RadicadoDocumento;
use App\Models\Tercero;
use App\Models\TipoCorrespondencia;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RadicadoService
{
    public function __construct(
        private PdfStorageService    $pdfStorage,
        private GeminiService        $gemini,
        private BrevoMailService     $brevo,
        private NotificacionService  $notificacion,
        private ClienteCore          $core,
        private QrService            $qr,
    ) {}

    /**
     * Genera el siguiente número de radicado global (no reinicia por año).
     * Usa un lock de base de datos para evitar duplicados bajo concurrencia.
     */
    public function siguienteNumero(): int
    {
        $año = now()->year;
        return (Radicado::where('año_radicado', $año)->max('nro_radicado') ?? 0) + 1;
    }

    private function siguienteNumeroConLock(): int
    {
        $año = now()->year;
        // Advisory lock de PostgreSQL: serializa la generación del número sin
        // bloquear filas (FOR UPDATE falla con agregados en PG).
        // El lock se libera automáticamente al finalizar la transacción.
        DB::select('SELECT pg_advisory_xact_lock(42)');
        $max = Radicado::where('año_radicado', $año)->max('nro_radicado') ?? 0;
        return (int) $max + 1;
    }

    /**
     * Crea un nuevo radicado con su PDF de entrada y opcionalmente PDF de salida.
     * Retorna el Radicado creado con todas sus relaciones cargadas.
     */
    public function crear(array $datos, int $operadorId, ?UploadedFile $pdfEntrada, ?UploadedFile $pdfSalida, bool $analizarIa = true): Radicado
    {
        return DB::transaction(function () use ($datos, $operadorId, $pdfEntrada, $pdfSalida, $analizarIa) {
            $nro  = $this->siguienteNumeroConLock();
            $año  = now()->year;
            $hoy  = Carbon::now();

            // Los anexos pueden traer un archivo PDF (UploadedFile) por item; se
            // guardan aparte como RadicadoDocumento tipo ANEXO y se quitan del
            // array antes del create() para no meter un UploadedFile en la
            // columna JSON 'anexos'.
            $anexosInput = $datos['anexos'] ?? [];
            unset($datos['anexos']);

            // Calcular fecha límite
            $tipoCorr = TipoCorrespondencia::findOrFail($datos['tipo_correspondencia_id']);
            $fechaLimite = $tipoCorr->max_dias > 0
                ? $hoy->copy()->addWeekdays($tipoCorr->max_dias)->toDateString()
                : null;

            // Estado inicial
            $estadoInicial = EstadoCorrespondencia::where('codigo', 'RADICADO')->firstOrFail();

            $radicado = Radicado::create(array_merge($datos, [
                'nro_radicado'    => $nro,
                'año_radicado'    => $año,
                'fecha_radicacion'=> $hoy->toDateString(),
                'hora_radicacion' => $hoy->toTimeString('minute'),
                'fecha_limite'    => $fechaLimite,
                'estado_id'       => $estadoInicial->id,
                'operador_id'     => $operadorId,
                'ia_procesado'    => false,
            ]));

            // Guardar PDFs
            if ($pdfEntrada) {
                $this->adjuntarPdf($radicado, $pdfEntrada, 'ENTRADA', $operadorId);
            }
            if ($pdfSalida) {
                $this->adjuntarPdf($radicado, $pdfSalida, 'SALIDA', $operadorId);
            }
            if (!empty($anexosInput)) {
                $radicado->update(['anexos' => $this->guardarAnexos($radicado, $anexosInput, $operadorId)]);
            }

            // Actuación inicial
            RadicadoActuacion::create([
                'radicado_id'       => $radicado->id,
                'descripcion'       => 'Radicado ingresado al sistema',
                'estado_anterior_id'=> null,
                'estado_nuevo_id'   => $estadoInicial->id,
                'usuario_id'        => $operadorId,
            ]);

            // Analizar PDF con IA si existe y el caller lo pidió (los intakes
            // que ya traen todos los campos estructurados, como CDR, pasan
            // analizarIa: false para no gastar la llamada a Gemini en vano).
            if ($pdfEntrada && $analizarIa) {
                $this->procesarIaAsync($radicado, $pdfEntrada);
            }

            // Envío automático a CDR (peer-to-peer) si es una solicitud de
            // Carta de Residencia. En cola y afterCommit() para no enviar
            // nada si esta transacción termina fallando.
            // NOTA: ->afterCommit() difiere la ejecución del Job hasta que
            // esta transacción hace commit — eso ocurre dentro del propio
            // DB::transaction(), no aquí, así que un try/catch en este punto
            // no alcanza a atrapar el fallo del Job (ver manejo de errores
            // dentro de EnviarSolicitudResidenciaACdr::handle()).
            if ((int) $radicado->tipo_correspondencia_id === (int) config('services.cdr.tipo_correspondencia_residencia_id')) {
                EnviarSolicitudResidenciaACdr::dispatch($radicado->id)->afterCommit();
                $this->notificacion->notificarSolicitudCdr($radicado, $operadorId);
            }

            // Notificar al responsable/dependencia destino (sistema interno)
            $this->notificacion->notificarNuevoRadicado($radicado, $operadorId);

            // Si el destino tiene un funcionario específico con email conocido
            // en el Core, avisarle también por correo (más confiable que
            // esperar a que entre a revisar notificaciones in-app).
            $responsableInfo = $this->funcionarioInfo($radicado->personal_destino_id);
            if ($responsableInfo && !empty($responsableInfo['email'])) {
                $this->brevo->notificarDependenciaDestino(
                    emailDestino:         $responsableInfo['email'],
                    nombreDestino:        $responsableInfo['nombre_completo'],
                    numeroRadicado:       $radicado->numeroRadicado,
                    remitente:            $this->nombreRemitente($radicado),
                    tipoCorrespondencia:  $radicado->tipoCorrespondencia?->descripcion ?? '',
                    asunto:               $radicado->aux_descripcion ?? '',
                    radicadoId:           $radicado->id,
                );
            }

            // Correo de confirmación al remitente si tiene email
            $emailRemitente  = $this->emailRemitente($radicado);
            $nombreRemitente = $this->nombreRemitente($radicado);

            if ($emailRemitente) {
                $this->brevo->enviarConfirmacionRadicado(
                    destinatarioEmail:      $emailRemitente,
                    destinatarioNombre:     $nombreRemitente,
                    numeroRadicado:         $radicado->numeroRadicado,
                    fechaRadicacion:        $radicado->fecha_radicacion,
                    tipoCorrespondencia:    $radicado->tipoCorrespondencia?->descripcion ?? '',
                    dependenciaDestino:     $this->dependenciaInfo($radicado->dependencia_destino_id)['descripcion'] ?? '',
                    fechaLimite:            $radicado->fecha_limite,
                    responsable:            $responsableInfo['nombre_completo'] ?? null,
                    radicadoId:             $radicado->id,
                );
            }

            return $radicado->load($this->relaciones());
        });
    }

    /**
     * Cambia el estado de un radicado y registra la actuación.
     */
    public function cambiarEstado(Radicado $radicado, string $codigoEstado, string $observacion, int $usuarioId, bool $notificar = true): Radicado
    {
        $estadoAnterior = $radicado->estado;
        $estadoNuevo    = EstadoCorrespondencia::where('codigo', $codigoEstado)->firstOrFail();

        DB::transaction(function () use ($radicado, $estadoAnterior, $estadoNuevo, $observacion, $usuarioId) {
            $radicado->update(['estado_id' => $estadoNuevo->id]);

            RadicadoActuacion::create([
                'radicado_id'       => $radicado->id,
                'descripcion'       => $observacion ?: "Cambio de estado a {$estadoNuevo->descripcion}",
                'estado_anterior_id'=> $estadoAnterior->id,
                'estado_nuevo_id'   => $estadoNuevo->id,
                'usuario_id'        => $usuarioId,
            ]);
        });

        $radicado->load('estado');
        if ($notificar) {
            $this->notificacion->notificarCambioEstado($radicado, $usuarioId);
        }

        // Avisar por correo al remitente — salvo cuando este cambio a
        // RESPONDIDO viene de adjuntarPdfSalida() (identificado porque ese
        // método pasa notificar:false), que ya dispara su propio correo más
        // específico (ver notificarRespuestaDisponible()); duplicar aquí
        // sería redundante. Si RESPONDIDO llega por otra vía (p. ej. el
        // webhook de CDR en SolicitudCartaResidenciaController), sí hay que
        // avisar aquí porque nadie más lo hace.
        if (!($estadoNuevo->codigo === 'RESPONDIDO' && !$notificar)) {
            $emailRemitente = $this->emailRemitente($radicado);
            if ($emailRemitente) {
                $this->brevo->enviarCambioEstado(
                    email:              $emailRemitente,
                    nombre:             $this->nombreRemitente($radicado),
                    numeroRadicado:     $radicado->numeroRadicado,
                    estadoCodigo:       $estadoNuevo->codigo,
                    estadoDescripcion:  $estadoNuevo->descripcion,
                    observacion:        $observacion ?: null,
                    radicadoId:         $radicado->id,
                );
            }
        }

        return $radicado->fresh($this->relaciones());
    }

    /**
     * Adjunta el PDF de salida (la respuesta) al radicado. Solo debe llamarse
     * después de validar RadicadoService::puedeResponder() — este método no
     * repite ese chequeo. Al adjuntarlo, el radicado pasa automáticamente a
     * RESPONDIDO (subir la respuesta ES la acción de responder) y se avisa
     * al operador que radicó la entrada y al remitente.
     */
    public function adjuntarPdfSalida(Radicado $radicado, UploadedFile $file, int $usuarioId): Radicado
    {
        DB::transaction(function () use ($radicado, $file, $usuarioId) {
            // Eliminar PDF salida anterior si existe
            $anterior = $radicado->documentos()->where('tipo', 'SALIDA')->first();
            if ($anterior) {
                $this->pdfStorage->eliminar($anterior->ruta_almacenamiento);
                $anterior->delete();
            }
            $this->adjuntarPdf($radicado, $file, 'SALIDA', $usuarioId);
        });

        $radicado->load('estado');
        if (!$radicado->estado?->es_terminal) {
            $radicado = $this->cambiarEstado($radicado, 'RESPONDIDO', 'Respuesta adjuntada por el responsable', $usuarioId, notificar: false);
        }

        $this->notificarRespuestaDisponible($radicado, $usuarioId);

        return $radicado->fresh($this->relaciones());
    }

    /**
     * Avisa (in-app + correo) al operador que radicó la entrada y al
     * remitente de que ya hay respuesta disponible para su radicado.
     */
    private function notificarRespuestaDisponible(Radicado $radicado, int $ejecutorId): void
    {
        $this->notificacion->notificarRespuestaCargada($radicado, $ejecutorId);

        $fechaRespuesta = now()->format('d/m/Y');

        if ($radicado->operador && $radicado->operador->id !== $ejecutorId && $radicado->operador->email) {
            $this->brevo->enviarRespuestaDisponible(
                email:           $radicado->operador->email,
                nombre:          $radicado->operador->name,
                numeroRadicado:  $radicado->numeroRadicado,
                fechaRespuesta:  $fechaRespuesta,
                radicadoId:      $radicado->id,
            );
        }

        // Al remitente no se le avisa cuando el radicado es una Solicitud de
        // Carta de Residencia: ese trámite lo gestiona CDR de punta a punta y
        // CDR ya le manda su propio correo al ciudadano al responder —
        // duplicaríamos el aviso. Sí seguimos avisando al operador arriba,
        // porque ese correo/notificación es interno de VUR.
        $esResidenciaCdr = (int) $radicado->tipo_correspondencia_id === (int) config('services.cdr.tipo_correspondencia_residencia_id');

        $emailRemitente = $esResidenciaCdr ? null : $this->emailRemitente($radicado);
        if ($emailRemitente) {
            $pdfSalida = $radicado->documentos->firstWhere('tipo', 'SALIDA');

            $this->brevo->enviarRespuestaDisponible(
                email:            $emailRemitente,
                nombre:           $this->nombreRemitente($radicado),
                numeroRadicado:   $radicado->numeroRadicado,
                fechaRespuesta:   $fechaRespuesta,
                radicadoId:       $radicado->id,
                pdfContenido:     $pdfSalida ? $this->pdfStorage->contenido($pdfSalida->ruta_almacenamiento) : null,
                pdfNombreArchivo: "Radicado-{$radicado->numeroRadicado}-respuesta.pdf",
            );
        }
    }

    /**
     * Determina si el usuario autenticado puede adjuntar la respuesta
     * (PDF de salida) de este radicado. ADMIN siempre puede; si el radicado
     * tiene un funcionario responsable asignado, solo esa persona (por
     * funcionario_id); si no, cualquiera de la dependencia destino.
     */
    public function puedeResponder(Radicado $radicado, ?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        if ($radicado->personal_destino_id) {
            return $user->funcionario_id !== null
                && (int) $user->funcionario_id === (int) $radicado->personal_destino_id;
        }

        return $user->dependencia_id !== null
            && (int) $user->dependencia_id === (int) $radicado->dependencia_destino_id;
    }

    /**
     * Agrega uno o más anexos (PDF) a un radicado ya creado.
     */
    public function agregarAnexos(Radicado $radicado, array $anexosInput, int $usuarioId): Radicado
    {
        return DB::transaction(function () use ($radicado, $anexosInput, $usuarioId) {
            $nuevos   = $this->guardarAnexos($radicado, $anexosInput, $usuarioId);
            $actuales = $radicado->anexos ?? [];

            $radicado->update(['anexos' => [...$actuales, ...$nuevos]]);

            return $radicado->fresh($this->relaciones());
        });
    }

    /**
     * Elimina un anexo (documento PDF + su entrada en el JSON 'anexos').
     */
    public function eliminarAnexo(Radicado $radicado, int $documentoId): Radicado
    {
        DB::transaction(function () use ($radicado, $documentoId) {
            $documento = $radicado->documentos()
                ->where('id', $documentoId)
                ->where('tipo', 'ANEXO')
                ->first();

            if (!$documento) {
                return;
            }

            $this->pdfStorage->eliminar($documento->ruta_almacenamiento);
            $documento->delete();

            $actuales = collect($radicado->anexos ?? [])
                ->reject(fn (array $a) => ($a['documento_id'] ?? null) === $documentoId)
                ->values()
                ->all();

            $radicado->update(['anexos' => $actuales]);
        });

        return $radicado->fresh($this->relaciones());
    }

    // ── Privados ────────────────────────────────────────────────────

    // Guarda el PDF de cada anexo que traiga archivo (RadicadoDocumento tipo
    // ANEXO) y devuelve el array listo para la columna JSON 'anexos', con
    // 'documento_id' enlazado para poder descargar/eliminar cada uno después.
    private function guardarAnexos(Radicado $radicado, array $anexosInput, int $usuarioId): array
    {
        return collect($anexosInput)->map(function (array $item) use ($radicado, $usuarioId) {
            $archivo     = $item['archivo'] ?? null;
            $documentoId = null;

            if ($archivo instanceof UploadedFile) {
                $documentoId = $this->adjuntarPdf($radicado, $archivo, 'ANEXO', $usuarioId)->id;
            }

            return [
                'descripcion'  => $item['descripcion'] ?? '',
                'tipo_id'      => $item['tipo_id'] ?? null,
                'documento_id' => $documentoId,
            ];
        })->all();
    }

    private function adjuntarPdf(Radicado $radicado, UploadedFile $file, string $tipo, int $subidoPor): RadicadoDocumento
    {
        $codigoVerificacion = null;
        $nombreOriginal = $file->getClientOriginalName();
        $mimeType = $file->getMimeType() ?? 'application/pdf';

        // Solo la respuesta (SALIDA) lleva QR — es la que se entrega al
        // remitente y la que tiene sentido verificar públicamente. El
        // documento puede llegar como escaneo (solo imagen) o con texto real;
        // a FPDI no le importa, solo importa la página tal cual y dibuja el
        // QR encima, sin volver a interpretar el contenido.
        if ($tipo === 'SALIDA') {
            $codigoVerificacion = $this->codigoVerificacionUnico();
            $urlVerificacion = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/')
                ."/verificar-respuesta?codigo={$codigoVerificacion}";

            $qrPng = $this->qr->png($urlVerificacion);
            $rutaEstampada = $this->pdfStorage->estamparQr($file->getRealPath(), $qrPng);

            try {
                // A partir de aquí se guarda el PDF YA estampado, no el que
                // llegó. El tamaño final hay que leerlo del estampado ANTES
                // de borrar el temporal — el original ya no refleja el
                // tamaño real que quedó en disco.
                $archivoEstampado = new UploadedFile($rutaEstampada, $nombreOriginal, 'application/pdf', null, true);
                $ruta = $this->pdfStorage->guardar($archivoEstampado, $radicado->año_radicado, $radicado->nro_radicado, $tipo);
                $tamanioBytes = $archivoEstampado->getSize();
                $mimeType = 'application/pdf';
            } finally {
                @unlink($rutaEstampada);
            }
        } else {
            $ruta = $this->pdfStorage->guardar($file, $radicado->año_radicado, $radicado->nro_radicado, $tipo);
            $tamanioBytes = $file->getSize();
        }

        return RadicadoDocumento::create([
            'radicado_id'          => $radicado->id,
            'tipo'                 => $tipo,
            'codigo_verificacion'  => $codigoVerificacion,
            'nombre_original'      => $nombreOriginal,
            'ruta_almacenamiento'  => $ruta,
            'tamanio_bytes'        => $tamanioBytes,
            'mime_type'            => $mimeType,
            'subido_por'           => $subidoPor,
        ]);
    }

    /**
     * Código corto y aleatorio (no secuencial, para que no se pueda adivinar
     * probando consecutivos) para la consulta pública del documento de
     * respuesta — mismo patrón que usa CDR para el código de verificación
     * de sus certificados.
     */
    private function codigoVerificacionUnico(): string
    {
        do {
            $codigo = strtoupper(Str::random(4).'-'.Str::random(4));
        } while (RadicadoDocumento::where('codigo_verificacion', $codigo)->exists());

        return $codigo;
    }

    private function procesarIaAsync(Radicado $radicado, UploadedFile $pdfEntrada): void
    {
        try {
            $campos  = $this->gemini->analizarPdf($pdfEntrada->getRealPath(), $pdfEntrada->getClientOriginalName());

            if ($campos) {
                $radicado->update([
                    'ia_procesado'        => true,
                    'ia_campos_sugeridos' => $campos,
                ]);
            }
        } catch (\Throwable) {
            // IA es opcional — no bloquea el radicado
        }
    }

    public function relaciones(): array
    {
        return [
            'tercero',
            'terceroDestino',
            'tipoCorrespondencia',
            'auxTip',
            'tipoAnexo',
            'medioIngreso',
            'estado',
            'operador.role',
            'documentos',
            'actuaciones.estadoAnterior',
            'actuaciones.estadoNuevo',
            'actuaciones.usuario',
        ];
    }

    // ── Enriquecimiento con datos del Core ────────────────────────────
    // 'funcionario_id', 'personal_destino_id', 'dependencia_remitente_id' y
    // 'dependencia_destino_id' son columnas planas (sin FK) que apuntan a
    // recursos del Core. Estos helpers los resuelven vía ClienteCore.

    public function dependenciaInfo(?int $id): ?array
    {
        if (!$id) {
            return null;
        }

        $dependencia = collect($this->core->dependencias())->firstWhere('id', $id);
        if (!$dependencia) {
            return null;
        }

        return [
            'id'          => $dependencia['id'],
            'descripcion' => $dependencia['nombre'],
            'activo'      => $dependencia['activo'] ?? true,
        ];
    }

    public function funcionarioInfo(?int $id): ?array
    {
        if (!$id) {
            return null;
        }

        try {
            $funcionario = $this->core->funcionario($id);
        } catch (\Throwable $e) {
            Log::warning("No se pudo cargar funcionario {$id} del Core: {$e->getMessage()}");
            return null;
        }

        $persona = $funcionario['persona'] ?? [];

        return [
            'id'              => $funcionario['id'],
            'cedula'          => $persona['numero_identificacion'] ?? '',
            'nombre_completo' => trim(($persona['nombres'] ?? '').' '.($persona['apellidos'] ?? '')),
            'cargo'           => $funcionario['cargo'] ?? null,
            'email'           => $persona['email'] ?? null,
            'dependencia_id'  => $funcionario['dependencia_id'] ?? null,
        ];
    }

    public function terceroInfo(?Tercero $tercero): ?array
    {
        if (!$tercero) {
            return null;
        }

        try {
            $entidad = $tercero->categoria === 'EMPRESA'
                ? $this->core->empresa($tercero->core_id)
                : $this->core->ciudadano($tercero->core_id);
        } catch (\Throwable $e) {
            Log::warning("No se pudo cargar {$tercero->categoria} {$tercero->core_id} del Core: {$e->getMessage()}");
            return null;
        }

        $esEmpresa = $tercero->categoria === 'EMPRESA';

        // tipo_documento: el Core solo guarda tipo_identificacion_id numérico;
        // se traduce a su código de texto (CC/TI/CE/PA/PEP/NIT) porque es lo
        // que consumen sistemas externos como CDR. Solo aplica a personas,
        // nunca a empresas (que se identifican por NIT).
        $tipoDocumento = null;
        if (!$esEmpresa && !empty($entidad['tipo_identificacion_id'])) {
            try {
                $tipoDocumento = $this->core->tipoIdentificacion($entidad['tipo_identificacion_id'])['codigo'] ?? null;
            } catch (\Throwable $e) {
                Log::warning("No se pudo resolver tipo_identificacion_id {$entidad['tipo_identificacion_id']} del Core: {$e->getMessage()}");
            }
        }

        return [
            'id'              => $tercero->id,
            'codigo'          => $tercero->codigo,
            'categoria'       => $tercero->categoria,
            'nro_identificacion' => $esEmpresa ? ($entidad['nit'] ?? '') : ($entidad['numero_identificacion'] ?? ''),
            'nombre_completo' => $esEmpresa
                ? ($entidad['razon_social'] ?? '')
                : trim(($entidad['nombres'] ?? '').' '.($entidad['apellidos'] ?? '')),
            'email'          => $entidad['email'] ?? null,
            'telefono'       => $entidad['telefono'] ?? null,
            'direccion'      => $entidad['direccion'] ?? null,
            'tipo_documento' => $tipoDocumento,
        ];
    }

    public function nombreRemitente(Radicado $radicado): string
    {
        return match ($radicado->tipo_remitente) {
            'TERCERO_NIT', 'CIUDADANO' => $this->terceroInfo($radicado->tercero)['nombre_completo']
                ?? $radicado->nombre_persona_empresa ?? '—',
            'FUNCIONARIO' => $this->funcionarioInfo($radicado->funcionario_id)['nombre_completo'] ?? '—',
            default       => $radicado->nombre_persona_empresa ?? '—',
        };
    }

    public function emailRemitente(Radicado $radicado): ?string
    {
        return match ($radicado->tipo_remitente) {
            'TERCERO_NIT', 'CIUDADANO' => $this->terceroInfo($radicado->tercero)['email'] ?? null,
            'FUNCIONARIO'              => $this->funcionarioInfo($radicado->funcionario_id)['email'] ?? null,
            default                    => null,
        };
    }
}
