import { Edit, Save, Comment } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Box, IconButton, Input, TextField, Typography, Badge } from "@mui/material";
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

    const [date, setDate] = useState(new Date());
    const [extratores, setExtratores] = useState<Extrator[]>([]);
    const [state, dispatch] = useReducer(horimetroReducer, initialState);

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
        const payload: any = {
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

    useEffect(() => {
        // Load extratores
        window.eel.list_extratores()().then((res) => {
            if (Array.isArray(res)) {
                setExtratores(res as Extrator[]);
            } else if (res && 'error' in res) {
                console.error('Failed to fetch extratores:', res.error);
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
            <Box>
                <Input type="date" value={date.toISOString().substring(0, 10)} onChange={(e) => setDate(new Date(e.target.value))} />
            </Box>

            <div>{JSON.stringify(state.horimetros)}</div>
            <div>{JSON.stringify(extratores)}</div>
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

            
        </Box >
    )
}