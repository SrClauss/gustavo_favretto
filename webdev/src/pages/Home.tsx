import { Box, Card, CardContent, Typography, Select, MenuItem, FormControl, InputLabel, CircularProgress, Chip } from "@mui/material";
import { useEffect, useState, useCallback, useMemo } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import FactoryIcon from '@mui/icons-material/Factory';
import KPI from "../components/KPI";

// Estilos globais mínimos
const globalStyles = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

if (typeof document !== 'undefined' && !document.getElementById('kpi-styles')) {
    const style = document.createElement('style');
    style.id = 'kpi-styles';
    style.textContent = globalStyles;
    document.head.appendChild(style);
}

type DashboardStats = {
    periodo: string;
    data_inicio: string;
    data_fim: string;
    summary: {
        total_caixas: number;
        capacidade_nominal: number;
        eficiencia_nominal: number;
        horas_trabalhadas: number;
        horas_paradas: number;
        minutos_parados: number;
        disponibilidade: number;
    };
    status_extratores: Array<{
        id: string;
        numero: number;
        modelo: string;
        status: string;
        motivo_parada: string | null;
    }>;
    top_motivos_parada: Array<{
        motivo: string;
        classificacao: string;
        quantidade: number;
        tempo_total_minutos: number;
    }>;
};

export default function Home() {
    const [periodo, setPeriodo] = useState<string>('dia');
    const [data, setData] = useState<string>(new Date().toISOString().substring(0, 10));
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            if (!window.eel || typeof window.eel.get_dashboard_stats !== 'function') {
                console.error('Eel bridge não disponível');
                return;
            }

            const result = await window.eel.get_dashboard_stats(periodo, data)();

            if (result && typeof result === 'object' && !('error' in result)) {
                setStats(result as DashboardStats);
            } else {
                console.error('Erro ao carregar dashboard:', result);
            }
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    }, [periodo, data]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const horasParadasPorClassificacao = useMemo(() => {
        if (!stats) return { Disponibilidade: 0, Performance: 0, Qualidade: 0 };
        const grouped = stats.top_motivos_parada.reduce((acc, item) => {
            acc[item.classificacao] = (acc[item.classificacao] || 0) + item.tempo_total_minutos / 60; // converter para horas
            return acc;
        }, {} as Record<string, number>);
        return {
            Disponibilidade: grouped['Disponibilidade'] || 0,
            Performance: grouped['Performance'] || 0,
            Qualidade: grouped['Qualidade'] || 0,
        };
    }, [stats]);

    const kpiMetrics = useMemo(() => {
        if (!stats) return { totalParadas: 0, tempoProdutivo: 0, faltaApontar: 0, totalHoras: 0 };

        const totalParadas = stats.top_motivos_parada.reduce((s, it) => s + (it.quantidade || 0), 0);

        const horas_trabalhadas = Number(stats.summary.horas_trabalhadas || 0);
        const horas_paradas = Number(stats.summary.horas_paradas || 0);
        const tempoProdutivo = Math.max(0, horas_trabalhadas - horas_paradas);

        const faltaApontar = stats.top_motivos_parada.reduce((s, it) => {
            const m = (it.motivo || '').toLowerCase();
            if (m.includes('apont') || m.includes('choko') || m.includes('chokotei')) return s + (it.quantidade || 0);
            return s;
        }, 0);

        const totalHoras = horas_trabalhadas + horas_paradas;

        return { totalParadas, tempoProdutivo, faltaApontar, totalHoras };
    }, [stats]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!stats) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">Sem dados disponíveis</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
                    Dashboard Operacional
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <FormControl fullWidth>
                            <InputLabel>Período</InputLabel>
                            <Select value={periodo} label="Período" onChange={(e) => setPeriodo(e.target.value)}>
                                <MenuItem value="dia">Dia</MenuItem>
                                <MenuItem value="semana">Semana</MenuItem>
                                <MenuItem value="mes">Mês</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <FormControl fullWidth>
                            <input
                                type="date"
                                value={data}
                                onChange={(e) => setData(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '16.5px 14px',
                                    fontSize: '1rem',
                                    fontFamily: 'inherit',
                                    border: '1px solid rgba(0, 0, 0, 0.23)',
                                    borderRadius: '8px',
                                }}
                            />
                        </FormControl>
                    </Box>
                </Box>
            </Box>


            <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Box sx={{ flex: '0 0 20%' }}>
                    <KPI
                        title="Total Paradas"
                        value={`${kpiMetrics.totalParadas}`}
                        icon={<WarningIcon />}
                        color="error"
                        bottomText="Ocorrências" 
                    />
                </Box>
                <Box sx={{ flex: '0 0 20%' }}>
                    <KPI
                        title="Tempo Produtivo"
                        value={`${kpiMetrics.tempoProdutivo.toFixed(1)}h`}
                        icon={<TrendingUpIcon />}
                        color="success"
                        bottomText="Horas efetivas"
                    />
                </Box>
                <Box sx={{ flex: '0 0 20%' }}>
                    <KPI
                        title="Falta Apontar / Chokotei"
                        value={`${kpiMetrics.faltaApontar}`}
                        icon={<WarningIcon />}
                        color="warning"
                        bottomText="Ajustes pendentes"
                    />
                </Box>
                <Box sx={{ flex: '0 0 20%' }}>
                    <KPI
                        title="Total de Horas"
                        value={`${kpiMetrics.totalHoras.toFixed(1)}h`}
                        icon={<AccessTimeIcon />}
                        color="primary"
                        bottomText="Horas totais"
                    />
                </Box>

            </Box>
                <Box sx={{ flex: '0 0 20%' }}>
                    <KPI
                        title="Paradas - Disponibilidade"
                        value={`${horasParadasPorClassificacao.Disponibilidade.toFixed(1)}h`}
                        icon={<AccessTimeIcon />}
                        color="error"
                        bottomText="Tempo perdido"
                    />
                </Box>
                <Box sx={{ flex: '0 0 20%' }}>
                    <KPI
                        title="Paradas - Performance"
                        value={`${horasParadasPorClassificacao.Performance.toFixed(1)}h`}
                        icon={<WarningIcon />}
                        color="warning"
                        bottomText="Ineficiências"
                    />
                </Box>
                <Box sx={{ flex: '0 0 20%' }}>
                    <KPI
                        title="Paradas - Qualidade"
                        value={`${horasParadasPorClassificacao.Qualidade.toFixed(1)}h`}
                        icon={<CheckCircleIcon />}
                        color="info"
                        bottomText="Problemas de qualidade"
                    />
                </Box>
                <Box sx={{ flex: '0 0 20%' }}>
                    <KPI
                        title="Capacidade Nominal"
                        value={stats.summary.capacidade_nominal}
                        icon={<FactoryIcon />}
                        color="primary"
                        bottomText="Caixas processadas"
                    />
                </Box>
            </Box>
             
            <Card sx={{
                mb: 4,
                backgroundColor: '#fafafa',
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                boxShadow: 'none'
            }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#424242', fontSize: '1.1rem' }}>
                        Status dos Extratores
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5 }}>
                        {stats.status_extratores.map((extrator) => (
                            <Box sx={{ flex: '1 1 250px' }} key={extrator.id}>
                                <Card
                                    sx={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        borderLeft: `4px solid ${extrator.status === 'Rodando' ? '#2e7d32' : '#d32f2f'}`,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                            transform: 'translateY(-2px)',
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#424242' }}>
                                                Extrator {extrator.numero}
                                            </Typography>
                                            <Chip
                                                label={extrator.status}
                                                size="small"
                                                sx={{
                                                    backgroundColor: extrator.status === 'Rodando' ? '#e8f5e9' : '#ffebee',
                                                    color: extrator.status === 'Rodando' ? '#2e7d32' : '#d32f2f',
                                                    fontWeight: 600,
                                                    fontSize: '0.7rem',
                                                    height: 22
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: '#757575', mb: 1 }}>
                                            {extrator.modelo}
                                        </Typography>
                                        {extrator.motivo_parada && (
                                            <Box sx={{
                                                backgroundColor: '#fff3e0',
                                                borderRadius: 1,
                                                p: 1,
                                                mt: 1.5,
                                                borderLeft: '3px solid #ff9800'
                                            }}>
                                                <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 500, lineHeight: 1.4 }}>
                                                    {extrator.motivo_parada}
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{
                backgroundColor: '#fafafa',
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                boxShadow: 'none'
            }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#424242', fontSize: '1.1rem' }}>
                        Top 5 Motivos de Parada
                    </Typography>
                    {stats.top_motivos_parada.length === 0 ? (
                        <Box sx={{
                            textAlign: 'center',
                            py: 6,
                            backgroundColor: '#fff',
                            border: '1px dashed #bdbdbd',
                            borderRadius: 2
                        }}>
                            <Typography sx={{ color: '#9e9e9e', fontWeight: 500 }}>
                                Nenhuma parada registrada
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {stats.top_motivos_parada.map((motivo, index) => (
                                <Box key={index} sx={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 2,
                                    p: 2.5,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                        borderColor: '#bdbdbd',
                                    }
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1 }}>
                                            <Box sx={{
                                                backgroundColor: '#f5f5f5',
                                                border: '2px solid #e0e0e0',
                                                borderRadius: '50%',
                                                minWidth: 28,
                                                height: 28,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: '0.875rem',
                                                color: '#616161'
                                            }}>
                                                {index + 1}
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#424242', mb: 0.75 }}>
                                                    {motivo.motivo}
                                                </Typography>
                                                <Chip
                                                    label={motivo.classificacao}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: '#f5f5f5',
                                                        color: '#616161',
                                                        fontWeight: 500,
                                                        fontSize: '0.7rem',
                                                        height: 22
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#d32f2f', fontSize: '1.25rem' }}>
                                            {(motivo.tempo_total_minutos / 60).toFixed(1)}h
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{
                                            flex: 1,
                                            backgroundColor: '#f5f5f5',
                                            borderRadius: 1,
                                            height: 8,
                                            overflow: 'hidden'
                                        }}>
                                            <Box
                                                sx={{
                                                    height: '100%',
                                                    backgroundColor: '#d32f2f',
                                                    width: `${Math.min((motivo.tempo_total_minutos / Math.max(...stats.top_motivos_parada.map(m => m.tempo_total_minutos))) * 100, 100)}%`,
                                                    borderRadius: 1,
                                                    transition: 'width 0.6s ease-out'
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: '#757575', fontWeight: 500, minWidth: 'fit-content' }}>
                                            {motivo.quantidade} ocorrências
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}