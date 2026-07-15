import { useRef, useState } from 'react'
import { DocumentArrowUpIcon, DocumentCheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface PDFUploaderProps {
  label: string
  file: File | null
  onFile: (file: File) => void
  onRemove: () => void
  isProcessingIA?: boolean
  disabled?: boolean
  accept?: string
}

const MAX_MB = 20
const MAX_BYTES = MAX_MB * 1024 * 1024

export function PDFUploader({
  label, file, onFile, onRemove, isProcessingIA = false, disabled = false,
}: PDFUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const handleFile = (f: File) => {
    setSizeError(null)
    if (f.type !== 'application/pdf') {
      setSizeError('Solo se permiten archivos PDF.')
      return
    }
    if (f.size > MAX_BYTES) {
      setSizeError(`El archivo supera el límite de ${MAX_MB} MB.`)
      return
    }
    onFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>

      {file ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <DocumentCheckIcon className="w-5 h-5 text-green-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>

          {isProcessingIA && (
            <div className="flex items-center gap-1.5 text-indigo-600 text-xs shrink-0">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="font-medium">✨ IA analizando...</span>
            </div>
          )}

          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Quitar archivo"
              className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={disabled ? undefined : onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all',
            disabled
              ? 'border-slate-200 bg-slate-50 cursor-default'
              : isDragging
                ? 'border-[#C8A800] bg-blue-50'
                : 'border-slate-300 bg-white hover:border-[#C8A800] hover:bg-blue-50/50',
          )}
        >
          <DocumentArrowUpIcon className={cn('w-8 h-8', disabled ? 'text-slate-300' : 'text-slate-400')} />
          <div className="text-center">
            <p className={cn('text-sm font-medium', disabled ? 'text-slate-400' : 'text-slate-600')}>
              {disabled ? 'No disponible' : 'Haz clic o arrastra el PDF aquí'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Máximo {MAX_MB} MB · Solo PDF</p>
          </div>
        </div>
      )}

      {sizeError && <p className="text-xs text-red-500">{sizeError}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  )
}
