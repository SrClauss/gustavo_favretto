import { Box, Card, CardContent, Typography, Chip } from "@mui/material";
import { useEffect, useState } from 'react';

type ExtratorStatus = {
  id: string;
  numero: number;
  modelo: string;
  status: string;
  motivo_parada?: string | null;
};

export default function StatusExtratores() {
  const [extratores, setExtratores] = useState<ExtratorStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!window.eel || typeof window.eel.get_dashboard_stats !== 'function') return;
        const result = await window.eel.get_dashboard_stats('dia', new Date().toISOString().substring(0,10))();
        if (result && typeof result === 'object' && !('error' in result)) {
          setExtratores(result.status_extratores || []);
        }
      } catch (err) {
        console.error('Erro ao carregar status dos extratores', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography>Carregando...</Typography></Box>;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>Status dos Extratores</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {extratores.map((extrator) => (
          <Box sx={{ flex: '1 1 250px' }} key={extrator.id}>
            <Card sx={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: 2, borderLeft: `4px solid ${extrator.status === 'Rodando' ? '#2e7d32' : '#d32f2f'}` }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{`Extrator ${extrator.numero}`}</Typography>
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
                <Typography variant="body2" sx={{ color: '#757575' }}>{extrator.modelo}</Typography>
                {extrator.motivo_parada && (
                  <Box sx={{ backgroundColor: '#fff3e0', borderRadius: 1, p: 1, mt: 1.5, borderLeft: '3px solid #ff9800' }}>
                    <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 500 }}>{extrator.motivo_parada}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
