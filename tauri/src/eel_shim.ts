// eel_shim: wraps Tauri API invoke calls for centralized error handling

import { invoke } from '@tauri-apps/api/core';

type InvokeFn = (cmd: string, payload?: unknown) => Promise<unknown>;

const getInvoke = async (): Promise<InvokeFn | null> => {
  try {
    return (invoke as unknown) as InvokeFn;
  } catch {
    return null;
  }
};

// Generic wrapper: accepts a typed args builder and returns a function that calls the
// Tauri `invoke` and returns the ApiResult for the expected response type.
const wrap = <A extends unknown[], R = unknown>(fnName: string, argsBuilder?: (...args: A) => unknown) => {
  return (...args: A) => {
    return async (): Promise<ApiResult<R>> => {
      const invokeFn = await getInvoke();
      if (!invokeFn) throw new Error('Tauri API não disponível no modo dev — execute via Tauri ou instale @tauri-apps/api.');
      const payload = (argsBuilder ? argsBuilder(...args) : {}) as unknown;
      const res = await invokeFn(fnName, payload);
      return res as ApiResult<R>;
    };
  };
};

const eel = {
  cawabunga: wrap<[], string>('cawabunga'),
  soma: wrap<[number, number], number>('soma', (a: number, b: number) => ({ a, b } as unknown)),
  list_extratores: wrap<[], Extrator[]>('list_extratores_cmd'),
  create_extrator: wrap<[unknown], Extrator>('create_extrator_cmd', (p: unknown) => ({ data: p })),
  update_extrator: wrap<[string, unknown], Extrator>('update_extrator_cmd', (id: string, p: unknown) => ({ id, data: p })),
  delete_extrator: wrap<[string], { message: string }>('delete_extrator_cmd', (id: string) => ({ id })),
  init_database: wrap<[string | undefined], { message: string }>('init_database', (p?: string) => ({ path: p })),
  // Paradas
  list_paradas: wrap<[{ data?: string; extrator_id?: string }], unknown[]>('list_paradas_cmd_filter', (opts?: { data?: string; extrator_id?: string }) => ({ data: opts?.data, extratorId: opts?.extrator_id })),
  batch_create_paradas: wrap<[unknown[]], { id: string }[]>('batch_create_paradas_cmd', (p: unknown[]) => ({ data: p })),
  create_parada: wrap<[unknown], { id: string }>('create_parada_cmd', (p: unknown) => ({ data: p })),
  update_parada: wrap<[string, unknown], unknown>('update_parada_cmd', (id: string, p: unknown) => ({ id, data: p })),
  delete_parada: wrap<[string], { message: string }>('delete_parada_cmd', (id: string) => ({ id })),
  // Cadastros
  list_motivos: wrap<[string | undefined, boolean | undefined], unknown[]>('list_motivos_cmd', (search?: string, apenas_ativos?: boolean) => ({ search, apenas_ativos })),
  create_motivo: wrap<[unknown], unknown>('create_motivo_cmd', (p: unknown) => ({ data: p })),
  update_motivo: wrap<[string, unknown], unknown>('update_motivo_cmd', (id: string, p: unknown) => ({ id, data: p })),
  delete_motivo: wrap<[string], { message: string }>('delete_motivo_cmd', (id: string) => ({ id })),
  list_locais: wrap<[string | undefined, boolean | undefined], unknown[]>('list_locais_cmd', (search?: string, apenas_ativos?: boolean) => ({ search, apenas_ativos })),
  create_local: wrap<[unknown], unknown>('create_local_cmd', (p: unknown) => ({ data: p })),
  update_local: wrap<[string, unknown], unknown>('update_local_cmd', (id: string, p: unknown) => ({ id, data: p })),
  delete_local: wrap<[string], { message: string }>('delete_local_cmd', (id: string) => ({ id })),
  // Feedback
  create_feedback: wrap<[unknown], unknown>('create_feedback_cmd', (p: unknown) => ({ data: p })),
  list_feedbacks: wrap<[string | undefined], unknown[]>('list_feedbacks_cmd', (data?: string) => ({ data })),
  update_feedback: wrap<[string, unknown], unknown>('update_feedback_cmd', (id: string, p: unknown) => ({ id, data: p })),
  delete_feedback: wrap<[string], { message: string }>('delete_feedback_cmd', (id: string) => ({ id })),
  // Dashboard
  get_nominal_constant: wrap<[], number>('get_nominal_constant_cmd'),
  calculate_nominal: wrap<[number, number, number], number>('calculate_nominal_cmd', (t: number, cp: number, tc: number) => ({ tamanho_fruta: t, caixas_produto: cp, total_caixas: tc })),
  get_dashboard_stats: wrap<[string, string], unknown>('get_dashboard_stats_cmd', (periodo: string, data_ref: string) => ({ periodo, dataRef: data_ref })),
  get_timeline_paradas: wrap<[string], unknown[]>('get_timeline_paradas_cmd', (data: string) => ({ data })),
  get_oee_stats: wrap<[string, string | undefined, string | undefined], unknown>('get_oee_stats_cmd', (periodo: string, data_ref?: string, extrator_id?: string) => ({ periodo, dataRef: data_ref, extratorId: extrator_id })),
  // Horímetros
  list_horimetros_by_date: wrap<[string], unknown[]>('list_horimetros_by_date_cmd', (date: string) => ({ data: date })),
  upsert_horimetro: wrap<[unknown], unknown>('upsert_horimetro_cmd', (p: unknown) => ({ data: p })),

} as unknown as EelApi;

// assign to window
window.eel = eel;

export default eel;