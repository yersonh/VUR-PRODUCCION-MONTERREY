<?php

return [

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
        // Usuario "de sistema" que queda como operador_id de los radicados
        // creados automáticamente por el intake público de CDR (ver
        // SolicitudCartaResidenciaController). Sembrado en la migración
        // 2026_07_11_120000_seed_cdr_sistema_user.php.
        'operador_email'                      => env('CDR_OPERADOR_EMAIL', 'sistema.cdr@monterrey.gov.co'),
    ],
    // ── Brevo (correos transaccionales vía API REST) ───────────────
    'brevo' => [
        'api_key'    => env('BREVO_API_KEY'),
        'from_email' => env('SMTP_FROM'),
        'from_name'  => env('SMTP_FROM_NAME', 'Sistema de Radicación'),
    ],

];
