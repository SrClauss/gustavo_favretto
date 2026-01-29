import { Box, Card, CardContent, Typography, Grid, Select, MenuItem, FormControl, InputLabel, CircularProgress, Chip } from "@mui/material";
import { useEffect, useState } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import FactoryIcon from '@mui/icons-material/Factory';

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

    useEffect(() => {
        loadDashboard();
    }, [periodo, data]);

    const loadDashboard = async () => {
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
    };

    const getStatusColor = (status: string) => {
        return status === 'Rodando' ? 'success' : 'error';
    };

    const getEfficiencyColor = (value: number) => {
        if (value >= 90) return 'success';
        if (value >= 75) return 'warning';
        return 'error';
    };

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
                
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel>Período</InputLabel>
                            <Select value={periodo} label="Período" onChange={(e) => setPeriodo(e.target.value)}>
                                <MenuItem value="dia">Dia</MenuItem>
                                <MenuItem value="semana">Semana</MenuItem>
                                <MenuItem value="mes">Mês</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
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
                    </Grid>
                </Grid>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography color="textSecondary" variant="body2" sx={{ fontWeight: 500 }}>
                                    Total Caixas
                                </Typography>
                                <TrendingUpIcon sx={{ color: 'primary.main', opacity: 0.3, fontSize: 40 }} />
                            </Box>
                            <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {stats.summary.total_caixas.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography color="textSecondary" variant="body2" sx={{ fontWeight: 500 }}>
                                    Eficiência Nominal
                                </Typography>
                                <CheckCircleIcon sx={{ color: getEfficiencyColor(stats.summary.eficiencia_nominal) + '.main', opacity: 0.3, fontSize: 40 }} />
                            </Box>
                            <Typography variant="h3" sx={{ fontWeight: 700, color: getEfficiencyColor(stats.summary.eficiencia_nominal) + '.main' }}>
                                {stats.summary.eficiencia_nominal.toFixed(1)}%
                            </Typography>
                            <Chip 
                                label={stats.summary.eficiencia_nominal >= 90 ? 'Excelente' : stats.summary.eficiencia_nominal >= 75 ? 'Bom' : 'Atenção'} 
                                color={getEfficiencyColor(stats.summary.eficiencia_nominal)}
                                size="small"
                                sx={{ mt: 0.5 }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography color="textSecondary" variant="body2" sx={{ fontWeight: 500 }}>
                                    Disponibilidade
                                </Typography>
                                <AccessTimeIcon sx={{ color: 'success.main', opacity: 0.3, fontSize: 40 }} />
                            </Box>
                            <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                                {stats.summary.disponibilidade.toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {stats.summary.horas_trabalhadas.toFixed(1)}h trabalhadas
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography color="textSecondary" variant="body2" sx={{ fontWeight: 500 }}>
                                    Tempo Parado
                                </Typography>
                                <WarningIcon sx={{ color: 'error.main', opacity: 0.3, fontSize: 40 }} />
                            </Box>
                            <Typography variant="h3" sx={{ fontWeight: 700, color: 'error.main' }}>
                                {stats.summary.horas_paradas.toFixed(1)}h
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography color="textSecondary" variant="body2" sx={{ fontWeight: 500 }}>
                                    Capacidade Nominal
                                </Typography>
                                <FactoryIcon sx={{ color: 'info.main', opacity: 0.3, fontSize: 40 }} />
                            </Box>
                            <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                                {stats.summary.capacidade_nominal.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                caixas/hora
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        Status dos Extratores
                    </Typography>
                    <Grid container spacing={2}>
                        {stats.status_extratores.map((extrator) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={extrator.id}>
                                <Card 
                                    variant="outlined" 
                                    sx={{ 
                                        borderColor: extrator.status === 'Rodando' ? 'success.main' : 'error.main',
                                        borderWidth: 2,
                                    }}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="h6">Extrator {extrator.numero}</Typography>
                                            <Chip label={extrator.status} color={getStatusColor(extrator.status)} size="small" />
                                        </Box>
                                        <Typography variant="body2" color="textSecondary">{extrator.modelo}</Typography>
                                        {extrator.motivo_parada && (
                                            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'error.dark' }}>
                                                {extrator.motivo_parada}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                        Top 5 Motivos de Parada
                    </Typography>
                    {stats.top_motivos_parada.length === 0 ? (
                        <Typography color="textSecondary">Nenhuma parada registrada</Typography>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {stats.top_motivos_parada.map((motivo, index) => (
                                <Box key={index}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                {index + 1}. {motivo.motivo}
                                            </Typography>
                                            <Chip label={motivo.classificacao} size="small" variant="outlined" />
                                        </Box>
                                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>
                                            {(motivo.tempo_total_minutos / 60).toFixed(1)}h
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ flex: 1, backgroundColor: '#eee', borderRadius: 1, height: 24 }}>
                                            <Box 
                                                sx={{ 
                                                    height: '100%', 
                                                    backgroundColor: 'error.main',
                                                    width: `${Math.min((motivo.tempo_total_minutos / Math.max(...stats.top_motivos_parada.map(m => m.tempo_total_minutos))) * 100, 100)}%`,
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="textSecondary">
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