import { Edit, Save, Comment, Add } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Box, IconButton, Input, TextField, Typography, Badge, Tabs, Tab, Button, Select, MenuItem, FormControl, InputLabel, Checkbox, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Divider } from "@mui/material";
import { useEffect, useState, useReducer } from "react";

const formatDateBR = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const produtos = ['Orange', 'Lime', 'Lemon', 'Tangerine'];

type Horimetro = { 
    id: string; 
    extrator_id: string; 
    data: string; 
    turno: string; 
    valor: number; 
    observacoes?: string | null; 
    created_at: string 
};

type Parada = {
    id: string;
    data: string;
    motivo: string;
    hora_inicio: string;
    hora_fim: string;
    local_parada: string;
    observacoes?: string;
    extratores_parados: string[];
};

type FeedBackProducao = {
    id: string;
    data: string;
    produto: string;
    tamanho_da_fruta: number;
    caixas_processadas: number;
};

type Motivo = { id: string; descricao: string; classificacao: string; padrao: boolean; ativo: boolean };
type Local = { id: string; descricao: string; padrao: boolean; ativo: boolean };

type HorimetroState = {
    horimetros: Horimetro[];
    editing: Record<string, boolean>;
    tempValor: Record<string, string>;
    tempObs: Record<string, string>;
    obsVisible: Record<string, boolean>;
};

type HorimetroAction =
    | { type: 'SET_HORIMETROS'; payload: Horimetro[] }
    | { type: 'ENABLE_EDIT'; key: string }
    | { type: 'DISABLE_EDIT'; key: string }
    | { type: 'SET_TEMP_VALOR'; key: string; value: string }
    | { type: 'CLEAR_TEMP_VALOR'; key: string }
    | { type: 'SET_TEMP_OBS'; key: string; value: string }
    | { type: 'CLEAR_TEMP_OBS'; key: string }
    | { type: 'TOGGLE_OBS_VISIBLE'; key: string };

const initialState: HorimetroState = {
    horimetros: [],
    editing: {},
    tempValor: {},
    tempObs: {},
    obsVisible: {}
};

function horimetroReducer(state: HorimetroState, action: HorimetroAction): HorimetroState {
    switch (action.type) {
        case 'SET_HORIMETROS':
            return { ...state, horimetros: action.payload };
        
        case 'ENABLE_EDIT':
            return { ...state, editing: { ...state.editing, [action.key]: true } };
        
        case 'DISABLE_EDIT':
            return { ...state, editing: { ...state.editing, [action.key]: false } };
        
        case 'SET_TEMP_VALOR':
            return { ...state, tempValor: { ...state.tempValor, [action.key]: action.value } };
        
        case 'CLEAR_TEMP_VALOR': {
            const { [action.key]: __removed, ...rest } = state.tempValor;
            void __removed;
            return { ...state, tempValor: rest };
        }
        
        case 'SET_TEMP_OBS':
            return { ...state, tempObs: { ...state.tempObs, [action.key]: action.value } };
        
        case 'CLEAR_TEMP_OBS': {
            const { [action.key]: __removed, ...rest } = state.tempObs;
            void __removed;
            return { ...state, tempObs: rest };
        }
        
        case 'TOGGLE_OBS_VISIBLE':
            return { ...state, obsVisible: { ...state.obsVisible, [action.key]: !state.obsVisible[action.key] } };
        
        default:
            return state;
    }
}

export default function LancamentoRapido() {
    const TURNOS = ["06:00 - 14:00", "14:00 - 22:00", "22:00 - 06:00"];

    const [date, setDate] = useState(new Date());
    const [extratores, setExtratores] = useState<Extrator[]>([]);
    const [state, dispatch] = useReducer(horimetroReducer, initialState);

    const [tabIndex, setTabIndex] = useState<number>(0);
    const [paradas, setParadas] = useState<Parada[]>([]);
    const [feedbacks, setFeedbacks] = useState<FeedBackProducao[]>([]);
    const [motivos, setMotivos] = useState<Motivo[]>([]);
    const [locais, setLocais] = useState<Local[]>([]);
    const [paradasEditing, setParadasEditing] = useState<Record<string, boolean>>({});
    const [novaParadaOpen, setNovaParadaOpen] = useState(false);
    const [paradaForm, setParadaForm] = useState({
        motivo: '',
        hora_inicio: '',
        hora_fim: '',
        local_parada: '',
        observacoes: '',
        extratores_parados: [] as string[]
    });

    const [tempTamanho, setTempTamanho] = useState<Record<string, number>>({});
    const [tempCaixas, setTempCaixas] = useState<Record<string, number>>({});

    const [nominalConstant, setNominalConstant] = useState<number>(8784000);

    useEffect(() => {
        (async () => {
            try {
                if (!window.eel || typeof window.eel.get_nominal_constant !== 'function') return;
                const result = await window.eel.get_nominal_constant()();
                if (typeof result === 'number') {
                    setNominalConstant(result);
                } else {
                    console.error('Erro ao carregar constante:', result.error);
                }
            } catch (err) {
                console.error('Erro ao carregar constante nominal', err);
            }
        })();
    }, []);

    useEffect(() => {
        const dateString = date.toISOString().substring(0, 10);

        if (tabIndex === 1) {
            (async () => {
                try {
                    if (!window.eel || typeof window.eel.list_paradas !== 'function') return;
                    const res = await window.eel.list_paradas(dateString)();
                    if (Array.isArray(res)) setParadas(res as unknown as Parada[]);
                } catch (err) {
                    console.error('Erro ao carregar paradas', err);
                }
            })();
        }

        if (tabIndex === 2) {
            (async () => {
                try {
                    if (!window.eel || typeof window.eel.list_feedbacks !== 'function') return;
                    const res = await window.eel.list_feedbacks(dateString)();
                    if (Array.isArray(res)) {
                        setFeedbacks(res as unknown as FeedBackProducao[]);
                        // Inicializar temp states
                        const newTempTamanho: Record<string, number> = {};
                        const newTempCaixas: Record<string, number> = {};
                        (res as unknown as FeedBackProducao[]).forEach(f => {
                            newTempTamanho[f.produto] = f.tamanho_da_fruta;
                            newTempCaixas[f.produto] = f.caixas_processadas;
                        });
                        setTempTamanho(newTempTamanho);
                        setTempCaixas(newTempCaixas);
                    }
                } catch (err) {
                    console.error('Erro ao carregar feedbacks', err);
                }
            })();
        }
    }, [tabIndex, date]);

    const getFieldKey = (extratorId: string, turno: string) => `${extratorId}-${turno}`;

    const handleEdit = (extratorId: string, turno: string) => {
        const key = getFieldKey(extratorId, turno);
        dispatch({ type: 'ENABLE_EDIT', key });
    };

    const handleSave = async (extratorId: string, turno: string) => {
        const key = getFieldKey(extratorId, turno);
        const dateString = date.toISOString().substring(0, 10);
        const rawValue = state.tempValor[key];
        const observacoes = state.tempObs[key] || null;
        
        // Verifica se há algo para salvar
        const horimetroExistente = findHorimetro(extratorId, turno);
        if (!rawValue && !observacoes && !horimetroExistente) {
            alert('Preencha o valor do horímetro ou adicione observações');
            return;
        }

        // Prepara payload - só envia o que mudou
        const payload: Record<string, unknown> = {
            extrator_id: extratorId, 
            data: dateString, 
            turno
        };

        // Adiciona valor se foi preenchido/modificado
        if (rawValue && rawValue !== '') {
            const valor = parseFloat(rawValue);
            if (isNaN(valor)) {
                alert('Valor deve ser um número válido');
                return;
            }
            payload.valor = valor;
        }

        // Adiciona observações se foram preenchidas
        if (observacoes !== null && observacoes !== undefined) {
            payload.observacoes = observacoes;
        }
        
        try {
            const res = await window.eel.upsert_horimetro(payload)();
            
            if (res && 'error' in res) {
                alert(`Erro: ${res.error}`);
                return;
            }

            // Reload from DB
            await loadHorimetros();

            // Clear editing state
            dispatch({ type: 'DISABLE_EDIT', key });
            dispatch({ type: 'CLEAR_TEMP_VALOR', key });
            dispatch({ type: 'CLEAR_TEMP_OBS', key });
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar horímetro');
        }
    };

    const loadHorimetros = async () => {
        const dateString = date.toISOString().substring(0, 10);
        try {
            if (typeof window === 'undefined' || !window.eel || typeof window.eel.list_horimetros_by_date !== 'function') {
                console.error('Eel bridge unavailable (window.eel.list_horimetros_by_date missing)');
                return;
            }
            console.debug('loadHorimetros dateString=', dateString);
            const result = await window.eel.list_horimetros_by_date(dateString)();
            console.debug('loadHorimetros result raw=', result);
            if (Array.isArray(result)) {
                dispatch({ type: 'SET_HORIMETROS', payload: result as Horimetro[] });
            } else if (result && 'error' in result) {
                console.error('Failed to fetch horimetros:', result.error);
            } else {
                console.warn('loadHorimetros: unexpected result', result);
            }
        } catch (err) {
            console.error('Failed to load horimetros', err);
        }
    };

    const findHorimetro = (extratorId: string, turno: string): Horimetro | undefined => {
        const dateString = date.toISOString().substring(0, 10);
        return state.horimetros.find(h => 
            h.extrator_id === extratorId && 
            h.turno === turno && 
            h.data === dateString
        );
    };

    const getValorDisplay = (extratorId: string, turno: string): string => {
        const key = getFieldKey(extratorId, turno);
        
        // Show temp value if editing
        if (state.tempValor[key]) {
            return state.tempValor[key];
        }
        
        // Otherwise show DB value
        const horimetro = findHorimetro(extratorId, turno);
        return horimetro?.valor?.toString() ?? '';
    };

    const getObsDisplay = (extratorId: string, turno: string): string => {
        const key = getFieldKey(extratorId, turno);
        
        // Show temp value if typing
        if (state.tempObs[key]) {
            return state.tempObs[key];
        }
        
        // Otherwise show DB value
        const horimetro = findHorimetro(extratorId, turno);
        return horimetro?.observacoes ?? '';
    };

    const isDisabled = (extratorId: string, turno: string): boolean => {
        const key = getFieldKey(extratorId, turno);
        const horimetro = findHorimetro(extratorId, turno);
        
        // Disabled if saved and not editing
        return !!horimetro && !state.editing[key];
    };

    const handleValorChange = (extratorId: string, turno: string, value: string) => {
        const key = getFieldKey(extratorId, turno);
        dispatch({ type: 'SET_TEMP_VALOR', key, value });
        
        // Auto-enable editing for new entries
        if (!findHorimetro(extratorId, turno)) {
            dispatch({ type: 'ENABLE_EDIT', key });
        }
    };

    const handleObsChange = (extratorId: string, turno: string, value: string) => {
        const key = getFieldKey(extratorId, turno);
        dispatch({ type: 'SET_TEMP_OBS', key, value });
    };

    const toggleObs = (extratorId: string, turno: string) => {
        const key = getFieldKey(extratorId, turno);
        dispatch({ type: 'TOGGLE_OBS_VISIBLE', key });
    };

    const handleSalvarParada = async () => {
        const dateString = date.toISOString().substring(0, 10);
        if (!paradaForm.motivo || !paradaForm.hora_inicio || !paradaForm.hora_fim || paradaForm.extratores_parados.length === 0) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        const payload = [{
            data: dateString,
            motivo: paradaForm.motivo,
            hora_inicio: paradaForm.hora_inicio,
            hora_fim: paradaForm.hora_fim,
            local_parada: paradaForm.local_parada || null,
            observacoes: paradaForm.observacoes || '',
            extratores_parados: paradaForm.extratores_parados
        }];

        try {
            const res = await window.eel.batch_create_paradas(payload)();
            if (res && 'error' in res) {
                alert(`Erro: ${res.error}`);
                return;
            }
            setNovaParadaOpen(false);
            setParadaForm({ motivo: '', hora_inicio: '', hora_fim: '', local_parada: '', observacoes: '', extratores_parados: [] });
            // Reload paradas
            const dateStringReload = date.toISOString().substring(0, 10);
            const resReload = await window.eel.list_paradas(dateStringReload)();
            if (Array.isArray(resReload)) setParadas(resReload as unknown as Parada[]);
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar parada');
        }
    };

    const handleSalvarFeedback = async (produto: string) => {
        const dateString = date.toISOString().substring(0, 10);
        const tamanho = tempTamanho[produto] || 0;
        const caixas = tempCaixas[produto] || 0;

        if (tamanho <= 0 || caixas <= 0) {
            alert('Preencha tamanho da fruta e caixas processadas válidos');
            return;
        }

        const payload = {
            data: dateString,
            produto: produto,
            tamanho_da_fruta: tamanho,
            caixas_processadas: caixas
        };

        try {
            const res = await window.eel.create_feedback(payload)();
            if (res && 'error' in res) {
                alert(`Erro: ${res.error}`);
                return;
            }
            // Reload feedbacks
            const resReload = await window.eel.list_feedbacks(dateString)();
            if (Array.isArray(resReload)) {
                setFeedbacks(resReload as unknown as FeedBackProducao[]);
                // Re-inicializar temp
                const newTempTamanho: Record<string, number> = {};
                const newTempCaixas: Record<string, number> = {};
                (resReload as unknown as FeedBackProducao[]).forEach(f => {
                    newTempTamanho[f.produto] = f.tamanho_da_fruta;
                    newTempCaixas[f.produto] = f.caixas_processadas;
                });
                setTempTamanho(newTempTamanho);
                setTempCaixas(newTempCaixas);
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar feedback');
        }
    };

    const handleEditarParada = (paradaId: string) => {
        setParadasEditing(prev => ({ ...prev, [paradaId]: true }));
    };

    useEffect(() => {
        // Load extratores
        window.eel.list_extratores()().then((res) => {
            if (Array.isArray(res)) {
                setExtratores(res as Extrator[]);
            } else if (res && 'error' in res) {
                console.error('Failed to fetch extratores:', res.error);
            }
        });

        // Load motivos
        window.eel.list_motivos()().then((res) => {
            if (Array.isArray(res)) {
                setMotivos(res as Motivo[]);
            } else if (res && 'error' in res) {
                console.error('Failed to fetch motivos:', res.error);
            }
        });

        // Load locais
        window.eel.list_locais()().then((res) => {
            if (Array.isArray(res)) {
                setLocais(res as Local[]);
            } else if (res && 'error' in res) {
                console.error('Failed to fetch locais:', res.error);
            }
        });

        // Load horimetros for current date
        const dateString = date.toISOString().substring(0, 10);
        console.log('CARREGANDO HORIMETROS PARA DATA:', dateString);
        
        if (!window.eel || typeof window.eel.list_horimetros_by_date !== 'function') {
            console.error('Eel bridge unavailable');
            return;
        }

        window.eel.list_horimetros_by_date(dateString)().then((result) => {
            console.log('RESULTADO DO BANCO:', result);
            if (Array.isArray(result)) {
                console.log('DESPACHANDO', result.length, 'HORIMETROS PARA O STATE');
                dispatch({ type: 'SET_HORIMETROS', payload: result as Horimetro[] });
            } else {
                console.error('Resultado não é array:', result);
            }
        }).catch((err) => {
            console.error('ERRO AO CARREGAR:', err);
        });
    }, [date]);







    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 2, justifyContent: 'center' }}>
            <Box id="title" sx={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
                <Typography variant="h4">Lançamentos</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Input type="date" value={date.toISOString().substring(0, 10)} onChange={(e) => setDate(new Date(e.target.value))} />
            </Box>

            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} centered>
                <Tab label="Horímetros" />
                <Tab label="Paradas" />
                <Tab label="Feedback Produção" />
            </Tabs>

            {tabIndex === 0 && (
                <Card sx={{ width: '90%', maxWidth: 800, alignSelf: 'center' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Horímetros por Extrator</Typography>
                        <Divider sx={{ mb: 3 }} />
                        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                            {extratores.map((extrator) => (
                                <Accordion key={extrator.id} sx={{ width: '100%' }}>
                                    <AccordionSummary>
                                        <Typography>Extrator {extrator.numero} - {extrator.modelo}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {TURNOS.map((turno) => {
                                                const key = getFieldKey(extrator.id, turno);
                                                const horimetro = findHorimetro(extrator.id, turno);
                                                const disabled = isDisabled(extrator.id, turno);
                                                const hasObs = !!horimetro?.observacoes;
                                                const needsValor = horimetro?.valor === 0 && hasObs;
                                                
                                                return (
                                                    <Box key={turno} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                                                            <TextField
                                                                label={turno}
                                                                variant="outlined"
                                                                type="number"
                                                                size="small"
                                                                disabled={disabled}
                                                                value={getValorDisplay(extrator.id, turno)}
                                                                onChange={(e) => handleValorChange(extrator.id, turno, e.target.value)}
                                                                inputProps={{ inputMode: 'numeric', step: 0.01, min: 0 }}
                                                                sx={{ flex: 1 }}
                                                                helperText={needsValor ? 'Valor pendente - preencher' : ''}
                                                                error={needsValor}
                                                            />

                                                            <IconButton 
                                                                onClick={() => handleSave(extrator.id, turno)}
                                                                disabled={disabled}
                                                                color="primary"
                                                            >
                                                                <Save />
                                                            </IconButton>
                                                            
                                                            <IconButton 
                                                                onClick={() => handleEdit(extrator.id, turno)}
                                                                disabled={!disabled}
                                                                color="secondary"
                                                            >
                                                                <Edit />
                                                            </IconButton>

                                                            <IconButton onClick={() => toggleObs(extrator.id, turno)} color="inherit">
                                                                <Badge color="warning" variant={hasObs ? 'dot' : 'standard'}>
                                                                    <Comment />
                                                                </Badge>
                                                            </IconButton>
                                                        </Box>
                                                        
                                                        {state.obsVisible[key] && (
                                                            <TextField
                                                                label="Observações"
                                                                variant="outlined"
                                                                size="small"
                                                                multiline
                                                                minRows={2}
                                                                disabled={disabled}
                                                                value={getObsDisplay(extrator.id, turno)}
                                                                onChange={(e) => handleObsChange(extrator.id, turno, e.target.value)}
                                                                fullWidth
                                                            />
                                                        )}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </AccordionDetails>

                                </Accordion>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            )}

            {tabIndex === 1 && (
                <Box sx={{ width: '80%', alignSelf: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Typography variant="h6">Paradas para {formatDateBR(date)}</Typography>
                        <Button variant="contained" startIcon={<Add />} onClick={() => setNovaParadaOpen(true)}>
                            Nova Parada
                        </Button>
                    </Box>
                    {paradas.length === 0 ? (
                        <Typography>Sem paradas registradas</Typography>
                    ) : (
                        paradas.map(p => (
                            <Box key={p.id} sx={{ padding: 2, border: '1px solid #eee', borderRadius: 1, marginTop: 1 }}>
                                <Typography><b>Motivo:</b> {motivos.find(m => m.id === p.motivo)?.descricao || p.motivo} — <b>Horário:</b> {p.hora_inicio} - {p.hora_fim}</Typography>
                                <Typography><b>Local:</b> {locais.find(l => l.id === p.local_parada)?.descricao || p.local_parada}</Typography>
                                <Typography><b>Extratores:</b> {p.extratores_parados.map(id => extratores.find(e => e.id === id)?.numero).join(', ')}</Typography>
                                {p.observacoes && <Typography><b>Observações:</b> {p.observacoes}</Typography>}
                                {!paradasEditing[p.id] && (
                                    <Button onClick={() => handleEditarParada(p.id)} startIcon={<Edit />}>Editar</Button>
                                )}
                            </Box>
                        ))
                    )}

                    <Dialog open={novaParadaOpen} onClose={() => setNovaParadaOpen(false)} maxWidth="md" fullWidth>
                        <DialogTitle>Nova Parada</DialogTitle>
                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 1 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Motivo</InputLabel>
                                    <Select
                                        value={paradaForm.motivo}
                                        onChange={(e) => setParadaForm(prev => ({ ...prev, motivo: e.target.value }))}
                                        label="Motivo"
                                    >
                                        {motivos.filter(m => m.ativo).map(motivo => (
                                            <MenuItem key={motivo.id} value={motivo.id}>{motivo.descricao}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth>
                                    <InputLabel>Local de Parada</InputLabel>
                                    <Select
                                        value={paradaForm.local_parada}
                                        onChange={(e) => setParadaForm(prev => ({ ...prev, local_parada: e.target.value }))}
                                        label="Local de Parada"
                                    >
                                        {locais.filter(l => l.ativo).map(local => (
                                            <MenuItem key={local.id} value={local.id}>{local.descricao}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Hora Início"
                                    type="time"
                                    value={paradaForm.hora_inicio}
                                    onChange={(e) => setParadaForm(prev => ({ ...prev, hora_inicio: e.target.value }))}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />

                                <TextField
                                    label="Hora Fim"
                                    type="time"
                                    value={paradaForm.hora_fim}
                                    onChange={(e) => setParadaForm(prev => ({ ...prev, hora_fim: e.target.value }))}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />

                                <FormControl fullWidth>
                                    <InputLabel>Extratores Afetados</InputLabel>
                                    <Select
                                        multiple
                                        value={paradaForm.extratores_parados}
                                        onChange={(e) => setParadaForm(prev => ({ ...prev, extratores_parados: e.target.value as string[] }))}
                                        renderValue={(selected) => selected.map(id => extratores.find(e => e.id === id)?.numero).join(', ')}
                                        label="Extratores Afetados"
                                    >
                                        {extratores.filter(e => e.ativo).map(extrator => (
                                            <MenuItem key={extrator.id} value={extrator.id}>
                                                <Checkbox checked={paradaForm.extratores_parados.indexOf(extrator.id) > -1} />
                                                <ListItemText primary={`Extrator ${extrator.numero} - ${extrator.modelo}`} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Observações"
                                    multiline
                                    rows={3}
                                    value={paradaForm.observacoes}
                                    onChange={(e) => setParadaForm(prev => ({ ...prev, observacoes: e.target.value }))}
                                    fullWidth
                                />
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setNovaParadaOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSalvarParada} variant="contained">Salvar</Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            )}

            {tabIndex === 2 && (
                <Box sx={{ width: '80%', alignSelf: 'center' }}>
                    <Typography variant="h6">Feedback Produção para {formatDateBR(date)}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {produtos.map((produto) => {
                            const feedback = feedbacks.find(f => f.produto === produto);
                            const tamanho = tempTamanho[produto] ?? feedback?.tamanho_da_fruta ?? 0;
                            const caixas = tempCaixas[produto] ?? feedback?.caixas_processadas ?? 0;

                            return (
                                <Box key={produto} sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center', padding: 2, border: '1px solid #eee', borderRadius: 1 }}>
                                    <Typography sx={{ minWidth: 100 }}>{produto}</Typography>
                                    <TextField
                                        label="Tamanho da Fruta"
                                        type="number"
                                        size="small"
                                        value={tamanho}
                                        onChange={(e) => setTempTamanho(prev => ({ ...prev, [produto]: parseFloat(e.target.value) || 0 }))}
                                        inputProps={{ step: 0.01, min: 0 }}
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        label="Caixas Processadas"
                                        type="number"
                                        size="small"
                                        value={caixas}
                                        onChange={(e) => setTempCaixas(prev => ({ ...prev, [produto]: parseInt(e.target.value) || 0 }))}
                                        inputProps={{ min: 0 }}
                                        sx={{ flex: 1 }}
                                    />
                                    <Typography variant="body2" sx={{ minWidth: 100 }}>
                                        Nominal: {(() => {
                                            const totalCaixas = Object.values(tempCaixas).reduce((sum, v) => sum + v, 0);
                                            return tamanho > 0 && totalCaixas > 0 ? (((nominalConstant * 5 * 60 * 11 * 24) / tamanho) * (caixas / totalCaixas)).toFixed(2) : '0.00';
                                        })()}
                                    </Typography>
                                    <IconButton 
                                        onClick={() => handleSalvarFeedback(produto)}
                                        color="primary"
                                    >
                                        <Save />
                                    </IconButton>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

        </Box >
    )
}