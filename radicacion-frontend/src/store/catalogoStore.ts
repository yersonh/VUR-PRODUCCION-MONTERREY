import { create } from 'zustand'
import type { Dependencia, TipoCorrespondencia, AuxTip, TipoAnexo, MedioIngreso, TipoIdentificacion, EstadoCorrespondencia } from '@/types'
import api from '@/services/api'

interface CatalogoStore {
  dependencias: Dependencia[]
  tiposCorrespondencia: TipoCorrespondencia[]
  auxTips: AuxTip[]
  tiposAnexo: TipoAnexo[]
  mediosIngreso: MedioIngreso[]
  tiposIdentificacion: TipoIdentificacion[]
  estadosCorrespondencia: EstadoCorrespondencia[]
  cargado: boolean
  cargando: boolean
  cargarCatalogos: () => Promise<void>
}

export const useCatalogoStore = create<CatalogoStore>((set, get) => ({
  dependencias: [],
  tiposCorrespondencia: [],
  auxTips: [],
  tiposAnexo: [],
  mediosIngreso: [],
  tiposIdentificacion: [],
  estadosCorrespondencia: [],
  cargado: false,
  cargando: false,

  cargarCatalogos: async () => {
    if (get().cargado || get().cargando) return
    set({ cargando: true })

    try {
      const [deps, tipos, aux, anexos, medios, ident, estados] = await Promise.all([
        api.get<Dependencia[]>('/dependencias'),
        api.get<TipoCorrespondencia[]>('/tipos-correspondencia'),
        api.get<AuxTip[]>('/aux-tips'),
        api.get<{ data: TipoAnexo[] }>('/catalogos/tipos-anexo'),
        api.get<{ data: MedioIngreso[] }>('/catalogos/medios-ingreso'),
        api.get<{ data: TipoIdentificacion[] }>('/catalogos/tipos-identificacion'),
        api.get<{ data: EstadoCorrespondencia[] }>('/catalogos/estados'),
      ])

      set({
        dependencias: deps.data,
        tiposCorrespondencia: tipos.data,
        auxTips: aux.data,
        tiposAnexo: anexos.data.data,
        mediosIngreso: medios.data.data,
        tiposIdentificacion: ident.data.data,
        estadosCorrespondencia: estados.data.data,
        cargado: true,
        cargando: false,
      })
    } catch {
      set({ cargando: false })
    }
  },
}))
