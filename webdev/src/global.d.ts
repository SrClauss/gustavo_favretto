export {}

declare global {
  type ApiResult<T> = T | { error: string }
  type EelCall<T> = (...args: unknown[]) => () => Promise<ApiResult<T>>

  interface Extrator {
    id: string
    numero: number
    modelo: string
    ativo: boolean
  }

  interface Motivo {
    id: string
    descricao: string
    classificacao: string
    padrao: boolean
    ativo: boolean
  }

  interface LocalParada {
    id: string
    descricao: string
    padrao: boolean
    ativo: boolean
  }

  interface Feedback {
    id: string
    extrator_id: string
    data: string
    turno: string
    produto: string
    tamanho_da_fruta: number
    caixas_processadas: number
  }
  interface Horimetro {
    id: string
    extrator_id: string
    data: string
    turno: string
    valor: number
    created_at: string
  }

  interface HorimetroStatus {
    turno1: boolean
    turno2: boolean
    turno3: boolean
  }

  interface ProcessoResult {
    horas_trabalhadas: number
    falta: number
    percentual: number
    diferencas: { turno1: number; turno2: number; turno3: number }
  }

  interface ParadaInput {
    turno: string
    motivo: string
    local_parada: string
    duracao_minutos: number
    extrator_id?: string
    data?: string
  }

  interface EelApi {
    list_extratores: EelCall<Extrator[]>
    cawabunga: EelCall<string>
    get_horimetro_status: EelCall<HorimetroStatus>
    pode_processar: EelCall<{ pode: boolean; status: HorimetroStatus }>
    upsert_horimetro: EelCall<{ id: string }>
    get_ultimo_horimetro: EelCall<{ id: string; extrator_id: string; data: string; turno: string; valor: number; created_at: string } | null>
    processar_dia: EelCall<ProcessoResult>
    list_horimetros_by_date: EelCall<{ id: string; extrator_id: string; data: string; turno: string; valor: number; created_at: string }[]>




    batch_create_paradas: EelCall<{ id: string }[]>
    list_paradas: EelCall<{
      id: string
      extrator_id: string
      data: string
      turno: string
      motivo: string
      duracao_minutos: number
      local_parada: string
      extratores_parados: string[]
    }[]>
    update_parada: EelCall<{
      id: string
      extrator_id: string
      data: string
      turno: string
      motivo: string
      duracao_minutos: number
      local_parada: string
      extratores_parados: string[]
    }>
    delete_parada: EelCall<{ message: string }>

    create_feedback: EelCall<Feedback>
    list_feedbacks: EelCall<Feedback[]>
    update_feedback: EelCall<Feedback>
    delete_feedback: EelCall<{ message: string }>

    list_motivos: EelCall<Motivo[]>
    list_locais: EelCall<LocalParada[]>

    create_extrator: EelCall<Extrator>
    update_extrator: EelCall<Extrator>
    delete_extrator: EelCall<{ message: string }>

    create_motivo: EelCall<Motivo>
    update_motivo: EelCall<Motivo>
    delete_motivo: EelCall<{ message: string }>

    create_local: EelCall<LocalParada>
    update_local: EelCall<LocalParada>
    delete_local: EelCall<{ message: string }>
  }

  interface Window {
    eel: EelApi
  }
}
