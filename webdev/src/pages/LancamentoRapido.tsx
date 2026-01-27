import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import Alert from '@mui/material/Alert'

const TURNOS = ['06:00 - 14:00', '14:00 - 22:00', '22:00 - 06:00'] as const
const PRODUTOS = ['Orange', 'Lime', 'Lemon', 'Tangerine'] as const

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0]
}

type Horimetro = {
  id: string
  extrator_id: string
  data: string
  turno: string
  valor: number
}

type Feedback = {
  id: string
  extrator_id: string
  data: string
  turno: string
  produto: string
  tamanho_da_fruta: number
  caixas_processadas: number
}

export default function LancamentoRapido() {
  const [extratores, setExtratores] = useState<Extrator[]>([])
  const [date, setDate] = useState<string>(todayDateStr())
  const [horimetros, setHorimetros] = useState<Horimetro[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [expanded, setExpanded] = useState<string | false>(false)
  const [prodExpanded, setProdExpanded] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // helpers to call eel without using `any`
  function eelListExtratores() {
    return window.eel.list_extratores()()
  }
  function eelListHorimetros(d: string) {
    // window.eel.list_horimetros(data?, extrator_id?) is exposed from backend
    return (window as unknown as { eel: { list_horimetros: EelCall<Horimetro[]> } }).eel.list_horimetros(d)()
  }
  function eelListFeedbacks(d: string) {
    return window.eel.list_feedbacks(d)()
  }
  function eelUpsertHorimetro(payload: { extrator_id: string; data: string; turno: string; valor: number }) {
    return window.eel.upsert_horimetro(payload)()
  }
  function eelCreateFeedback(payload: { extrator_id: string; data: string; turno: string; produto: string; tamanho_da_fruta: number; caixas_processadas: number }) {
    return window.eel.create_feedback(payload)()
  }
  function eelUpdateFeedback(id: string, data: { produto?: string; tamanho_da_fruta?: number; caixas_processadas?: number; turno?: string }) {
    return window.eel.update_feedback(id, data)()
  }
  function eelDeleteFeedback(id: string) {
    return window.eel.delete_feedback(id)()
  }
  function eelProcessarDia(extratorId: string, d: string) {
    return window.eel.processar_dia(extratorId, d)()
  }

  // aggregation/mapping
  const horimetrosByExtrator = useMemo(() => {
    const map = new Map<string, Horimetro[]>()
    for (const h of horimetros) {
      const list = map.get(h.extrator_id) ?? []
      list.push(h)
      map.set(h.extrator_id, list)
    }
    return map
  }, [horimetros])

  const feedbacksByProduto = useMemo(() => {
    const map = new Map<string, Feedback[]>()
    for (const f of feedbacks) {
      const list = map.get(f.produto) ?? []
      list.push(f)
      map.set(f.produto, list)
    }
    return map
  }, [feedbacks])

  // states for inputs and editing
  const [inputs, setInputs] = useState<Record<string, Record<string, string>>>({})
  const [productInputs, setProductInputs] = useState<Record<string, { tamanho: string; caixas: string }>>({})
  const [editingTurnos, setEditingTurnos] = useState<Record<string, boolean>>({})
  const [editingProducts, setEditingProducts] = useState<Record<string, boolean>>({})

  function isError(obj: unknown): obj is { error: string } {
    const o = obj as Record<string, unknown>
    return typeof o === 'object' && o !== null && typeof o['error'] === 'string'
  }

  // Fetch functions (defined before useEffect)
  async function fetchAll() {
    setLoading(true)
    try {
      const extrRes = await eelListExtratores()
      if (isError(extrRes)) {
        setMessage({ type: 'error', text: extrRes.error })
        return
      }
      const extrs = extrRes as Extrator[]
      setExtratores(extrs)

      const hRes = await eelListHorimetros(date)
      if (isError(hRes)) {
        setMessage({ type: 'error', text: hRes.error })
        return
      }
      const hs = hRes as Horimetro[]
      setHorimetros(hs)

      const fRes = await eelListFeedbacks(date)
      if (isError(fRes)) {
        setMessage({ type: 'error', text: fRes.error })
        return
      }
      const fs = fRes as Feedback[]
      setFeedbacks(fs)

      // initialize inputs based on fetched data
      const newInputs: Record<string, Record<string, string>> = {}
      for (const ex of extrs) {
        const list = hs.filter(h => h.extrator_id === ex.id)
        const byTurno: Record<string, string> = {}
        for (const t of TURNOS) {
          const item = list.find(l => l.turno === t)
          byTurno[t] = item ? String(item.valor) : ''
        }
        newInputs[ex.id] = byTurno
      }
      setInputs(newInputs)

      const newProdInputs: Record<string, { tamanho: string; caixas: string }> = {}
      for (const p of PRODUTOS) {
        const list = fs.filter(f => f.produto === p)
        newProdInputs[p] = list.length > 0 ? { tamanho: String(list[0].tamanho_da_fruta), caixas: String(list[0].caixas_processadas) } : { tamanho: '', caixas: '' }
      }
      setProductInputs(newProdInputs)

    } finally {
      setLoading(false)
    }
  }

  async function handleLancamentoHorimetro(extratorId: string, turno: string, valor: number) {
    setLoading(true)
    try {
      const res = await eelUpsertHorimetro({ extrator_id: extratorId, data: date, turno, valor })
      if (isError(res)) {
        setMessage({ type: 'error', text: res.error })
        return
      }
      setMessage({ type: 'success', text: `Horímetro lançado (${turno})` })
      // after successful lancamento, stop editing
      const key = `${extratorId}|${turno}`
      setEditingTurnos(prev => ({ ...prev, [key]: false }))
      await refreshHorimetros()
      await refreshInputsForExtrator(extratorId)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateFeedback(extratorId: string, produto: string, tamanho: number, caixas: number) {
    setLoading(true)
    try {
      const res = await eelCreateFeedback({ extrator_id: extratorId, data: date, turno: TURNOS[0], produto, tamanho_da_fruta: tamanho, caixas_processadas: caixas })
      if (isError(res)) {
        setMessage({ type: 'error', text: res.error })
        return
      }
      setMessage({ type: 'success', text: `Feedback lançado (${produto})` })
      await refreshFeedbacks()
      setProductInputs(prev => ({ ...prev, [produto]: { tamanho: String(tamanho), caixas: String(caixas) } }))
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteFeedback(id: string) {
    setLoading(true)
    try {
      const res = await eelDeleteFeedback(id)
      if (isError(res)) {
        setMessage({ type: 'error', text: res.error })
        return
      }
      setMessage({ type: 'success', text: 'Feedback removido' })
      await refreshFeedbacks()
    } finally {
      setLoading(false)
    }
  }

  async function refreshHorimetros() {
    const hRes = await eelListHorimetros(date)
    if (!isError(hRes)) setHorimetros(hRes as Horimetro[])
  }

  async function refreshFeedbacks() {
    const fRes = await eelListFeedbacks(date)
    if (!isError(fRes)) setFeedbacks(fRes as Feedback[])
  }

  async function refreshInputsForExtrator(extratorId: string) {
    const hRes = await eelListHorimetros(date)
    if (isError(hRes)) return
    const hs = hRes as Horimetro[]
    setInputs(prev => ({ ...prev, [extratorId]: TURNOS.reduce((acc, t) => { const it = hs.find(h=>h.extrator_id===extratorId && h.turno===t); acc[t]=it?String(it.valor):''; return acc }, {} as Record<string,string>) }))
  }

  async function handleProcessarDia(extratorId: string) {
    setLoading(true)
    try {
      const res = await eelProcessarDia(extratorId, date)
      if (isError(res)) {
        setMessage({ type: 'error', text: res.error })
        return
      }
      const result = res as ProcessoResult
      setMessage({ type: 'success', text: `Processado: ${result.horas_trabalhadas}h (${result.percentual}%)` })
    } finally {
      setLoading(false)
    }
  }

  // Effects
  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // helpers for UI
  function countTurnosLancadosForExtrator(extratorId: string): number {
    const list = horimetrosByExtrator.get(extratorId) ?? []
    const turnos = new Set(list.map(h => h.turno))
    return turnos.size
  }

  function hasFullExtrator(extratorId: string): boolean {
    return countTurnosLancadosForExtrator(extratorId) === 3
  }

  function canEnableFinalize(): boolean {
    // Opção A: pelo menos 1 extrator com os 3 turnos e pelo menos 1 feedback no dia
    const anyFull = extratores.some(e => hasFullExtrator(e.id))
    return anyFull && feedbacks.length > 0
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Lançamento Diário Rápido
      </Typography>

      {message && <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Select sx={{ minWidth: 220 }} value={date} onChange={e => setDate(e.target.value)}>
          <MenuItem value={date}>{date}</MenuItem>
        </Select>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Extratores ({extratores.length})</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {extratores.map(ex => {
            const turnosL = horimetrosByExtrator.get(ex.id) ?? []
            const launchedCount = new Set(turnosL.map(h => h.turno)).size
            return (
              <Accordion key={ex.id} expanded={expanded === ex.id} onChange={(_, isExpanded) => setExpanded(isExpanded ? ex.id : false)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Typography>{`#${ex.numero} - ${ex.modelo}`}</Typography>
                    <Typography variant="caption">{`${launchedCount}/3 turnos lançados`}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {TURNOS.map((turno) => {
                      const existing = turnosL.find(t => t.turno === turno)
                      const key = `${ex.id}|${turno}`
                      const inputVal = inputs[ex.id]?.[turno] ?? ''
                      const isEditing = !!editingTurnos[key]

                      return (
                        <Box key={turno} sx={{ border: '1px solid #eee', p: 2, borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2">{turno}</Typography>
                              <TextField value={inputVal} onChange={(e) => setInputs(prev => ({ ...prev, [ex.id]: { ...(prev[ex.id] ?? {}), [turno]: e.target.value } }))} type="number" size="small" sx={{ mt: 1 }} fullWidth />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button variant="contained" disabled={(!isEditing && !!existing) || loading} onClick={() => handleLancamentoHorimetro(ex.id, turno, parseFloat(inputVal || '0'))}>Lançar</Button>
                              <IconButton onClick={() => setEditingTurnos(prev => ({ ...prev, [key]: true }))} title={existing ? 'Editar (habilita lançamento)' : 'Editar'}>
                                <EditIcon />
                              </IconButton>
                              {existing && <CheckIcon color="success" />}
                            </Box>
                          </Box>
                        </Box>
                      )
                    })}

                    <Box>
                      <Button variant="outlined" size="small" onClick={() => handleProcessarDia(ex.id)} disabled={!hasFullExtrator(ex.id) || loading}>Processar este extrator</Button>
                    </Box>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Stack>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Accordion expanded={prodExpanded} onChange={(_, isExpanded) => setProdExpanded(isExpanded)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Feedbacks de Produção ({feedbacks.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {PRODUTOS.map(prod => {
                const existing = feedbacksByProduto.get(prod) ?? []
                const launched = existing.length > 0
                const ownerId = launched ? existing[0].extrator_id : (extratores[0]?.id ?? '')
                const val = productInputs[prod] ?? ''
                const isEditingProd = !!editingProducts[prod]

                return (
                  <Box key={prod} sx={{ border: '1px solid #eee', p: 2, borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">{prod}</Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                          <TextField type="number" label="Tamanho (mm)" value={productInputs[prod]?.tamanho ?? ''} onChange={(e) => setProductInputs(prev => ({ ...prev, [prod]: { ...(prev[prod] ?? { tamanho: '', caixas: '' }), tamanho: e.target.value } }))} size="small" sx={{ minWidth: 120 }} />
                          <TextField type="number" label="Caixas" value={productInputs[prod]?.caixas ?? ''} onChange={(e) => setProductInputs(prev => ({ ...prev, [prod]: { ...(prev[prod] ?? { tamanho: '', caixas: '' }), caixas: e.target.value } }))} size="small" sx={{ minWidth: 120 }} />
                        </Stack>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" disabled={(launched && !isEditingProd) || loading || !ownerId} onClick={() => {
                          if (launched && isEditingProd) {
                            // update existing
                            const fb = existing[0]
                            const tamanho = parseInt(productInputs[prod]?.tamanho || '0')
                            const caixas = parseInt(productInputs[prod]?.caixas || '0')
                            setLoading(true)
                            eelUpdateFeedback(fb.id, { tamanho_da_fruta: tamanho, caixas_processadas: caixas })
                              .then(res => {
                                if (isError(res)) setMessage({ type: 'error', text: res.error })
                                else { setMessage({ type: 'success', text: 'Feedback atualizado' }); refreshFeedbacks() }
                              })
                              .finally(() => setLoading(false))
                          } else {
                            const tamanho = parseInt(productInputs[prod]?.tamanho || '0')
                            const caixas = parseInt(productInputs[prod]?.caixas || '0')
                            handleCreateFeedback(ownerId, prod, tamanho, caixas)

                        <IconButton onClick={() => {
                          if (launched) setEditingProducts(prev => ({ ...prev, [prod]: true }))
                          else setProductInputs(prev => ({ ...prev, [prod]: '' }))
                        }} title={launched ? 'Editar (habilita lançamento)' : 'Editar'}>
                          <EditIcon />
                        </IconButton>

                        {launched && (
                          <>
                            <IconButton onClick={() => handleDeleteFeedback(existing[0].id)} title="Remover"><DeleteIcon /></IconButton>
                            <CheckIcon color="success" />
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" color="success" disabled={!canEnableFinalize() || loading} onClick={() => {
          // finalize: escolher primeiro extrator com 3 turnos
          const extr = extratores.find(e => hasFullExtrator(e.id))
          if (extr) handleProcessarDia(extr.id)
        }}>Finalizar Dia</Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption">Observação: o dia padrão é hoje, mas pode ser ajustado para lançamentos retroativos.</Typography>
      </Box>
    </Box>
  )
}
