import { MagnifyingGlassIcon, PlusIcon, PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export interface AdminColumn<T> {
  key: keyof T | string
  label: string
  width?: string
  render?: (row: T) => React.ReactNode
}

interface AdminTableProps<T extends { id: number }> {
  titulo: string
  columnas: AdminColumn<T>[]
  filas: T[]
  total: number
  pagina: number
  ultimaPagina: number
  cargando: boolean
  busqueda: string
  onBuscar: (q: string) => void
  onNuevo: () => void
  onEditar?: (fila: T) => void
  onPagina: (p: number) => void
  labelNuevo?: string
  accionExtra?: (fila: T) => React.ReactNode
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-slate-200 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

export function AdminTable<T extends { id: number }>({
  titulo, columnas, filas, total, pagina, ultimaPagina,
  cargando, busqueda, onBuscar, onNuevo, onEditar, onPagina,
  labelNuevo = 'Nuevo', accionExtra,
}: AdminTableProps<T>) {
  const getCellValue = (fila: T, col: AdminColumn<T>): React.ReactNode => {
    if (col.render) return col.render(fila)
    const val = fila[col.key as keyof T]
    if (val == null) return <span className="text-slate-300">—</span>
    if (typeof val === 'boolean') return val
      ? <span className="text-green-600 font-medium text-xs">Activo</span>
      : <span className="text-red-500 font-medium text-xs">Inactivo</span>
    return String(val)
  }

  const hayAcciones = Boolean(onEditar || accionExtra)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1B3A6E]">{titulo}</h2>
          <p className="text-sm text-slate-500">
            {cargando ? 'Cargando...' : `${total.toLocaleString()} registro${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPagina(pagina)}
            title="Recargar"
            className="p-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowPathIcon className={cn('w-4 h-4', cargando && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={onNuevo}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> {labelNuevo}
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => onBuscar(e.target.value)}
          placeholder="Buscar..."
          maxLength={60}
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2B5BA8]"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1B3A6E] text-white">
                {columnas.map(col => (
                  <th
                    key={String(col.key)}
                    style={col.width ? { width: col.width } : undefined}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  >
                    {col.label}
                  </th>
                ))}
                {hayAcciones && (
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide w-24">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {cargando
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={columnas.length + (hayAcciones ? 1 : 0)} />)
                : filas.length === 0
                  ? (
                    <tr>
                      <td colSpan={columnas.length + (hayAcciones ? 1 : 0)} className="py-16 text-center text-slate-400 text-sm">
                        No hay registros
                      </td>
                    </tr>
                  )
                  : filas.map((fila, idx) => (
                    <tr
                      key={fila.id}
                      className={cn(
                        'border-b border-slate-100 hover:bg-blue-50/40 transition-colors',
                        idx % 2 === 1 && 'bg-slate-50/40',
                      )}
                    >
                      {columnas.map(col => (
                        <td key={String(col.key)} className="px-4 py-2.5 text-slate-700">
                          {getCellValue(fila, col)}
                        </td>
                      ))}
                      {hayAcciones && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {accionExtra?.(fila)}
                            {onEditar && (
                              <button
                                type="button"
                                onClick={() => onEditar(fila)}
                                title="Editar"
                                className="p-1.5 text-[#2B5BA8] hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <PencilIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!cargando && filas.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">Página {pagina} de {ultimaPagina}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPagina(pagina - 1)}
                disabled={pagina === 1}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default transition-colors"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(ultimaPagina, 5) }, (_, i) => {
                const p = pagina <= 3 ? i + 1 : pagina - 2 + i
                if (p < 1 || p > ultimaPagina) return null
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPagina(p)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      p === pagina
                        ? 'bg-[#1B3A6E] text-white'
                        : 'border border-slate-300 text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => onPagina(pagina + 1)}
                disabled={pagina === ultimaPagina}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default transition-colors"
              >
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
