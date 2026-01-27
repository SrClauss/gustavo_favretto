import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import { Alert } from '@mui/material'

const TURNOS = [
  '06:00 - 14:00',
  '14:00 - 22:00',
  '22:00 - 06:00'
]

const PRODUTOS = ['Orange', 'Lime', 'Lemon', 'Tangerine']

function todayDateStr() {
  return new Date().toISOString().split('T')[0]
}

export default function LancamentoRapido() {
  const [extratores, setExtratores] = useState<Extrator[]>([])
  const [selectedExtrator, setSelectedExtrator] = useState<string | null>(null)
  const [date, setDate] = useState<string>(todayDateStr())
  const [horimetroVals, setHorimetroVals] = useState<string[]>(['', '', ''])
  const [horimetroDisabled, setHorimetroDisabled] = useState<boolean[]>([false, false, false])
  const [status, setStatus] = useState<HorimetroStatus>({ turno1: false, turno2: false, turno3: false })
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [newFeedbacks, setNewFeedbacks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // load extratores
    window.eel.list_extratores()().then(r => {
      if ((r as any).error) return
      setExtratores(r as Extrator[])
      if (r && r.length > 0 && !selectedExtrator) setSelectedExtrator(r[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedExtrator) return
    fetchStatus()
    fetchFeedbacks()
  }, [selectedExtrator, date])

  function fetchStatus() {
    if (!selectedExtrator) return
    window.eel.get_horimetro_status(selectedExtrator, date)().then((res: any) => {
      if (res && !(res as any).error) {
        setStatus(res as HorimetroStatus)
        setHorimetroDisabled([res.turno1, res.turno2, res.turno3])
      }
    })
  }

  function fetchFeedbacks() {
    if (!selectedExtrator) return
    window.eel.list_feedbacks(date, selectedExtrator)().then((res: any) => {
      if (res && !(res as any).error) {
        setFeedbacks(res as Feedback[])
      }
    })
  }

  async function lanzarHorimetro(index: number) {
    if (!selectedExtrator) return
    const valorStr = horimetroVals[index]
    if (!valorStr) {
      setMessage({ type: 'error', text: 'Informe um valor válido' })
      return
    }
    setLoading(true)
    const turno = TURNOS[index]
    const payload = { extrator_id: selectedExtrator, data: date, turno, valor: parseFloat(valorStr) }
    const res: any = await window.eel.upsert_horimetro(payload)()
    setLoading(false)
    if ((res as any).error) {
      setMessage({ type: 'error', text: (res as any).error })
    } else {
      setMessage({ type: 'success', text: `Horímetro (${turno}) lançado` })
      setHorimetroDisabled(prev => {
        const copy = [...prev]
        copy[index] = true
        return copy
      })
      fetchStatus()
    }
  }

  function enableHorimetro(index: number) {
    setHorimetroDisabled(prev => {
      const copy = [...prev]
      copy[index] = false
      return copy
    })
  }

  async function lanzarFeedback(prod: string) {
    if (!selectedExtrator) return
    const quantidade = newFeedbacks[prod]
    if (!quantidade || quantidade <= 0) {
      setMessage({ type: 'error', text: 'Informe quantidade maior que 0' })
      return
    }
    setLoading(true)
    const payload = { extrator_id: selectedExtrator, data: date, turno: TURNOS[0], produto: prod, quantidade }
    const res: any = await window.eel.create_feedback(payload)()
    setLoading(false)
    if ((res as any).error) {
      setMessage({ type: 'error', text: (res as any).error })
    } else {
      setMessage({ type: 'success', text: `Feedback (${prod}) lançado` })
      fetchFeedbacks()
    }
  }

  function productLaunched(prod: string) {
    return feedbacks.some(f => f.produto === prod)
  }

  function canEnableFinalize() {
    return status.turno1 && status.turno2 && status.turno3 && feedbacks.length > 0
  }

  async function processarDia() {
    if (!selectedExtrator) return
    setLoading(true)
    const res: any = await window.eel.processar_dia(selectedExtrator, date)()
    setLoading(false)
    if ((res as any).error) {
      setMessage({ type: 'error', text: (res as any).error })
    } else {
      setMessage({ type: 'success', text: `Processado: ${res.horas_trabalhadas}h trabalhadas (${res.percentual}%)` })
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Lançamento Diário Rápido
      </Typography>

      {message && <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Select fullWidth value={selectedExtrator ?? ''} onChange={e => setSelectedExtrator(e.target.value as string)}>
            {extratores.map(e => (
              <MenuItem key={e.id} value={e.id}>{`#${e.numero} - ${e.modelo}`}</MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField fullWidth type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>Horímetros</Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {TURNOS.map((t, i) => (
          <Grid key={t} item xs={12} sm={4}>
            <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t}</Typography>
              <TextField fullWidth label="Valor (h)" type="number" value={horimetroVals[i]} onChange={e => setHorimetroVals(prev => { const c = [...prev]; c[i]=e.target.value; return c })} disabled={horimetroDisabled[i]} sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" color="primary" disabled={horimetroDisabled[i] || loading} onClick={() => lanzarHorimetro(i)}>Lançar</Button>
                <IconButton size="small" color="inherit" onClick={() => enableHorimetro(i)} title="Editar">
                  <EditIcon />
                </IconButton>
                {status[`turno${i+1}` as keyof HorimetroStatus] && <CheckIcon color="success" />}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" gutterBottom>Feedbacks de Produção</Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {PRODUTOS.map(prod => (
          <Grid key={prod} item xs={12} sm={6} md={3}>
            <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2">{prod}</Typography>
              <TextField fullWidth label="Caixas" type="number" value={newFeedbacks[prod] ?? ''} onChange={e => setNewFeedbacks(prev => ({ ...prev, [prod]: parseInt(e.target.value || '0') }))} sx={{ mb: 1 }} disabled={productLaunched(prod)} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" color="primary" disabled={productLaunched(prod) || loading} onClick={() => lanzarFeedback(prod)}>Lançar</Button>
                {/* Edit: se já existe feedback, permite remover para reabilitar lançamento */}
                {productLaunched(prod) ? (
                  <IconButton size="small" color="inherit" title="Remover/Editar" onClick={async () => {
                    const fb = feedbacks.find(f => f.produto === prod)
                    if (!fb) return
                    setLoading(true)
                    const res: any = await window.eel.delete_feedback(fb.id)()
                    setLoading(false)
                    if ((res as any).error) setMessage({ type: 'error', text: (res as any).error })
                    else {
                      setMessage({ type: 'success', text: `Feedback (${prod}) removido` })
                      fetchFeedbacks()
                    }
                  }}>
                    <EditIcon />
                  </IconButton>
                ) : (
                  <IconButton size="small" color="inherit" title="Editar" onClick={() => setNewFeedbacks(prev => ({ ...prev, [prod]: (prev[prod] ?? 0) }))}>
                    <EditIcon />
                  </IconButton>
                )}
                {productLaunched(prod) && <CheckIcon color="success" />}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" color="success" disabled={!canEnableFinalize() || loading} onClick={() => processarDia()}>Finalizar Dia</Button>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption">Observação: o dia padrão é hoje, mas pode ser ajustado para lançamentos retroativos.</Typography>
      </Box>
    </Box>
  )
}
