import { Edit, Save, Comment, Add, Delete } from "@mui/icons-material";
import {
    Accordion, AccordionDetails, AccordionSummary, Box, IconButton, Input, TextField,
    Typography, Badge, Tabs, Tab, Button, Select, MenuItem, FormControl, InputLabel,
    Chip, OutlinedInput
} from "@mui/material";
import { useEffect, useState, useReducer } from "react";

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
    extrator_id: string;
    data: string;
    motivo: string;
    duracao_minutos: number;
    local_parada: string;
    extratores_parados: string[];
};

type Feedback = {
    id: string;
    data: string;
    produto: string;
    tamanho_da_fruta: number;
    caixas_processadas: number;
};

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
            const { [action.key]: _, ...rest } = state.tempValor;
            return { ...state, tempValor: rest };
        }

        case 'SET_TEMP_OBS':
            return { ...state, tempObs: { ...state.tempObs, [action.key]: action.value } };

        case 'CLEAR_TEMP_OBS':
            return { ...state, tempObs: { ...state.tempObs, [action.key]: '' } };

        case 'TOGGLE_OBS_VISIBLE':
            return { ...state, obsVisible: { ...state.obsVisible, [action.key]: !state.obsVisible[action.key] } };

        default:
            return state;
    }
}

export default function LancamentoRapido() {
    const TURNOS = ["06:00 - 14:00", "14:00 - 22:00", "22:00 - 06:00"];
    const PRODUTOS = ["Orange", "Lime", "Lemon", "Tangerine"];

    const [date, setDate] = useState(new Date());
    const [extratores, setExtratores] = useState<Extrator[]>([]);
    const [motivos, setMotivos] = useState<Motivo[]>([]);
    const [locais, setLocais] = useState<LocalParada[]>([]);
    const [state, dispatch] = useReducer(horimetroReducer, initialState);
    const [tabValue, setTabValue] = useState(0);

    // Paradas state
    const [paradas, setParadas] = useState<Parada[]>([]);
    const [newParada, setNewParada] = useState({
        motivo: '',
        duracao_minutos: 0,
        local_parada: '',
        extratores_parados: [] as string[]
    });

    // Feedback state
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [newFeedback, setNewFeedback] = useState({
        produto: PRODUTOS[0],
        tamanho_da_fruta: 0,
        caixas_processadas: 0
    });

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

        const horimetroExistente = findHorimetro(extratorId, turno);
        if (!rawValue && !observacoes && !horimetroExistente) {
            alert('Preencha o valor do horímetro ou adicione observações');
            return;
        }

        const payload: any = {
            extrator_id: extratorId,
            data: dateString,
            turno
        };

        if (rawValue && rawValue !== '') {
            const valor = parseFloat(rawValue);
            if (isNaN(valor)) {
                alert('Valor deve ser um número válido');
                return;
            }
            payload.valor = valor;
        }

        if (observacoes !== null && observacoes !== undefined) {
            payload.observacoes = observacoes;
        }

        try {
            const res = await window.eel.upsert_horimetro(payload)();

            if (res && 'error' in res) {
                alert(`Erro: ${res.error}`);
                return;
            }

            await loadHorimetros();

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
            const result = await window.eel.list_horimetros_by_date(dateString)();
            if (Array.isArray(result)) {
                dispatch({ type: 'SET_HORIMETROS', payload: result as Horimetro[] });
            } else if (result && 'error' in result) {
                console.error('Failed to fetch horimetros:', result.error);
            }
        } catch (err) {
            console.error('Failed to load horimetros', err);
        }
    };

    const loadParadas = async () => {
        const dateString = date.toISOString().substring(0, 10);
        try {
            const result = await window.eel.list_paradas(dateString)();
            if (Array.isArray(result)) {
                setParadas(result);
            } else if (result && 'error' in result) {
                console.error('Failed to fetch paradas:', result.error);
            }
        } catch (err) {
            console.error('Failed to load paradas', err);
        }
    };

    const loadFeedbacks = async () => {
        const dateString = date.toISOString().substring(0, 10);
        try {
            const result = await window.eel.list_feedbacks(dateString)();
            if (Array.isArray(result)) {
                setFeedbacks(result);
            } else if (result && 'error' in result) {
                console.error('Failed to fetch feedbacks:', result.error);
            }
        } catch (err) {
            console.error('Failed to load feedbacks', err);
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

        if (state.tempValor[key]) {
            return state.tempValor[key];
        }

        const horimetro = findHorimetro(extratorId, turno);
        return horimetro?.valor?.toString() ?? '';
    };

    const getObsDisplay = (extratorId: string, turno: string): string => {
        const key = getFieldKey(extratorId, turno);

        if (state.tempObs[key]) {
            return state.tempObs[key];
        }

        const horimetro = findHorimetro(extratorId, turno);
        return horimetro?.observacoes ?? '';
    };

    const isDisabled = (extratorId: string, turno: string): boolean => {
        const key = getFieldKey(extratorId, turno);
        const horimetro = findHorimetro(extratorId, turno);

        return !!horimetro && !state.editing[key];
    };

    const handleValorChange = (extratorId: string, turno: string, value: string) => {
        const key = getFieldKey(extratorId, turno);
        dispatch({ type: 'SET_TEMP_VALOR', key, value });

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

    const handleCreateParada = async () => {
        const dateString = date.toISOString().substring(0, 10);

        if (!newParada.motivo || !newParada.local_parada || newParada.extratores_parados.length === 0) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        if (newParada.duracao_minutos <= 0) {
            alert('A duração deve ser maior que zero');
            return;
        }

        // Create a parada with relations to multiple extractors
        const paradasData = newParada.extratores_parados.map(extratorId => ({
            extrator_id: extratorId,
            data: dateString,
            motivo: newParada.motivo,
            duracao_minutos: newParada.duracao_minutos,
            local_parada: newParada.local_parada,
            extratores_parados: newParada.extratores_parados
        }));

        try {
            const result = await window.eel.batch_create_paradas(paradasData)();
            if (result && 'error' in result) {
                alert(`Erro: ${result.error}`);
                return;
            }

            // Reset form
            setNewParada({
                motivo: '',
                duracao_minutos: 0,
                local_parada: '',
                extratores_parados: []
            });

            await loadParadas();
        } catch (err) {
            console.error(err);
            alert('Erro ao criar parada');
        }
    };

    const handleDeleteParada = async (paradaId: string) => {
        if (!confirm('Deseja realmente excluir esta parada?')) {
            return;
        }

        try {
            const result = await window.eel.delete_parada(paradaId)();
            if (result && 'error' in result) {
                alert(`Erro: ${result.error}`);
                return;
            }

            await loadParadas();
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir parada');
        }
    };

    const handleCreateFeedback = async () => {
        const dateString = date.toISOString().substring(0, 10);

        if (!newFeedback.produto) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        if (newFeedback.tamanho_da_fruta <= 0 || newFeedback.caixas_processadas <= 0) {
            alert('Tamanho da fruta e caixas processadas devem ser maiores que zero');
            return;
        }

        const feedbackData = {
            data: dateString,
            produto: newFeedback.produto,
            tamanho_da_fruta: newFeedback.tamanho_da_fruta,
            caixas_processadas: newFeedback.caixas_processadas
        };

        try {
            const result = await window.eel.create_feedback(feedbackData)();
            if (result && 'error' in result) {
                alert(`Erro: ${result.error}`);
                return;
            }

            // Reset form
            setNewFeedback({
                produto: PRODUTOS[0],
                tamanho_da_fruta: 0,
                caixas_processadas: 0
            });

            await loadFeedbacks();
        } catch (err) {
            console.error(err);
            alert('Erro ao criar feedback');
        }
    };

    const handleDeleteFeedback = async (feedbackId: string) => {
        if (!confirm('Deseja realmente excluir este feedback?')) {
            return;
        }

        try {
            const result = await window.eel.delete_feedback(feedbackId)();
            if (result && 'error' in result) {
                alert(`Erro: ${result.error}`);
                return;
            }

            await loadFeedbacks();
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir feedback');
        }
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
                setMotivos(res);
            }
        });

        // Load locais
        window.eel.list_locais()().then((res) => {
            if (Array.isArray(res)) {
                setLocais(res);
            }
        });

        // Load data for current date
        loadHorimetros();
        loadParadas();
        loadFeedbacks();
    }, [date]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 2, justifyContent: 'center' }}>
            <Box id="title" sx={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
                <Typography variant="h4">Lançamentos</Typography>
            </Box>
            <Box>
                <Input type="date" value={date.toISOString().substring(0, 10)} onChange={(e) => setDate(new Date(e.target.value))} />
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="lancamento tabs">
                    <Tab label="Horímetros" />
                    <Tab label="Paradas" />
                    <Tab label="Feedback Produção" />
                </Tabs>
            </Box>

            {/* TAB 0: HORÍMETROS */}
            {tabValue === 0 && (
                <Box sx={{ width: '40%', alignSelf: 'center' }}>
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
                </Box>
            )}

            {/* TAB 1: PARADAS */}
            {tabValue === 1 && (
                <Box sx={{ width: '60%', alignSelf: 'center' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                        <Typography variant="h6">Nova Parada</Typography>

                        <FormControl fullWidth size="small">
                            <InputLabel>Motivo</InputLabel>
                            <Select
                                value={newParada.motivo}
                                label="Motivo"
                                onChange={(e) => setNewParada({ ...newParada, motivo: e.target.value })}
                            >
                                {motivos.map((motivo) => (
                                    <MenuItem key={motivo.id} value={motivo.id}>{motivo.descricao}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Duração (minutos)"
                            type="number"
                            size="small"
                            value={newParada.duracao_minutos}
                            onChange={(e) => setNewParada({ ...newParada, duracao_minutos: Math.max(0, parseInt(e.target.value) || 0) })}
                            inputProps={{ min: 0 }}
                            fullWidth
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel>Local da Parada</InputLabel>
                            <Select
                                value={newParada.local_parada}
                                label="Local da Parada"
                                onChange={(e) => setNewParada({ ...newParada, local_parada: e.target.value })}
                            >
                                {locais.map((local) => (
                                    <MenuItem key={local.id} value={local.id}>{local.descricao}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel>Extratores Parados</InputLabel>
                            <Select
                                multiple
                                value={newParada.extratores_parados}
                                onChange={(e) => setNewParada({ ...newParada, extratores_parados: e.target.value as string[] })}
                                input={<OutlinedInput label="Extratores Parados" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => {
                                            const extrator = extratores.find(e => e.id === value);
                                            return <Chip key={value} label={`Extrator ${extrator?.numero}`} />;
                                        })}
                                    </Box>
                                )}
                            >
                                {extratores.map((extrator) => (
                                    <MenuItem key={extrator.id} value={extrator.id}>
                                        Extrator {extrator.numero} - {extrator.modelo}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleCreateParada}
                        >
                            Adicionar Parada
                        </Button>
                    </Box>

                    <Typography variant="h6" sx={{ mb: 2 }}>Paradas do Dia</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {paradas.map((parada) => {
                            const motivo = motivos.find(m => m.id === parada.motivo);
                            const local = locais.find(l => l.id === parada.local_parada);
                            const extratoresParados = parada.extratores_parados.map(id => {
                                const ext = extratores.find(e => e.id === id);
                                return ext ? `Extrator ${ext.numero}` : id;
                            }).join(', ');

                            return (
                                <Box key={parada.id} sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography><strong>Motivo:</strong> {motivo?.descricao}</Typography>
                                        <Typography><strong>Duração:</strong> {parada.duracao_minutos} minutos</Typography>
                                        <Typography><strong>Local:</strong> {local?.descricao}</Typography>
                                        <Typography><strong>Extratores Parados:</strong> {extratoresParados}</Typography>
                                    </Box>
                                    <IconButton color="error" onClick={() => handleDeleteParada(parada.id)}>
                                        <Delete />
                                    </IconButton>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* TAB 2: FEEDBACK PRODUÇÃO */}
            {tabValue === 2 && (
                <Box sx={{ width: '60%', alignSelf: 'center' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                        <Typography variant="h6">Novo Feedback de Produção</Typography>

                        <FormControl fullWidth size="small">
                            <InputLabel>Produto</InputLabel>
                            <Select
                                value={newFeedback.produto}
                                label="Produto"
                                onChange={(e) => setNewFeedback({ ...newFeedback, produto: e.target.value })}
                            >
                                {PRODUTOS.map((produto) => (
                                    <MenuItem key={produto} value={produto}>{produto}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Tamanho da Fruta"
                            type="number"
                            size="small"
                            value={newFeedback.tamanho_da_fruta}
                            onChange={(e) => setNewFeedback({ ...newFeedback, tamanho_da_fruta: Math.max(0, parseInt(e.target.value) || 0) })}
                            inputProps={{ min: 0 }}
                            fullWidth
                        />

                        <TextField
                            label="Caixas Processadas"
                            type="number"
                            size="small"
                            value={newFeedback.caixas_processadas}
                            onChange={(e) => setNewFeedback({ ...newFeedback, caixas_processadas: Math.max(0, parseInt(e.target.value) || 0) })}
                            inputProps={{ min: 0 }}
                            fullWidth
                        />

                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleCreateFeedback}
                        >
                            Adicionar Feedback
                        </Button>
                    </Box>

                    <Typography variant="h6" sx={{ mb: 2 }}>Feedbacks do Dia</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {feedbacks.map((feedback) => {

                            return (
                                <Box key={feedback.id} sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography><strong>Produto:</strong> {feedback.produto}</Typography>
                                        <Typography><strong>Tamanho da Fruta:</strong> {feedback.tamanho_da_fruta}</Typography>
                                        <Typography><strong>Caixas Processadas:</strong> {feedback.caixas_processadas}</Typography>
                                    </Box>
                                    <IconButton color="error" onClick={() => handleDeleteFeedback(feedback.id)}>
                                        <Delete />
                                    </IconButton>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}
        </Box>
    )
}