import React, { useEffect, useCallback } from 'react'
import { styled, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material'
import MuiDrawer from '@mui/material/Drawer'
import MuiAppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import List from '@mui/material/List'
import CssBaseline from '@mui/material/CssBaseline'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Divider from '@mui/material/Divider'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SettingsIcon from '@mui/icons-material/Settings'
import Tooltip from '@mui/material/Tooltip'
import { Link, useLocation } from 'react-router-dom'

const drawerWidth = 240

const openedMixin = (theme: Theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden' as const,
})

const closedMixin = (theme: Theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden' as const,
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
})

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })< { open?: boolean } >(
  ({ theme, open }: { theme: Theme; open?: boolean }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  })
)

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme }: { theme: Theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}))


export default function Sidebar({ children }: { children?: React.ReactNode }) {
  const theme = useTheme()
  const [open, setOpen] = React.useState(false)
  const location = useLocation()

  const handleDrawerOpen = () => setOpen(true)
  const handleDrawerClose = () => setOpen(false)

  // close drawer on Escape for accessibility and focus first item when opening

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      window.addEventListener('keydown', onKey)
      // focus first item after a brief tick so it exists in DOM
      setTimeout(() => (document.querySelector('[data-first-nav]') as HTMLElement | null)?.focus(), 80)
    }
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Horímetro', icon: <ScheduleIcon />, path: '/horimetro' },
    { text: 'Configurações', icon: <SettingsIcon />, path: '/configuracoes' },
  ]
  
  const renderItem = useCallback((item: typeof menuItems[0], index: number) => (
    <ListItem key={item.text} disablePadding>
      <ListItemButton
        component={Link}
        to={item.path}
        selected={location.pathname === item.path}
        sx={{ pl: 2 }}
        aria-label={`Abrir ${item.text}`}
        role="menuitem"
        {...(index === 0 ? { 'data-first-nav': 'true' } : {})}
      >
        <ListItemIcon aria-hidden>
          {item.icon}
        </ListItemIcon>
        <ListItemText primary={item.text} />
      </ListItemButton>
    </ListItem>
  ), [location.pathname])


  return (
    <div style={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={open ? { marginLeft: drawerWidth, width: `calc(100% - ${drawerWidth}px)` } : undefined}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Controle - Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={open}
        role="navigation"
        aria-label="Sidebar navigation"
      >
        <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}>
          <Tooltip title="Fechar">
            <IconButton onClick={handleDrawerClose} aria-label="Fechar barra lateral">
              {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
        <Divider />
        <List role="menu" aria-label="Seções">
          {menuItems.map((item, index) => renderItem(item, index))}
        </List>
      </Drawer>

      <main style={{ flexGrow: 1, padding: 24 }}>
        <Toolbar />
        {children}
      </main>
    </div>
  )
}
