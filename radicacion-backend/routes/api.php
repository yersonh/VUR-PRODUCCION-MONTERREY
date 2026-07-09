<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogoController;
use App\Http\Controllers\Api\IAController;
use App\Http\Controllers\Api\PersonalController;
use App\Http\Controllers\Api\RadicadoController;
use App\Http\Controllers\Api\TerceroController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\Admin\DependenciaAdminController;
use App\Http\Controllers\Api\Admin\TipoCorrespondenciaAdminController;
use App\Http\Controllers\Api\Admin\UserAdminController;
use App\Http\Controllers\Api\Admin\PersonalAdminController;
use App\Http\Controllers\Api\Admin\CatalogoAdminController;
use Illuminate\Support\Facades\Route;

// ── Health check público ───────────────────────────────────────────
Route::get('/health', fn () => response()->json(['ok' => true]));

// ── Prefijo global /api/v1 ─────────────────────────────────────────
Route::prefix('v1')->group(function () {

    // ── Públicas ─────────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
    });

    // ── Protegidas con Sanctum ───────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::get('auth/me',     [AuthController::class, 'me']);
        Route::post('auth/logout',[AuthController::class, 'logout']);

        // Catálogos (GET — sin cache en esta versión, baja frecuencia)
        Route::get('dependencias',            [CatalogoController::class, 'dependencias']);
        Route::get('tipos-correspondencia',   [CatalogoController::class, 'tiposCorrespondencia']);
        Route::get('aux-tips',                [CatalogoController::class, 'auxTips']);
        Route::get('catalogos/tipos-anexo',   [CatalogoController::class, 'tiposAnexo']);
        Route::get('catalogos/medios-ingreso',[CatalogoController::class, 'mediosIngreso']);
        Route::get('catalogos/tipos-identificacion', [CatalogoController::class, 'tiposIdentificacion']);
        Route::get('catalogos/estados',       [CatalogoController::class, 'estados']);

        // Búsqueda de entidades (para modales SearchModal)
        Route::get('terceros',  [TerceroController::class,  'index']);
        Route::post('terceros', [TerceroController::class,  'store']);
        Route::get('terceros/{tercero}/contactos',  [TerceroController::class, 'contactos']);
        Route::post('terceros/{tercero}/contactos', [TerceroController::class, 'storeContacto']);
        Route::get('personal',  [PersonalController::class, 'index']);
        Route::post('personal', [PersonalController::class, 'store']);

        // IA
        Route::post('ia/analizar-pdf', [IAController::class, 'analizarPdf']);

        // Notificaciones
        Route::get('notificaciones',                          [NotificacionController::class, 'index']);
        Route::get('notificaciones/no-leidas',                [NotificacionController::class, 'noLeidas']);
        Route::patch('notificaciones/leer-todas',             [NotificacionController::class, 'marcarTodasLeidas']);
        Route::patch('notificaciones/{id}/leer',              [NotificacionController::class, 'marcarLeida']);

        // Radicados — CRUD + acciones
        Route::get('radicados/siguiente-numero',   [RadicadoController::class, 'siguienteNumero']);
        Route::get('radicados',                    [RadicadoController::class, 'index']);
        Route::post('radicados',                   [RadicadoController::class, 'store']);
        Route::get('radicados/{id}',               [RadicadoController::class, 'show']);
        Route::post('radicados/{id}',              [RadicadoController::class, 'update']);   // multipart PUT simulado
        Route::post('radicados/{id}/anexos',       [RadicadoController::class, 'agregarAnexos']);
        Route::delete('radicados/{id}/anexos/{documentoId}', [RadicadoController::class, 'eliminarAnexo']);
        Route::patch('radicados/{id}/estado',      [RadicadoController::class, 'cambiarEstado']);
        Route::patch('radicados/{id}/anular',      [RadicadoController::class, 'anular']);
        Route::get('radicados/{id}/pdf/{tipo}',    [RadicadoController::class, 'descargarPdf']);
        Route::get('radicados/{id}/documentos/{documentoId}', [RadicadoController::class, 'descargarDocumento']);

        // ── Admin — solo rol ADMIN ───────────────────────────────
        Route::middleware('admin')->prefix('admin')->group(function () {

            // Dependencias
            Route::get('dependencias',                         [DependenciaAdminController::class, 'index']);
            Route::post('dependencias',                        [DependenciaAdminController::class, 'store']);
            Route::put('dependencias/{dependencia}',           [DependenciaAdminController::class, 'update']);
            Route::patch('dependencias/{dependencia}/toggle',  [DependenciaAdminController::class, 'toggleActivo']);

            // Tipos Correspondencia
            Route::get('tipos-correspondencia',                              [TipoCorrespondenciaAdminController::class, 'index']);
            Route::post('tipos-correspondencia',                             [TipoCorrespondenciaAdminController::class, 'store']);
            Route::put('tipos-correspondencia/{tipoCorrespondencia}',        [TipoCorrespondenciaAdminController::class, 'update']);
            Route::patch('tipos-correspondencia/{tipoCorrespondencia}/toggle',[TipoCorrespondenciaAdminController::class, 'toggleActivo']);

            // Usuarios
            Route::get('usuarios',                  [UserAdminController::class, 'index']);
            Route::get('usuarios/roles',            [UserAdminController::class, 'roles']);
            Route::post('usuarios',                 [UserAdminController::class, 'store']);
            Route::put('usuarios/{user}',           [UserAdminController::class, 'update']);
            Route::patch('usuarios/{user}/toggle',  [UserAdminController::class, 'toggleActivo']);

            // Personal
            Route::get('personal',                      [PersonalAdminController::class, 'index']);
            Route::post('personal',                     [PersonalAdminController::class, 'store']);
            Route::put('personal/{personal}',           [PersonalAdminController::class, 'update']);
            Route::patch('personal/{personal}/toggle',  [PersonalAdminController::class, 'toggleActivo']);

            // Catálogos simples
            Route::get('aux-tips',                    [CatalogoAdminController::class, 'auxTipsIndex']);
            Route::post('aux-tips',                   [CatalogoAdminController::class, 'auxTipsStore']);
            Route::put('aux-tips/{auxTip}',           [CatalogoAdminController::class, 'auxTipsUpdate']);
            Route::patch('aux-tips/{auxTip}/toggle',  [CatalogoAdminController::class, 'auxTipsToggle']);

            Route::get('tipos-anexo',                 [CatalogoAdminController::class, 'tiposAnexoIndex']);
            Route::post('tipos-anexo',                [CatalogoAdminController::class, 'tiposAnexoStore']);
            Route::put('tipos-anexo/{tipoAnexo}',     [CatalogoAdminController::class, 'tiposAnexoUpdate']);

            Route::get('medios-ingreso',              [CatalogoAdminController::class, 'mediosIngresoIndex']);
            Route::post('medios-ingreso',             [CatalogoAdminController::class, 'mediosIngresoStore']);
            Route::put('medios-ingreso/{medioIngreso}',[CatalogoAdminController::class, 'mediosIngresoUpdate']);
        });
    });
});
