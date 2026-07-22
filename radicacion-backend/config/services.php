<?php

return [

    // ── Frontend público ─────────────────────────────────────────────
    // URL base que se incrusta en artefactos que salen del sistema hacia
    // gente real (QR de verificación en PDFs, botones de los correos) —
    // separada de FRONTEND_URL (que solo controla el origen permitido por
    // CORS) porque en un entorno de desarrollo apuntando a una BD/Brevo
    // compartidos, FRONTEND_URL suele ser http://localhost:xxxx (útil para
    // CORS local) pero un QR o un link de correo con esa URL es inservible
    // para quien lo recibe. Si no se define, cae de vuelta a FRONTEND_URL.
    'frontend' => [
        'url_publica' => env('FRONTEND_PUBLIC_URL', env('FRONTEND_URL', 'http://localhost:5173')),
    ],

    'postmark' => ['key' => env('POSTMARK_API_KEY')],
    'resend'   => ['key' => env('RESEND_API_KEY')],
    'ses'      => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],
    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // ── Gemini IA ──────────────────────────────────────────────────
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model'   => env('GEMINI_MODEL', 'gemini-2.5-flash'),
    ],

    // ── Core Institucional (datos maestros: personas, dependencias, funcionarios) ──
    'core' => [
        'url'   => env('CORE_API_URL'),
        'token' => env('CORE_API_TOKEN'),
    ],
    // ── CDR (Certificado de Residencia Digital) — envío directo (peer-to-peer,
    //    sin pasar por el Core) de solicitudes de Carta de Residencia ──
    'cdr' => [
        'url'                                 => env('CDR_API_URL'),
        'token'                               => env('CDR_API_TOKEN'),
        'tipo_correspondencia_residencia_id'  => env('VUR_TIPO_CORRESPONDENCIA_RESIDENCIA_ID', 90),
        // TipoAnexo "Cédula de Ciudadanía" — sembrado en
        // 2026_07_20_000001_seed_tipo_anexo_cedula.php. Usado para exigir
        // el anexo de cédula en el flujo de Solicitud Carta de Residencia
        // y para la validación IA del número de documento.
        'tipo_anexo_cedula_id'                => env('VUR_TIPO_ANEXO_CEDULA_ID', 100),
        // Usuario "de sistema" que queda como operador_id de los radicados
        // creados automáticamente por el intake público de CDR (ver
        // SolicitudCartaResidenciaController). Sembrado en la migración
        // 2026_07_11_120000_seed_cdr_sistema_user.php.
        'operador_email'                      => env('CDR_OPERADOR_EMAIL', 'sistema.cdr@monterrey.gov.co'),
        // URL pública del frontend de CDR — se usa solo para armar el botón
        // "Consultar mi solicitud" del correo de confirmación de radicado,
        // cuando el radicado es una Solicitud Carta de Residencia (ver
        // RadicadoService::crear() y BrevoMailService::enviarConfirmacionRadicado()).
        'frontend_url'                        => env('CDR_FRONTEND_URL'),
    ],
    // ── Brevo (correos transaccionales vía API REST) ───────────────
    'brevo' => [
        'api_key'    => env('BREVO_API_KEY'),
        'from_email' => env('SMTP_FROM'),
        'from_name'  => env('SMTP_FROM_NAME', 'Sistema de Radicación'),
    ],

];
