import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Select, MenuItem, FormControl, InputLabel, Button, Chip } from "@mui/material";
import { useState, useEffect } from 'react';
import DownloadIcon from '@mui/icons-material/Download';

type Parada = {
    id: string;
    data: string;
    motivo: string;
    hora_inicio?: string;
    hora_fim?: string;
    local_parada: string;
    observacoes?: string;
    extratores_parados: string[];
    duracao_minutos?: number;
    extrator_id?: string;
    turno?: string;
};

type Motivo = { id: string; descricao: string; classificacao: string };
type Local = { id: string; descricao: string };
type Extrator = { id: string; numero: number; modelo: string };

export default function Reports() {
    const [paradas, setParadas] = useState<Parada[]>([]);
    const [motivos, setMotivos] = useState<Motivo[]>([]);
    const [locais, setLocais] = useState<Local[]>([]);
    const [extratores, setExtratores] = useState<Extrator[]>([]);
    
    const [dataInicio, setDataInicio] = useState<string>(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
    const [dataFim, setDataFim] = useState<string>(() => new Date().toISOString().substring(0, 10));
    const [filtroMotivo, setFiltroMotivo] = useState<string>('');
    const [filtroExtrator, setFiltroExtrator] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [motivosRes, locaisRes, extratoresRes] = await Promise.all([
                    window.eel.list_motivos()(),
                    window.eel.list_locais()(),
                    window.eel.list_extratores()()
                ]);

                if (Array.isArray(motivosRes)) setMotivos(motivosRes as Motivo[]);
                if (Array.isArray(locaisRes)) setLocais(locaisRes as Local[]);
                if (Array.isArray(extratoresRes)) setExtratores(extratoresRes as Extrator[]);
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadParadas = async () => {
            try {
                const res = await window.eel.list_paradas()();
                if (Array.isArray(res)) {
                    let paradasFiltradas = (res as Parada[]).map(r => ({
                        id: r.id,
                        data: r.data,
                        motivo: r.motivo,
                        hora_inicio: r.hora_inicio,
                        hora_fim: r.hora_fim,
                        local_parada: r.local_parada,
                        observacoes: r.observacoes,
                        extratores_parados: r.extratores_parados ?? (r.extrator_id ? [r.extrator_id] : []),
                        duracao_minutos: typeof r.duracao_minutos === 'number' ? r.duracao_minutos : undefined,
                    })) as Parada[];
                    
                    // Filtrar por data
                    paradasFiltradas = paradasFiltradas.filter(p => 
                        p.data >= dataInicio && p.data <= dataFim
                    );

                    // Filtrar por motivo
                    if (filtroMotivo) {
                        paradasFiltradas = paradasFiltradas.filter(p => p.motivo === filtroMotivo);
                    }

                    // Filtrar por extrator
                    if (filtroExtrator) {
                        paradasFiltradas = paradasFiltradas.filter(p => 
                            p.extratores_parados.includes(filtroExtrator)
                        );
                    }

                    setParadas(paradasFiltradas);
                }
            } catch (err) {
                console.error('Erro ao carregar paradas:', err);
            }
        };
        loadParadas();
    }, [dataInicio, dataFim, filtroMotivo, filtroExtrator]);

    const calcularDuracao = (inicio: string, fim: string): number => {
        try {
            const [h1, m1] = inicio.split(':').map(Number);
            const [h2, m2] = fim.split(':').map(Number);
            const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
            return minutos;
        } catch {
            return 0;
        }
    };

    const calcularDuracaoFromParada = (p: Parada): number => {
        if (typeof p.duracao_minutos === 'number') return p.duracao_minutos;
        if (p.hora_inicio && p.hora_fim) return calcularDuracao(p.hora_inicio, p.hora_fim);
        return 0;
    };

    const exportarCSV = () => {
        const headers = ['Data', 'Extratores', 'Motivo', 'Início', 'Fim', 'Duração (min)', 'Local', 'Observações'];
        const rows = paradas.map(p => {
            const extratoresNomes = p.extratores_parados.map(id => {
                const ext = extratores.find(e => e.id === id);
                return ext ? `Ext ${ext.numero}` : id;
            }).join(', ');

            const motivoDesc = motivos.find(m => m.id === p.motivo)?.descricao || p.motivo;
            const localDesc = locais.find(l => l.id === p.local_parada)?.descricao || p.local_parada;
            const duracao = calcularDuracaoFromParada(p);

            return [
                p.data,
                extratoresNomes,
                motivoDesc,
                p.hora_inicio || '-',
                p.hora_fim || '-',
                duracao.toString(),
                localDesc,
                p.observacoes || ''
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_paradas_${dataInicio}_${dataFim}.csv`;
        link.click();
    };

    const getClassificacaoColor = (classificacao: string) => {
        if (classificacao === 'Disponibilidade') return 'error';
        if (classificacao === 'Performance') return 'warning';
        if (classificacao === 'Qualidade') return 'info';
        return 'default';
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
                Relatórios de Paradas
            </Typography>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
                        <TextField
                            label="Data Início"
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            label="Data Fim"
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: 1 }}
                        />
                        <FormControl sx={{ flex: 1 }}>
                            <InputLabel>Motivo</InputLabel>
                            <Select
                                value={filtroMotivo}
                                label="Motivo"
                                onChange={(e) => setFiltroMotivo(e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {motivos.map(m => (
                                    <MenuItem key={m.id} value={m.id}>{m.descricao}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl sx={{ flex: 1 }}>
                            <InputLabel>Extrator</InputLabel>
                            <Select
                                value={filtroExtrator}
                                label="Extrator"
                                onChange={(e) => setFiltroExtrator(e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {extratores.map(e => (
                                    <MenuItem key={e.id} value={e.id}>Extrator {e.numero}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={exportarCSV}
                            sx={{ height: 56 }}
                        >
                            Exportar CSV
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Total de Paradas: {paradas.length}
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Extratores</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Motivo</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Início</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Fim</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Duração</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Local</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Observações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paradas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            <Typography color="textSecondary">Nenhuma parada encontrada</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paradas.map((parada) => {
                                        const duracao = calcularDuracaoFromParada(parada);
                                        const motivoObj = motivos.find(m => m.id === parada.motivo);
                                        const localObj = locais.find(l => l.id === parada.local_parada);
                                        
                                        return (
                                            <TableRow key={parada.id}>
                                                <TableCell>{parada.data}</TableCell>
                                                <TableCell>
                                                    {parada.extratores_parados.map(id => {
                                                        const ext = extratores.find(e => e.id === id);
                                                        return ext ? `Ext ${ext.numero}` : '';
                                                    }).join(', ')}
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2">{motivoObj?.descricao || parada.motivo}</Typography>
                                                        {motivoObj && (
                                                            <Chip 
                                                                label={motivoObj.classificacao} 
                                                                size="small" 
                                                                color={getClassificacaoColor(motivoObj.classificacao)}
                                                                sx={{ mt: 0.5 }}
                                                            />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{parada.hora_inicio}</TableCell>
                                                <TableCell>{parada.hora_fim}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={`${duracao} min`} 
                                                        color={duracao > 60 ? 'error' : 'default'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{localObj?.descricao || parada.local_parada}</TableCell>
                                                <TableCell>{parada.observacoes || '-'}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}
