



import React from 'react'
import Box from '@mui/material/Box'
import { Outlet } from 'react-router-dom'
import TabNav, { type NavItem } from './TabNav'

/**
 * Configuração de navegação — edite este array diretamente para ajustar as abas
 * - `label`: texto exibido
 * - `icon`: pode ser um componente React (ex.: `<HomeIcon />`) ou o nome do ícone como string (ex.: `'Home'`)
 * - `to`: rota
 */
const NAVIGATION_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'Dashboard', to: '/' },
  { label: 'Lançamentos', icon: 'PlaylistAdd', to: '/transactions' },
  { label: 'Relatórios', icon: 'Assessment', to: '/reports' },
  { label: 'Cadastros', icon: 'Settings', to: '/config' },
]

export default function NavLayout({ children }: { children?: React.ReactNode }) {
  return (
    <Box sx={{ pb: '100px', minHeight: '100vh' }}>
      <main>{children ?? <Outlet />}</main>
      <TabNav items={NAVIGATION_ITEMS} />
    </Box>
  )
}
