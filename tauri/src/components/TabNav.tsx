import React, { useMemo } from 'react'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Paper from '@mui/material/Paper'
import { useLocation, useNavigate } from 'react-router-dom'
import * as MuiIcons from '@mui/icons-material'

export type NavItem = {
  label: string
  icon: React.ReactElement | string // allow either an imported React element or the icon name string
  to: string
}

function resolveIcon(icon: React.ReactElement | string) {
  if (typeof icon !== 'string') return icon
  const iconsMap = MuiIcons as unknown as Record<string, React.ComponentType<unknown>>
  const IconComponent = iconsMap[icon]
  if (!IconComponent) return null
  return <IconComponent />
}

export default function TabNav({ items }: { items: NavItem[] }) {
  const location = useLocation()
  const navigate = useNavigate()

  // compute selected value from location pathname
  const value = useMemo(() => {
    const idx = items.findIndex((it) => it.to === location.pathname)
    return idx >= 0 ? idx : 0
  }, [location.pathname, items])

  return (
    <Paper
      elevation={8}
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1100
      }}
    >
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, newValue) => {
          const to = items[newValue]?.to
          if (to) navigate(to)
        }}
      >
        {items.map((it) => (
          <BottomNavigationAction
            key={it.to}
            label={it.label}
            icon={resolveIcon(it.icon)}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}
