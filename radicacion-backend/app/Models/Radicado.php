<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Radicado extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nro_radicado', 'año_radicado', 'manejo', 'procedencia',
        'fecha_radicacion', 'hora_radicacion', 'tipo_remitente',
        'tercero_id', 'funcionario_id',
        'dependencia_remitente_id', 'nombre_persona_empresa',
        'tipo_correspondencia_id', 'aux_tip_id', 'aux_descripcion', 'fecha_limite',
        'dependencia_destino_id', 'personal_destino_id',
        'tipo_destino', 'tercero_destino_id', 'nombre_persona_destino',
        'folios', 'folios_de', 'cantidad_anexos', 'tipo_anexo_id', 'otro_anexo', 'anexos',
        'fecha_documento', 'fecha_entrega',
        'medio_ingreso_id', 'observaciones',
        'ia_procesado', 'ia_campos_sugeridos',
        'estado_id', 'operador_id',
    ];

    protected $casts = [
        'fecha_radicacion'    => 'date',
        'fecha_limite'        => 'date',
        'fecha_documento'     => 'date',
        'fecha_entrega'       => 'date',
        'ia_procesado'        => 'boolean',
        'ia_campos_sugeridos' => 'array',
        'anexos'              => 'array',
    ];

    // ── Relaciones ──────────────────────────────────────────────────
    // 'funcionario_id', 'personal_destino_id', 'dependencia_remitente_id' y
    // 'dependencia_destino_id' ya NO son relaciones Eloquent: apuntan a
    // recursos del Core (funcionarios/dependencias), sin FK local. Se
    // resuelven vía ClienteCore desde RadicadoService (ver
    // funcionarioInfo()/dependenciaInfo()), no como belongsTo aquí.
    public function tercero(): BelongsTo          { return $this->belongsTo(Tercero::class); }
    public function tipoCorrespondencia(): BelongsTo  { return $this->belongsTo(TipoCorrespondencia::class); }
    public function auxTip(): BelongsTo           { return $this->belongsTo(AuxTip::class); }
    public function terceroDestino(): BelongsTo   { return $this->belongsTo(Tercero::class, 'tercero_destino_id'); }
    public function tipoAnexo(): BelongsTo        { return $this->belongsTo(TipoAnexo::class); }
    public function medioIngreso(): BelongsTo     { return $this->belongsTo(MedioIngreso::class); }
    public function estado(): BelongsTo           { return $this->belongsTo(EstadoCorrespondencia::class, 'estado_id'); }
    public function operador(): BelongsTo         { return $this->belongsTo(User::class, 'operador_id'); }
    public function documentos(): HasMany         { return $this->hasMany(RadicadoDocumento::class); }
    public function actuaciones(): HasMany        { return $this->hasMany(RadicadoActuacion::class)->orderBy('created_at'); }

    // ── Número formateado ───────────────────────────────────────────
    public function getNumeroRadicadoAttribute(): string
    {
        return sprintf('%d-%06d', $this->año_radicado, $this->nro_radicado);
    }
}
