import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import './index.css'
import App from './App.tsx'

const theme = createTheme({
  spacing: 4,
  palette: {
    primary: {
      main: '#1f3d5c',
    },
    secondary: {
      main: '#b36b41',
    },
    error: {
      main: '#b24a3a',
    },
    background: {
      default: '#f5f1e8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'].join(','),
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          minHeight: 34,
          padding: '0.5rem 0.9rem',
          boxShadow: 'none',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          textTransform: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
          },
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
