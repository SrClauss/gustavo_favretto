import { Edit, Save, Comment, Add, Delete } from "@mui/icons-material";
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
    fieldErrors: Record<string, string>;
};

type HorimetroAction =
    | { type: 'SET_HORIMETROS'; payload: Horimetro[] }
    | { type: 'ENABLE_EDIT'; key: string }
    | { type: 'DISABLE_EDIT'; key: string }
    | { type: 'SET_TEMP_VALOR'; key: string; value: string }
    | { type: 'CLEAR_TEMP_VALOR'; key: string }
    | { type: 'SET_TEMP_OBS'; key: string; value: string }
    | { type: 'CLEAR_TEMP_OBS'; key: string }
    | { type: 'TOGGLE_OBS_VISIBLE'; key: string }
    | { type: 'SET_FIELD_ERROR'; key: string; message: string }
    | { type: 'CLEAR_FIELD_ERROR'; key: string };

const initialState: HorimetroState = {
    horimetros: [],
    editing: {},
    tempValor: {},
    tempObs: {},
    obsVisible: {},
    fieldErrors: {}
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
        
        case 'SET_FIELD_ERROR':
            return { ...state, fieldErrors: { ...state.fieldErrors, [action.key]: action.message } };

        case 'CLEAR_FIELD_ERROR': {
            const { [action.key]: __removed, ...rest } = state.fieldErrors;
            void __removed;
            return { ...state, fieldErrors: rest };
        }

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

    const [tempTamanho, setTempTamanho] = useState<Record<string, string>>({});
    const [tempCaixas, setTempCaixas] = useState<Record<string, string>>({});

    const [feedbackEditing, setFeedbackEditing] = useState<Record<string, boolean>>({});

    const [nominalConstant, setNominalConstant] = useState<number>(8784000);

    useEffect(() => {
        (async () => {
            try {
                if (!window.eel || typeof window.eel.get_nominal_constant !== 'function') return;
                const result = await window.eel.get_nominal_constant()();
                if (typeof result === 'number') {
                    setNominalConstant(result);
                } else {
                    console.error('Erro ao carregar constante:', result);
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
                        // Inicializar temp states (usar strings para permitir edição)
                        const newTempTamanho: Record<string, string> = {};
                        const newTempCaixas: Record<string, string> = {};
                        (res as unknown as FeedBackProducao[]).forEach(f => {
                            newTempTamanho[f.produto] = String(f.tamanho_da_fruta);
                            newTempCaixas[f.produto] = String(f.caixas_processadas);
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
        
        // Client-side validation (mirror backend rules)
        if (payload.valor !== undefined) {
            const valores: Record<string, number> = {};
            state.horimetros.forEach(h => {
                if (h.extrator_id === extratorId && h.data === dateString) {
                    valores[h.turno] = h.valor;
                }
            });
            valores[turno] = Number(payload.valor);

            const t1 = valores['1'];
            const t2 = valores['2'];
            const t3 = valores['3'];

            if (t1 !== undefined && t2 !== undefined && t2 < t1) {
                alert(`Turno 2 (${t2.toFixed(2)}h) não pode ser menor que Turno 1 (${t1.toFixed(2)}h)`);
                return;
            }
            if (t2 !== undefined && t3 !== undefined && t3 < t2) {
                alert(`Turno 3 (${t3.toFixed(2)}h) não pode ser menor que Turno 2 (${t2.toFixed(2)}h)`);
                return;
            }
            if (t1 !== undefined && t3 !== undefined && t3 < t1) {
                alert(`Turno 3 (${t3.toFixed(2)}h) não pode ser menor que Turno 1 (${t1.toFixed(2)}h)`);
                return;
            }

            if (t1 !== undefined && t2 !== undefined) {
                const diff = t2 - t1;
                if (diff > 8.0) {
                    alert(`Diferença entre Turno 1 e Turno 2 (${diff.toFixed(2)}h) excede o máximo de 8h`);
                    return;
                }
            }
            if (t2 !== undefined && t3 !== undefined) {
                const diff = t3 - t2;
                if (diff > 8.0) {
                    alert(`Diferença entre Turno 2 e Turno 3 (${diff.toFixed(2)}h) excede o máximo de 8h`);
                    return;
                }
            }
        }

        try {
            const res = await window.eel.upsert_horimetro(payload)();
            
            if (res && typeof res === 'object' && 'error' in res) {
                // Show descriptive feedback
                const item = res as unknown as { message?: string; error?: string; hint?: string };
                const message = item.message || item.error || 'Erro desconhecido';
                const hint = item && item.hint ? `\nDica: ${item.hint}` : '';
                alert(`${message}${hint}`);

                // Set inline field error for the input user was editing
                dispatch({ type: 'SET_FIELD_ERROR', key, message });
                return;
            }

            // Reload from DB
            await loadHorimetros();

            // Clear editing state and any field error
            dispatch({ type: 'DISABLE_EDIT', key });
            dispatch({ type: 'CLEAR_TEMP_VALOR', key });
            dispatch({ type: 'CLEAR_TEMP_OBS', key });
            dispatch({ type: 'CLEAR_FIELD_ERROR', key });
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
            } else if (result && typeof result === 'object' && 'error' in result) {
                const r = result as { error?: unknown };
                console.error('Failed to fetch horimetros:', r.error);
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
        
        // Show temp value only when editing
        if (state.editing[key] && state.tempValor[key] !== undefined) {
            return state.tempValor[key];
        }
        
        // Otherwise show DB value
        const horimetro = findHorimetro(extratorId, turno);
        return horimetro?.valor?.toString() ?? '';
    };

    const getObsDisplay = (extratorId: string, turno: string): string => {
        const key = getFieldKey(extratorId, turno);
        
        // Show temp value only when editing
        if (state.editing[key] && state.tempObs[key] !== undefined) {
            return state.tempObs[key];
        }
        
        // Otherwise show DB value
        const horimetro = findHorimetro(extratorId, turno);
        return horimetro?.observacoes ?? '';
    };

    const isReadOnly = (extratorId: string, turno: string): boolean => {
        const key = getFieldKey(extratorId, turno);
        const horimetro = findHorimetro(extratorId, turno);
        // Read-only quando já existe horímetro salvo e não estamos em modo de edição
        return !!horimetro && !state.editing[key];
    };

    const handleValorChange = (extratorId: string, turno: string, value: string) => {
        const key = getFieldKey(extratorId, turno);
        // Apenas aceita mudanças quando em modo de edição
        if (!state.editing[key]) return;
        dispatch({ type: 'SET_TEMP_VALOR', key, value });
    };

    const handleObsChange = (extratorId: string, turno: string, value: string) => {
        const key = getFieldKey(extratorId, turno);
        // Apenas aceita mudanças quando em modo de edição
        if (!state.editing[key]) return;
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

        const parseTime = (s: string) => {
            const parts = s.split(':');
            if (parts.length !== 2) return null;
            const hh = parseInt(parts[0]);
            const mm = parseInt(parts[1]);
            if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
            return hh * 60 + mm;
        };

        const inicioMin = parseTime(paradaForm.hora_inicio);
        const fimMin = parseTime(paradaForm.hora_fim);
        if (inicioMin === null || fimMin === null) {
            alert('Formato de hora inválido. Use HH:MM (24h).');
            return;
        }
        if (fimMin <= inicioMin) {
            alert('Hora final deve ser maior que hora inicial');
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
            // backend may return array of values; each item may be a validation object
            if (Array.isArray(res) && res[0] && typeof res[0] === 'object' && 'error' in res[0]) {
                const item = res[0] as unknown as { message?: string; error?: string; hint?: string };
                const message = item.message || item.error || 'Erro ao validar parada';
                const hint = item.hint ? `\nDica: ${item.hint}` : '';
                alert(`${message}${hint}`);
                return;
            }
            if (res && typeof res === 'object' && typeof res === 'object' && 'error' in res) {
                const item = res as unknown as { message?: string; error?: string; hint?: string };
                const message = item.message || item.error || 'Erro ao validar parada';
                const hint = item && item.hint ? `\nDica: ${item.hint}` : '';
                alert(`${message}${hint}`);
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
        const tamanho = parseFloat(tempTamanho[produto] ?? '') || 0;
        const caixas = parseInt(tempCaixas[produto] ?? '') || 0;

        if (tamanho <= 0 || caixas <= 0) {
            alert('Preencha tamanho da fruta e caixas processadas válidos');
            return;
        }

        const existingFeedback = feedbacks.find(f => f.produto === produto);

        const payload = {
            data: dateString,
            produto: produto,
            tamanho_da_fruta: tamanho,
            caixas_processadas: caixas
        };

        try {
            let res;
            if (existingFeedback) {
                // Atualizar existente
                res = await window.eel.update_feedback(existingFeedback.id, payload)();
            } else {
                // Criar novo
                res = await window.eel.create_feedback(payload)();
            }
            
            if (res && 'error' in res) {
                alert(`Erro: ${res.error}`);
                return;
            }
            
            // Reload feedbacks
            const resReload = await window.eel.list_feedbacks(dateString)();
            if (Array.isArray(resReload)) {
                setFeedbacks(resReload as unknown as FeedBackProducao[]);
                // Re-inicializar temp (usar strings)
                const newTempTamanho: Record<string, string> = {};
                const newTempCaixas: Record<string, string> = {};
                (resReload as unknown as FeedBackProducao[]).forEach(f => {
                    newTempTamanho[f.produto] = String(f.tamanho_da_fruta);
                    newTempCaixas[f.produto] = String(f.caixas_processadas);
                });
                setTempTamanho(newTempTamanho);
                setTempCaixas(newTempCaixas);
            }
            setFeedbackEditing(prev => ({ ...prev, [produto]: false }));
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar feedback');
        }
    };

    const handleDeleteFeedback = async (produto: string) => {
        const feedback = feedbacks.find(f => f.produto === produto);
        if (!feedback) {
            alert('Nenhum dado encontrado para esta fruta');
            return;
        }
        if (!confirm('Tem certeza que deseja apagar os dados desta fruta?')) return;

        try {
            await window.eel.delete_feedback(feedback.id)();
            // Reload feedbacks
            const resReload = await window.eel.list_feedbacks(date.toISOString().substring(0, 10))();
            if (Array.isArray(resReload)) {
                setFeedbacks(resReload as unknown as FeedBackProducao[]);
                // Re-inicializar temp
                const newTempTamanho: Record<string, string> = {};
                const newTempCaixas: Record<string, string> = {};
                (resReload as unknown as FeedBackProducao[]).forEach(f => {
                    newTempTamanho[f.produto] = String(f.tamanho_da_fruta);
                    newTempCaixas[f.produto] = String(f.caixas_processadas);
                });
                setTempTamanho(newTempTamanho);
                setTempCaixas(newTempCaixas);
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao deletar feedback');
        }
    };

    const handleEditarParada = (paradaId: string) => {
        setParadasEditing(prev => ({ ...prev, [paradaId]: true }));
    };

    useEffect(() => {
        if (!window.eel || typeof window.eel.list_extratores !== 'function') {
            console.error('Eel bridge não disponível');
            return;
        }

        // Load extratores
        window.eel.list_extratores()().then((res) => {
            if (Array.isArray(res)) {
                setExtratores(res as Extrator[]);
            } else if (res && 'error' in res) {
                console.error('Failed to fetch extratores:', res.error);
            }
        }).catch((e) => console.warn('list_extratores failed', e));

        // Load motivos
        window.eel.list_motivos()().then((res) => {
            if (Array.isArray(res)) {
                setMotivos(res as Motivo[]);
            } else if (res && 'error' in res) {
                console.error('Failed to fetch motivos:', res.error);
            }
        }).catch((e) => console.warn('list_motivos failed', e));

        // Load locais
        window.eel.list_locais()().then((res) => {
            if (Array.isArray(res)) {
                setLocais(res as Local[]);
            } else if (res && 'error' in res) {
                console.error('Failed to fetch locais:', res.error);
            }
        }).catch((e) => console.warn('list_locais failed', e));

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 2, justifyContent: 'center', pb: '150px' }}>
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
                                                const readOnly = isReadOnly(extrator.id, turno);
                                                const hasObs = !!horimetro?.observacoes;
                                                const needsValor = horimetro?.valor === 0 && hasObs;
                                                const saveDisabled = !state.editing[key];
                                                const editDisabled = !(horimetro && !state.editing[key]);
                                                 
                                                return (
                                                    <Box key={turno} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                                                            <TextField
                                                                label={turno}
                                                                variant="outlined"
                                                                type="number"
                                                                size="small"
                                                                disabled={readOnly}
                                                                value={getValorDisplay(extrator.id, turno)}
                                                                onChange={(e) => handleValorChange(extrator.id, turno, e.target.value)}
                                                                inputProps={{ inputMode: 'numeric', step: 0.01, min: 0, readOnly }}
                                                                
                                                                sx={{ flex: 1 }}
                                                                helperText={state.fieldErrors[key] ?? (needsValor ? 'Valor pendente - preencher' : '')}
                                                                error={!!state.fieldErrors[key] || needsValor}
                                                            />

                                                            <IconButton 
                                                                onClick={() => handleSave(extrator.id, turno)}
                                                                disabled={saveDisabled}
                                                                color="primary"
                                                            >
                                                                <Save />
                                                            </IconButton>
                                                            
                                                            <IconButton 
                                                                onClick={() => {
                                                                    dispatch({ type: 'ENABLE_EDIT', key });
                                                                    // Clear any previous field error when entering edit mode
                                                                    dispatch({ type: 'CLEAR_FIELD_ERROR', key });
                                                                    if (!state.tempValor[key]) {
                                                                        dispatch({ type: 'SET_TEMP_VALOR', key, value: horimetro?.valor?.toString() ?? '' });
                                                                    }
                                                                    if (horimetro?.observacoes && !state.tempObs[key]) {
                                                                        dispatch({ type: 'SET_TEMP_OBS', key, value: horimetro.observacoes });
                                                                    }
                                                                }}
                                                                disabled={editDisabled}
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
                                                                disabled={readOnly}
                                                                value={getObsDisplay(extrator.id, turno)}
                                                                onChange={(e) => handleObsChange(extrator.id, turno, e.target.value)}
                                                                helperText={state.fieldErrors[key] ?? ''}
                                                                error={!!state.fieldErrors[key]}
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
                            const tamanhoStr = tempTamanho[produto] ?? (feedback ? String(feedback.tamanho_da_fruta) : '');
                            const caixasStr = tempCaixas[produto] ?? (feedback ? String(feedback.caixas_processadas) : '');

                            const tamanhoNum = parseFloat(tamanhoStr) || 0;
                            const caixasNum = parseInt(caixasStr) || 0;
                            const isEditing = feedbackEditing[produto];

                            return (
                                <Box key={produto} sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center', padding: 2, border: '1px solid #eee', borderRadius: 1 }}>
                                    <Typography sx={{ minWidth: 100 }}>{produto}</Typography>
                                    <TextField
                                        label="Tamanho da Fruta"
                                        type="number"
                                        size="small"
                                        value={tamanhoStr}
                                        onChange={(e) => setTempTamanho(prev => ({ ...prev, [produto]: e.target.value }))}
                                        inputProps={{ step: 0.01, min: 0 }}
                                        sx={{ flex: 1 }}
                                        disabled={!isEditing}
                                    />
                                    <TextField
                                        label="Caixas Processadas"
                                        type="number"
                                        size="small"
                                        value={caixasStr}
                                        onChange={(e) => setTempCaixas(prev => ({ ...prev, [produto]: e.target.value }))}
                                        inputProps={{ min: 0 }}
                                        sx={{ flex: 1 }}
                                        disabled={!isEditing}
                                    />
                                    <Typography variant="body2" sx={{ minWidth: 100 }}>
                                        Nominal: {(() => {
                                            const totalCaixas = Object.values(tempCaixas).reduce((sum, v) => sum + (parseInt(v as string) || 0), 0);
                                            // Fórmula do Excel: ((110.909090909091*5)/B13*60*11*24)*(B14/SOMA(...))
                                            // Pela precedência do Excel: (110.909090909091*5)/B13*60*11*24 = ((110.909090909091*5)/B13)*60*11*24
                                            // = (554.545454545455/B13)*15840 = 8_784_000/B13
                                            // Resultado final: (8_784_000 / tamanho) * (caixas / totalCaixas)
                                            const FATOR = 8784000; // 110.909090909091 * 5 * 60 * 11 * 24
                                            if (tamanhoNum <= 0 || totalCaixas <= 0) return '0.00';
                                            const nominal = (FATOR / tamanhoNum) * (caixasNum / totalCaixas);
                                            console.log(`[${produto}] tamanho=${tamanhoNum}, caixas=${caixasNum}, total=${totalCaixas}, nominal=${nominal.toFixed(2)}`);
                                            return nominal.toFixed(2);
                                        })()}
                                    </Typography>
                                    <IconButton 
                                        onClick={() => setFeedbackEditing(prev => ({ ...prev, [produto]: true }))}
                                        disabled={isEditing}
                                        color="secondary"
                                    >
                                        <Edit />
                                    </IconButton>
                                    <IconButton 
                                        onClick={() => handleSalvarFeedback(produto)}
                                        disabled={!isEditing}
                                        color="primary"
                                    >
                                        <Save />
                                    </IconButton>
                                    <IconButton 
                                        onClick={() => handleDeleteFeedback(produto)}
                                        disabled={!feedback}
                                        color="error"
                                    >
                                        <Delete />
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