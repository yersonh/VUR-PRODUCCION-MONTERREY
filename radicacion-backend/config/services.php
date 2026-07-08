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
    // ── Brevo (correos transaccionales vía API REST) ───────────────
    'brevo' => [
        'api_key'    => env('BREVO_API_KEY'),
        'from_email' => env('SMTP_FROM'),
        'from_name'  => env('SMTP_FROM_NAME', 'Sistema de Radicación'),
    ],

];
