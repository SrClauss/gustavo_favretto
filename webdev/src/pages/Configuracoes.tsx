import { useState, useEffect } from 'react'

import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  MenuItem,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'

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

interface Local {
  id: string
  descricao: string
  padrao: boolean
  ativo: boolean
}

const Configuracoes = () => {
  const [tabIndex, setTabIndex] = useState(0)
  const [search, setSearch] = useState('')

  // Estados para Extratores
  const [extratores, setExtratores] = useState<Extrator[]>([])
  const [openExtratorDialog, setOpenExtratorDialog] = useState(false)
  const [editingExtrator, setEditingExtrator] = useState<Extrator | null>(null)
  const [extratorForm, setExtratorForm] = useState({ numero: 0, modelo: '', ativo: true })

  // Estados para Motivos
  const [motivos, setMotivos] = useState<Motivo[]>([])
  const [openMotivoDialog, setOpenMotivoDialog] = useState(false)
  const [editingMotivo, setEditingMotivo] = useState<Motivo | null>(null)
  const [motivoForm, setMotivoForm] = useState({
    descricao: '',
    classificacao: 'Disponibilidade',
    padrao: false,
    ativo: true,
  })

  // Estados para Locais
  const [locais, setLocais] = useState<Local[]>([])
  const [openLocalDialog, setOpenLocalDialog] = useState(false)
  const [editingLocal, setEditingLocal] = useState<Local | null>(null)
  const [localForm, setLocalForm] = useState({ descricao: '', padrao: false, ativo: true })

  useEffect(() => {
    loadData()
  }, [tabIndex])

  const loadData = async () => {
    try {
      if (tabIndex === 0) {
        const result = await window.eel.list_extratores(search, false)

        if (Array.isArray(result)) {
          setExtratores(result)
        } else if (result && typeof result === 'object' && 'error' in result) {
          console.error('Erro ao listar extratores:', result.error)
          setExtratores([])
        } else if (result && typeof result === 'object') {
          const anyRes = result as any
          if (Array.isArray(anyRes.data)) {
            setExtratores(anyRes.data)
          } else if (Array.isArray(anyRes.extratores)) {
            setExtratores(anyRes.extratores)
          } else {
            console.warn('Resultado inesperado ao listar extratores:', result)
            setExtratores([])
          }
        } else {
          setExtratores([])
        }
      } else if (tabIndex === 1) {
        const result = await window.eel.list_motivos(search, false)

        if (Array.isArray(result)) {
          setMotivos(result)
        } else if (result && typeof result === 'object' && 'error' in result) {
          console.error('Erro ao listar motivos:', result.error)
          setMotivos([])
        } else if (result && typeof result === 'object') {
          const anyRes = result as any
          if (Array.isArray(anyRes.data)) {
            setMotivos(anyRes.data)
          } else if (Array.isArray(anyRes.motivos)) {
            setMotivos(anyRes.motivos)
          } else {
            console.warn('Resultado inesperado ao listar motivos:', result)
            setMotivos([])
          }
        } else {
          setMotivos([])
        }
      } else if (tabIndex === 2) {
        const result = await window.eel.list_locais(search, false)

        if (Array.isArray(result)) {
          setLocais(result)
        } else if (result && typeof result === 'object' && 'error' in result) {
          console.error('Erro ao listar locais:', result.error)
          setLocais([])
        } else if (result && typeof result === 'object') {
          const anyRes = result as any
          if (Array.isArray(anyRes.data)) {
            setLocais(anyRes.data)
          } else if (Array.isArray(anyRes.locais)) {
            setLocais(anyRes.locais)
          } else {
            console.warn('Resultado inesperado ao listar locais:', result)
            setLocais([])
          }
        } else {
          setLocais([])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  // === EXTRATORES ===

  const handleOpenExtratorDialog = (extrator?: Extrator) => {
    if (extrator) {
      setEditingExtrator(extrator)
      setExtratorForm({ numero: extrator.numero, modelo: extrator.modelo, ativo: extrator.ativo })
    } else {
      setEditingExtrator(null)
      setExtratorForm({ numero: 0, modelo: '', ativo: true })
    }
    setOpenExtratorDialog(true)
  }

  const handleSaveExtrator = async () => {
    try {
      let result
      if (editingExtrator) {
        result = await window.eel.update_extrator(editingExtrator.id, extratorForm)
      } else {
        result = await window.eel.create_extrator(extratorForm)
      }
      if (result && 'error' in result) {
        alert(result.error)
      } else {
        setOpenExtratorDialog(false)
        loadData()
      }
    } catch (error) {
      console.error('Erro ao salvar extrator:', error)
    }
  }

  const handleDeleteExtrator = async (id: string) => {
    if (confirm('Deseja realmente desativar este extrator?')) {
      try {
        await window.eel.delete_extrator(id)
        loadData()
      } catch (error) {
        console.error('Erro ao deletar extrator:', error)
      }
    }
  }

  // === MOTIVOS ===

  const handleOpenMotivoDialog = (motivo?: Motivo) => {
    if (motivo) {
      setEditingMotivo(motivo)
      setMotivoForm({
        descricao: motivo.descricao,
        classificacao: motivo.classificacao,
        padrao: motivo.padrao,
        ativo: motivo.ativo,
      })
    } else {
      setEditingMotivo(null)
      setMotivoForm({ descricao: '', classificacao: 'Disponibilidade', padrao: false, ativo: true })
    }
    setOpenMotivoDialog(true)
  }

  const handleSaveMotivo = async () => {
    try {
      let result
      if (editingMotivo) {
        result = await window.eel.update_motivo(editingMotivo.id, motivoForm)
      } else {
        result = await window.eel.create_motivo(motivoForm)
      }
      if (result && 'error' in result) {
        alert(result.error)
      } else {
        setOpenMotivoDialog(false)
        loadData()
      }
    } catch (error) {
      console.error('Erro ao salvar motivo:', error)
    }
  }

  const handleDeleteMotivo = async (id: string) => {
    if (confirm('Deseja realmente desativar este motivo?')) {
      try {
        const result = await window.eel.delete_motivo(id)
        if (result && 'error' in result) {
          alert(result.error)
        } else {
          loadData()
        }
      } catch (error) {
        console.error('Erro ao deletar motivo:', error)
      }
    }
  }

  // === LOCAIS ===

  const handleOpenLocalDialog = (local?: Local) => {
    if (local) {
      setEditingLocal(local)
      setLocalForm({ descricao: local.descricao, padrao: local.padrao, ativo: local.ativo })
    } else {
      setEditingLocal(null)
      setLocalForm({ descricao: '', padrao: false, ativo: true })
    }
    setOpenLocalDialog(true)
  }

  const handleSaveLocal = async () => {
    try {
      let result
      if (editingLocal) {
        result = await window.eel.update_local(editingLocal.id, localForm)
      } else {
        result = await window.eel.create_local(localForm)
      }
      if (result && 'error' in result) {
        alert(result.error)
      } else {
        setOpenLocalDialog(false)
        loadData()
      }
    } catch (error) {
      console.error('Erro ao salvar local:', error)
    }
  }

  const handleDeleteLocal = async (id: string) => {
    if (confirm('Deseja realmente desativar este local?')) {
      try {
        const result = await window.eel.delete_local(id)
        if (result && 'error' in result) {
          alert(result.error)
        } else {
          loadData()
        }
      } catch (error) {
        console.error('Erro ao deletar local:', error)
      }
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configurações
      </Typography>

      <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)} sx={{ mb: 3 }}>
        <Tab label="Extratores" />
        <Tab label="Motivos de Parada" />
        <Tab label="Locais de Parada" />
      </Tabs>

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <TextField
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyUp={loadData}
          size="small"
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            if (tabIndex === 0) handleOpenExtratorDialog()
            else if (tabIndex === 1) handleOpenMotivoDialog()
            else handleOpenLocalDialog()
          }}
        >
          Novo
        </Button>
      </Box>

      {/* TABELA EXTRATORES */}
      {tabIndex === 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Número</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(extratores) ? extratores.map((ext) => (
              <TableRow key={ext.id}>
                <TableCell>{ext.numero}</TableCell>
                <TableCell>{ext.modelo}</TableCell>
                <TableCell>{ext.ativo ? 'Ativo' : 'Inativo'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenExtratorDialog(ext)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteExtrator(ext.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>
      )}

      {/* TABELA MOTIVOS */}
      {tabIndex === 1 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Classificação</TableCell>
              <TableCell>Padrão</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(motivos) ? motivos.map((motivo) => (
              <TableRow key={motivo.id}>
                <TableCell>{motivo.descricao}</TableCell>
                <TableCell>{motivo.classificacao}</TableCell>
                <TableCell>{motivo.padrao ? '✓' : ''}</TableCell>
                <TableCell>{motivo.ativo ? 'Ativo' : 'Inativo'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenMotivoDialog(motivo)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteMotivo(motivo.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>
      )}

      {/* TABELA LOCAIS */}
      {tabIndex === 2 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Padrão</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(locais) ? locais.map((local) => (
              <TableRow key={local.id}>
                <TableCell>{local.descricao}</TableCell>
                <TableCell>{local.padrao ? '✓' : ''}</TableCell>
                <TableCell>{local.ativo ? 'Ativo' : 'Inativo'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenLocalDialog(local)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteLocal(local.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>
      )}

      {/* DIALOG EXTRATOR */}
      <Dialog open={openExtratorDialog} onClose={() => setOpenExtratorDialog(false)}>
        <DialogTitle>{editingExtrator ? 'Editar Extrator' : 'Novo Extrator'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, mt: 1 }}>
            <Box>
              <TextField
                fullWidth
                type="number"
                label="Número"
                value={extratorForm.numero}
                onChange={(e) => setExtratorForm({ ...extratorForm, numero: parseInt(e.target.value) })}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Modelo"
                value={extratorForm.modelo}
                onChange={(e) => setExtratorForm({ ...extratorForm, modelo: e.target.value })}
              />
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={extratorForm.ativo}
                    onChange={(e) => setExtratorForm({ ...extratorForm, ativo: e.target.checked })}
                  />
                }
                label="Ativo"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExtratorDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveExtrator} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG MOTIVO */}
      <Dialog open={openMotivoDialog} onClose={() => setOpenMotivoDialog(false)}>
        <DialogTitle>{editingMotivo ? 'Editar Motivo' : 'Novo Motivo'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            <Box sx={{ flex: '1 1 100%' }}>
              <TextField
                fullWidth
                label="Descrição"
                value={motivoForm.descricao}
                onChange={(e) => setMotivoForm({ ...motivoForm, descricao: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 100%' }}>
              <TextField
                fullWidth
                select
                label="Classificação"
                value={motivoForm.classificacao}
                onChange={(e) => setMotivoForm({ ...motivoForm, classificacao: e.target.value })}
              >
                <MenuItem value="Disponibilidade">Disponibilidade</MenuItem>
                <MenuItem value="Performance">Performance</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ flex: '1 1 100%' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={motivoForm.padrao}
                    onChange={(e) => setMotivoForm({ ...motivoForm, padrao: e.target.checked })}
                  />
                }
                label="Padrão"
              />
            </Box>
            <Box sx={{ flex: '1 1 100%' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={motivoForm.ativo}
                    onChange={(e) => setMotivoForm({ ...motivoForm, ativo: e.target.checked })}
                  />
                }
                label="Ativo"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMotivoDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveMotivo} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG LOCAL */}
      <Dialog open={openLocalDialog} onClose={() => setOpenLocalDialog(false)}>
        <DialogTitle>{editingLocal ? 'Editar Local' : 'Novo Local'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            <Box sx={{ flex: '1 1 100%' }}>
              <TextField
                fullWidth
                label="Descrição"
                value={localForm.descricao}
                onChange={(e) => setLocalForm({ ...localForm, descricao: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: '1 1 100%' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={localForm.padrao}
                    onChange={(e) => setLocalForm({ ...localForm, padrao: e.target.checked })}
                  />
                }
                label="Padrão"
              />
            </Box>
            <Box sx={{ flex: '1 1 100%' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={localForm.ativo}
                    onChange={(e) => setLocalForm({ ...localForm, ativo: e.target.checked })}
                  />
                }
                label="Ativo"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLocalDialog(false)}>Cancelar</Button>
          <Button onClick={handleSaveLocal} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Configuracoes
