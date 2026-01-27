



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
  { label: 'Início', icon: 'Home', to: '/' },
  { label: 'Lançamentos', icon: 'List', to: '/transactions' },
  {label: 'Cadastros', icon: 'Settings', to: '/config' },
]

export default function NavLayout({ children }: { children?: React.ReactNode }) {
  return (
    <Box sx={{ pb: { xs: 7, sm: 0 } }}>
      <main>{children ?? <Outlet />}</main>
      <TabNav items={NAVIGATION_ITEMS} />
    </Box>
  )
}
