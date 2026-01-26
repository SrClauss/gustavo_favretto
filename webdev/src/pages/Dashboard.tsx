import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Alert,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

interface Extrator {
  id: string
  numero: number
  modelo: string
  ativo: boolean
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
}

interface Motivo {
  id: string
  descricao: string
  classificacao: string
  padrao: boolean
  ativo: boolean
}

interface Local {
  id: string
  descricao: string
  padrao: boolean
  ativo: boolean
}

interface ParadaInput {
  turno: string
  motivo: string
  local_parada: string
  duracao_minutos: number
}

interface Feedback {
  id: string
  extrator_id: string
  data: string
  turno: string
  produto: string
  quantidade: number
}

const Dashboard = () => {
  const [extratores, setExtratores] = useState<Extrator[]>([])
  const [selectedExtrator, setSelectedExtrator] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<HorimetroStatus>({ turno1: false, turno2: false, turno3: false })
  const [podeProcessar, setPodeProcessar] = useState(false)
  const [processo, setProcesso] = useState<ProcessoResult | null>(null)
  const [openParadas, setOpenParadas] = useState(false)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [newFeedback, setNewFeedback] = useState({
    turno: '06:00 - 14:00',
    produto: 'Orange',
    quantidade: 0,
  })

  const [horimetros, setHorimetros] = useState({
    turno1: '',
    turno2: '',
    turno3: '',
  })

  const turnos = ['06:00 - 14:00', '14:00 - 22:00', '22:00 - 06:00']
  const produtos = ['Orange', 'Lime', 'Lemon', 'Tangerine']

  useEffect(() => {
    loadExtratores()
  }, [])

  useEffect(() => {
    if (selectedExtrator && data) {
      loadStatus()
      loadFeedbacks()
    }
  }, [selectedExtrator, data])

  const loadExtratores = async () => {
    try {
      const result = await window.eel.list_extratores()

      if (Array.isArray(result)) {
        setExtratores(result)
        return
      }

      if (result && typeof result === 'object' && 'error' in result) {
        console.error('Erro ao carregar extratores:', result.error)
        setExtratores([])
        return
      }

      // Possíveis formatos alternativos: { data: [...] } ou { extratores: [...] }
      if (result && typeof result === 'object') {
        const anyRes = result as any
        if (Array.isArray(anyRes.data)) {
          setExtratores(anyRes.data)
          return
        }
        if (Array.isArray(anyRes.extratores)) {
          setExtratores(anyRes.extratores)
          return
        }

        console.warn('Resultado inesperado carregando extratores:', result)
        setExtratores([])
        return
      }

      setExtratores([])
    } catch (error) {
      console.error('Erro ao carregar extratores:', error)
      setExtratores([])
    }
  }

  const loadStatus = async () => {
    try {
      const result = await window.eel.get_horimetro_status(selectedExtrator, data)
      if (typeof result === 'object' && result !== null && 'error' in result) {
        console.error('Erro ao carregar status:', result.error)
        setStatus({ turno1: false, turno2: false, turno3: false })
      } else {
        setStatus(result || { turno1: false, turno2: false, turno3: false })
      }
      
      const pode = await window.eel.pode_processar(selectedExtrator, data)
      if (pode && 'error' in pode) {
        console.error('Erro ao verificar se pode processar:', pode.error)
        setPodeProcessar(false)
      } else {
        const ok = pode as { pode: boolean }
        setPodeProcessar(Boolean(ok.pode))
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error)
    }
  }

  const loadFeedbacks = async () => {
    try {
      const result = await window.eel.list_feedbacks(data, selectedExtrator)
      if (result && 'error' in result) {
        console.error('Erro ao carregar feedbacks:', result.error)
        setFeedbacks([])
      } else {
        setFeedbacks(result || [])
      }
    } catch (error) {
      console.error('Erro ao carregar feedbacks:', error)
    }
  }

  const handleRegistrarHorimetro = async (turno: string, valor: string) => {
    if (!selectedExtrator || !valor) return

    try {
      const result = await window.eel.upsert_horimetro({
        extrator_id: selectedExtrator,
        data,
        turno,
        valor: parseFloat(valor),
      })

      if (typeof result === 'object' && result !== null && 'error' in result) {
        alert(`Erro: ${result.error}`)
      } else {
        loadStatus()
        setHorimetros({ ...horimetros, [`turno${turnos.indexOf(turno) + 1}`]: '' })
      }
    } catch (error) {
      console.error('Erro ao registrar horímetro:', error)
    }
  }

  const handleProcessar = async () => {
    try {
      const result = await window.eel.processar_dia(selectedExtrator, data)
      
      if (typeof result === 'object' && result !== null && 'error' in result) {
        alert(`Erro: ${result.error}`)
      } else {
        setProcesso(result as ProcessoResult)
        if ((result as ProcessoResult).falta > 0) {
          setOpenParadas(true)
        }
      }
    } catch (error) {
      console.error('Erro ao processar:', error)
    }
  }

  const handleAddFeedback = async () => {
    if (!selectedExtrator || !newFeedback.quantidade) return

    try {
      const result = await window.eel.create_feedback({
        extrator_id: selectedExtrator,
        data,
        turno: newFeedback.turno,
        produto: newFeedback.produto,
        quantidade: newFeedback.quantidade,
      })

      if (typeof result === 'object' && result !== null && 'error' in result) {
        alert(`Erro: ${result.error}`)
      } else {
        loadFeedbacks()
        setNewFeedback({ turno: '06:00 - 14:00', produto: 'Orange', quantidade: 0 })
      }
    } catch (error) {
      console.error('Erro ao adicionar feedback:', error)
    }
  }

  const handleDeleteFeedback = async (id: string) => {
    try {
      await window.eel.delete_feedback(id)
      loadFeedbacks()
    } catch (error) {
      console.error('Erro ao deletar feedback:', error)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard - Controle de Máquinas
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: '1 1 100%', maxWidth: { xs: '100%', md: '50%' } }}>
          <TextField
            fullWidth
            select
            label="Extrator"
            value={selectedExtrator}
            onChange={(e) => setSelectedExtrator(e.target.value)}
          >
            {Array.isArray(extratores) ? extratores.map((ext) => (
              <MenuItem key={ext.id} value={ext.id}>
                #{ext.numero} - {ext.modelo}
              </MenuItem>
            )) : null}
          </TextField>
        </Box>
        <Box sx={{ flex: '1 1 100%', maxWidth: { xs: '100%', md: '50%' } }}>
          <TextField
            fullWidth
            type="date"
            label="Data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Box>

      {selectedExtrator && (
        <>
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Horímetros
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {turnos.map((turno, index) => {
              const turnoKey = `turno${index + 1}` as keyof typeof horimetros
              const disabled = status[turnoKey as keyof HorimetroStatus]

              return (
                <Box key={turno} sx={{ flex: '1 1 100%', maxWidth: { xs: '100%', md: '33.333%' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {turno}
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        label="Valor do Horímetro"
                        value={horimetros[turnoKey]}
                        onChange={(e) =>
                          setHorimetros({ ...horimetros, [turnoKey]: e.target.value })
                        }
                        disabled={disabled}
                        sx={{ mb: 2 }}
                        inputProps={{ step: 0.1 }}
                      />
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={disabled || !horimetros[turnoKey]}
                        onClick={() => handleRegistrarHorimetro(turno, horimetros[turnoKey])}
                      >
                        {disabled ? 'Registrado ✓' : 'Registrar'}
                      </Button>
                    </CardContent>
                  </Card>
                </Box>
              )
            })}
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              disabled={!podeProcessar}
              onClick={handleProcessar}
            >
              Processar Dia
            </Button>

            {processo && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Horas Trabalhadas: {processo.horas_trabalhadas}h ({processo.percentual.toFixed(1)}%)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(processo.percentual, 100)}
                  sx={{ height: 10, borderRadius: 5, mt: 1 }}
                  color={processo.percentual >= 90 ? 'success' : processo.percentual >= 70 ? 'warning' : 'error'}
                />
                {processo.falta > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Faltam {processo.falta.toFixed(2)}h para completar 24h. Cadastre as paradas.
                  </Alert>
                )}
              </Box>
            )}
          </Box>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Feedbacks de Produção
          </Typography>

          <Card sx={{ mb: 2, p: 2 }}>
            <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
              <Box sx={{ flex: '1 1 100%', maxWidth: { xs: '100%', md: '25%' } }}>
                <TextField
                  fullWidth
                  select
                  label="Turno"
                  value={newFeedback.turno}
                  onChange={(e) => setNewFeedback({ ...newFeedback, turno: e.target.value })}
                >
                  {turnos.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: '1 1 100%', maxWidth: { xs: '100%', md: '25%' } }}>
                <TextField
                  fullWidth
                  select
                  label="Produto"
                  value={newFeedback.produto}
                  onChange={(e) => setNewFeedback({ ...newFeedback, produto: e.target.value })}
                >
                  {produtos.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: '1 1 100%', maxWidth: { xs: '100%', md: '25%' } }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantidade"
                  value={newFeedback.quantidade || ''}
                  onChange={(e) =>
                    setNewFeedback({ ...newFeedback, quantidade: parseInt(e.target.value) || 0 })
                  }
                />
              </Box>
              <Box sx={{ flex: '1 1 100%', maxWidth: { xs: '100%', md: '25%' } }}>
                <Button fullWidth variant="contained" onClick={handleAddFeedback}>
                  Adicionar
                </Button>
              </Box>
            </Box>
          </Card>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Turno</TableCell>
                <TableCell>Produto</TableCell>
                <TableCell>Quantidade</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {feedbacks.map((fb) => (
                <TableRow key={fb.id}>
                  <TableCell>{fb.data}</TableCell>
                  <TableCell>{fb.turno}</TableCell>
                  <TableCell>{fb.produto}</TableCell>
                  <TableCell>{fb.quantidade}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleDeleteFeedback(fb.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <Dialog open={openParadas} onClose={() => setOpenParadas(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Cadastrar Paradas</DialogTitle>
        <DialogContent>
          <ModalParadas
            extrator_id={selectedExtrator}
            data={data}
            falta={processo?.falta || 0}
            onClose={() => {
              setOpenParadas(false)
              loadStatus()
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  )
}

interface ModalParadasProps {
  extrator_id: string
  data: string
  falta: number
  onClose: () => void
}

const ModalParadas = ({ extrator_id, data, falta, onClose }: ModalParadasProps) => {
  const [paradas, setParadas] = useState<ParadaInput[]>([])
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [locais, setLocais] = useState<Local[]>([])

  const turnos = ['06:00 - 14:00', '14:00 - 22:00', '22:00 - 06:00']

  useEffect(() => {
    loadMotivosLocais()
  }, [])

  const loadMotivosLocais = async () => {
    try {
      const motivosResult = await window.eel.list_motivos()
      const locaisResult = await window.eel.list_locais()
      if (Array.isArray(motivosResult)) setMotivos(motivosResult)
      else setMotivos([])
      if (Array.isArray(locaisResult)) setLocais(locaisResult)
      else setLocais([])
    } catch (error) {
      console.error('Erro ao carregar motivos/locais:', error)
    }
  }

  const handleAddLinha = () => {
    setParadas([
      ...paradas,
      {
        turno: '06:00 - 14:00',
        motivo: motivos[0]?.id || '',
        local_parada: locais[0]?.id || '',
        duracao_minutos: 0,
      },
    ])
  }

  const handleRemoveLinha = (index: number) => {
    setParadas(paradas.filter((_, i) => i !== index))
  }

  const handleChangeLinha = (index: number, field: keyof ParadaInput, value: string | number) => {
    const novasParadas = [...paradas]
    const atual = { ...novasParadas[index] }
    if (field === 'duracao_minutos') {
      atual[field] = Number(value) as number
    } else {
      atual[field] = String(value)
    }
    novasParadas[index] = atual
    setParadas(novasParadas)
  }

  const handleSalvar = async () => {
    try {
      const paradasComExtrator = paradas.map((p) => ({
        ...p,
        extrator_id,
        data,
      }))

      const result = await window.eel.batch_create_paradas(paradasComExtrator)

      if (typeof result === 'object' && result !== null && 'error' in result) {
        alert(`Erro: ${result.error}`)
      } else {
        alert('Paradas cadastradas com sucesso!')
        onClose()
      }
    } catch (error) {
      console.error('Erro ao salvar paradas:', error)
    }
  }

  const totalMinutos = paradas.reduce((sum, p) => sum + (p.duracao_minutos || 0), 0)
  const totalHoras = (totalMinutos / 60).toFixed(2)

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Faltam {falta.toFixed(2)}h para completar 24h. Total cadastrado: {totalHoras}h
      </Alert>

      <Button variant="contained" onClick={handleAddLinha} sx={{ mb: 2 }} startIcon={<AddIcon />}>
        Adicionar Linha
      </Button>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Turno</TableCell>
            <TableCell>Motivo</TableCell>
            <TableCell>Local</TableCell>
            <TableCell>Duração (min)</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paradas.map((parada, index) => (
            <TableRow key={index}>
              <TableCell>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={parada.turno}
                  onChange={(e) => handleChangeLinha(index, 'turno', e.target.value)}
                >
                  {turnos.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={parada.motivo}
                  onChange={(e) => handleChangeLinha(index, 'motivo', e.target.value)}
                >
                  {motivos.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.descricao} ({m.classificacao})
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={parada.local_parada}
                  onChange={(e) => handleChangeLinha(index, 'local_parada', e.target.value)}
                >
                  {locais.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {l.descricao}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  fullWidth
                  size="small"
                  value={parada.duracao_minutos}
                  onChange={(e) => handleChangeLinha(index, 'duracao_minutos', parseInt(e.target.value) || 0)}
                />
              </TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => handleRemoveLinha(index)}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSalvar} disabled={paradas.length === 0}>
          Salvar Paradas
        </Button>
      </Box>
    </Box>
  )
}

export default Dashboard
