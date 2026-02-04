import { createTheme } from '@mui/material/styles';

// Paleta Industrial Clean
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Azul profundo profissional
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ff9800', // Laranja/Âmbar de segurança
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#fff',
    },
    error: {
      main: '#d32f2f', // Vermelho para paradas/erros
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ffa726', // Amarelo para atenção
      light: '#ffb74d',
      dark: '#f57c00',
    },
    success: {
      main: '#388e3c', // Verde para operando/sucesso
      light: '#66bb6a',
      dark: '#2e7d32',
    },
    background: {
      default: '#f5f7fa', // Cinza muito claro
      paper: '#ffffff', // Cards em branco puro
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.1rem',
    },
    button: {
      fontWeight: 500,
      textTransform: 'none', // Remover caps lock automático
    },
  },
  shape: {
    borderRadius: 12, // Bordas arredondadas para widgets
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '1rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(0,0,0,0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
          borderRadius: 12,
          '&:hover': {
            boxShadow: '0px 4px 16px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
        },
        elevation2: {
          boxShadow: '0px 4px 12px rgba(0,0,0,0.12)',
        },
        elevation8: {
          boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            borderRadius: 8,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        input: {
          padding: '12px 14px', // Maior área de toque
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          backgroundColor: '#ffffff',
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: '12px', // Maior área de toque para tablets
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 72, // Maior altura para melhor usabilidade
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 80,
          padding: '8px 12px',
          '&.Mui-selected': {
            fontSize: '0.85rem',
          },
        },
        label: {
          fontSize: '0.75rem',
          '&.Mui-selected': {
            fontSize: '0.85rem',
            fontWeight: 600,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '16px',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#f5f7fa',
        },
      },
    },
  },
});

export default theme;
