import { useEffect, useState } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

type Extrator = { id: string; numero: number; modelo: string; ativo: boolean }
type Motivo = { id: string; descricao: string; classificacao: string; padrao: boolean; ativo: boolean }
type Local = { id: string; descricao: string; padrao: boolean; ativo: boolean }

export default function Config() {
  const [tab, setTab] = useState(0)

  // Extratores
  const [extratores, setExtratores] = useState<Extrator[]>([])
  const [openExtrator, setOpenExtrator] = useState(false)
  const [editingExtrator, setEditingExtrator] = useState<Extrator | null>(null)
  const [extratorForm, setExtratorForm] = useState({ numero: '', modelo: '', ativo: true })

  // Motivos
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [openMotivo, setOpenMotivo] = useState(false)
  const [editingMotivo, setEditingMotivo] = useState<Motivo | null>(null)
  const [motivoForm, setMotivoForm] = useState({ descricao: '', classificacao: 'Disponibilidade', padrao: false, ativo: true })

  // Locais
  const [locais, setLocais] = useState<Local[]>([])
  const [openLocal, setOpenLocal] = useState(false)
  const [editingLocal, setEditingLocal] = useState<Local | null>(null)
  const [localForm, setLocalForm] = useState({ descricao: '', padrao: false, ativo: true })

  function isErrorResponse(x: unknown): x is { error?: unknown } {
    return typeof x === 'object' && x !== null && 'error' in x
  }

  async function fetchExtratores() {
    const res = await window.eel.list_extratores()()
    if (!res || isErrorResponse(res)) return
    setExtratores(res as Extrator[])
  }

  async function fetchMotivos() {
    const res = await window.eel.list_motivos()()
    if (!res || isErrorResponse(res)) return
    setMotivos(res as Motivo[])
  }

  async function fetchLocais() {
    const res = await window.eel.list_locais()()
    if (!res || isErrorResponse(res)) return
    setLocais(res as Local[])
  }

  // Extrator handlers
  function openNewExtrator() {
    setEditingExtrator(null)
    setExtratorForm({ numero: '', modelo: '', ativo: true })
    setOpenExtrator(true)
  }
  function openEditExtrator(item: Extrator) {
    setEditingExtrator(item)
    setExtratorForm({ numero: String(item.numero), modelo: item.modelo, ativo: item.ativo })
    setOpenExtrator(true)
  }

  async function saveExtrator() {
    const payload = { numero: Number(extratorForm.numero), modelo: extratorForm.modelo, ativo: extratorForm.ativo }
    try {
      if (editingExtrator) {
        await window.eel.update_extrator(editingExtrator.id, payload)()
      } else {
        await window.eel.create_extrator(payload)()
      }
      setOpenExtrator(false)
      fetchExtratores()
    } catch (e) {
      console.error(e)
    }
  }

  async function deleteExtrator(item: Extrator) {
    if (!confirm('Desativar extrator?')) return
    await window.eel.delete_extrator(item.id)()
    fetchExtratores()
  }

  // Motivo handlers
  function openNewMotivo() {
    setEditingMotivo(null)
    setMotivoForm({ descricao: '', classificacao: 'Disponibilidade', padrao: false, ativo: true })
    setOpenMotivo(true)
  }
  function openEditMotivo(item: Motivo) {
    setEditingMotivo(item)
    setMotivoForm({ descricao: item.descricao, classificacao: item.classificacao, padrao: item.padrao, ativo: item.ativo })
    setOpenMotivo(true)
  }

  async function saveMotivo() {
    const payload = { descricao: motivoForm.descricao, classificacao: motivoForm.classificacao, padrao: motivoForm.padrao, ativo: motivoForm.ativo }
    try {
      if (editingMotivo) {
        await window.eel.update_motivo(editingMotivo.id, payload)()
      } else {
        await window.eel.create_motivo(payload)()
      }
      setOpenMotivo(false)
      fetchMotivos()
    } catch (e) {
      console.error(e)
    }
  }

  async function deleteMotivo(item: Motivo) {
    if (!confirm('Desativar motivo? (Não é possível desativar o motivo padrão)')) return
    await window.eel.delete_motivo(item.id)()
    fetchMotivos()
  }

  // Local handlers
  function openNewLocal() {
    setEditingLocal(null)
    setLocalForm({ descricao: '', padrao: false, ativo: true })
    setOpenLocal(true)
  }
  function openEditLocal(item: Local) {
    setEditingLocal(item)
    setLocalForm({ descricao: item.descricao, padrao: item.padrao, ativo: item.ativo })
    setOpenLocal(true)
  }

  async function saveLocal() {
    const payload = { descricao: localForm.descricao, padrao: localForm.padrao, ativo: localForm.ativo }
    try {
      if (editingLocal) {
        await window.eel.update_local(editingLocal.id, payload)()
      } else {
        await window.eel.create_local(payload)()
      }
      setOpenLocal(false)
      fetchLocais()
    } catch (e) {
      console.error(e)
    }
  }

  async function deleteLocal(item: Local) {
    if (!confirm('Desativar local? (Não é possível desativar o local padrão)')) return
    await window.eel.delete_local(item.id)()
    fetchLocais()
  }


  // Load lists
  useEffect(() => {
    // load lists asynchronously to avoid calling setState synchronously in the effect body
    async function load() {
      try {
        const resE = await window.eel.list_extratores()()
        if (resE && !isErrorResponse(resE)) setExtratores(resE as Extrator[])

        const resM = await window.eel.list_motivos()()
        if (resM && !isErrorResponse(resM)) setMotivos(resM as Motivo[])

        const resL = await window.eel.list_locais()()
        if (resL && !isErrorResponse(resL)) setLocais(resL as Local[])
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])


  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h4" gutterBottom align="center">Cadastros</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ width: '100%', maxWidth: 900 }}>
        <Tab label="Extratores" />
        <Tab label="Motivos de Parada" />
        <Tab label="Locais de Parada" />
      </Tabs>

      <Box sx={{ mt: 2, width: '100%', maxWidth: 900 }}>
        {tab === 0 && (
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Extratores</Typography>
              <Button startIcon={<AddIcon />} variant="contained" onClick={openNewExtrator}>Novo Extrator</Button>
            </Box>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Número</TableCell>
                  <TableCell>Modelo</TableCell>
                  <TableCell>Ativo</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {extratores.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.numero}</TableCell>
                    <TableCell>{e.modelo}</TableCell>
                    <TableCell>{e.ativo ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => openEditExtrator(e)}><EditIcon /></IconButton>
                      <IconButton onClick={() => deleteExtrator(e)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Dialog open={openExtrator} onClose={() => setOpenExtrator(false)}>
              <DialogTitle>{editingExtrator ? 'Editar Extrator' : 'Novo Extrator'}</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField label="Número" value={extratorForm.numero} onChange={(e) => setExtratorForm((s) => ({ ...s, numero: e.target.value }))} />
                <TextField label="Modelo" value={extratorForm.modelo} onChange={(e) => setExtratorForm((s) => ({ ...s, modelo: e.target.value }))} />
                <FormControlLabel control={<Checkbox checked={extratorForm.ativo} onChange={(e) => setExtratorForm((s) => ({ ...s, ativo: e.target.checked }))} />} label="Ativo" />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenExtrator(false)}>Cancelar</Button>
                <Button variant="contained" onClick={saveExtrator}>Salvar</Button>
              </DialogActions>
            </Dialog>

          </Paper>
        )}

        {tab === 1 && (
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Motivos de Parada</Typography>
              <Button startIcon={<AddIcon />} variant="contained" onClick={openNewMotivo}>Novo Motivo</Button>
            </Box>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Classificação</TableCell>
                  <TableCell>Padrão</TableCell>
                  <TableCell>Ativo</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {motivos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.descricao}</TableCell>
                    <TableCell>{m.classificacao}</TableCell>
                    <TableCell>{m.padrao ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>{m.ativo ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => openEditMotivo(m)}><EditIcon /></IconButton>
                      <IconButton onClick={() => deleteMotivo(m)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Dialog open={openMotivo} onClose={() => setOpenMotivo(false)}>
              <DialogTitle>{editingMotivo ? 'Editar Motivo' : 'Novo Motivo'}</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField label="Descrição" value={motivoForm.descricao} onChange={(e) => setMotivoForm((s) => ({ ...s, descricao: e.target.value }))} />
                <Select value={motivoForm.classificacao} onChange={(e) => setMotivoForm((s) => ({ ...s, classificacao: String(e.target.value) }))}>
                  <MenuItem value="Disponibilidade">Disponibilidade</MenuItem>
                  <MenuItem value="Performance">Performance</MenuItem>
                  <MenuItem value="Qualidade">Qualidade</MenuItem>
                </Select>
                <FormControlLabel control={<Checkbox checked={motivoForm.padrao} onChange={(e) => setMotivoForm((s) => ({ ...s, padrao: e.target.checked }))} />} label="Padrão" />
                <FormControlLabel control={<Checkbox checked={motivoForm.ativo} onChange={(e) => setMotivoForm((s) => ({ ...s, ativo: e.target.checked }))} />} label="Ativo" />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenMotivo(false)}>Cancelar</Button>
                <Button variant="contained" onClick={saveMotivo}>Salvar</Button>
              </DialogActions>
            </Dialog>

          </Paper>
        )}

        {tab === 2 && (
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Locais de Parada</Typography>
              <Button startIcon={<AddIcon />} variant="contained" onClick={openNewLocal}>Novo Local</Button>
            </Box>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Padrão</TableCell>
                  <TableCell>Ativo</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locais.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.descricao}</TableCell>
                    <TableCell>{l.padrao ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>{l.ativo ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => openEditLocal(l)}><EditIcon /></IconButton>
                      <IconButton onClick={() => deleteLocal(l)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Dialog open={openLocal} onClose={() => setOpenLocal(false)}>
              <DialogTitle>{editingLocal ? 'Editar Local' : 'Novo Local'}</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField label="Descrição" value={localForm.descricao} onChange={(e) => setLocalForm((s) => ({ ...s, descricao: e.target.value }))} />
                <FormControlLabel control={<Checkbox checked={localForm.padrao} onChange={(e) => setLocalForm((s) => ({ ...s, padrao: e.target.checked }))} />} label="Padrão" />
                <FormControlLabel control={<Checkbox checked={localForm.ativo} onChange={(e) => setLocalForm((s) => ({ ...s, ativo: e.target.checked }))} />} label="Ativo" />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenLocal(false)}>Cancelar</Button>
                <Button variant="contained" onClick={saveLocal}>Salvar</Button>
              </DialogActions>
            </Dialog>

          </Paper>
        )}
      </Box>

    </Box>
  )
}
