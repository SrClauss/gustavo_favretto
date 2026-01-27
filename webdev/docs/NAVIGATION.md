# Tab Navigation (mobile-like) — configuração

Este projeto inclui um componente `TabNav` que simula uma tabbar mobile (Bottom Navigation) e um `NavLayout` que o utiliza.

## Como configurar as páginas

A configuração padrão agora fica diretamente em `src/components/NavLayout.tsx` no array `NAVIGATION_ITEMS`. Edite esse array para ajustar as abas:

```ts
// src/components/NavLayout.tsx
const NAVIGATION_ITEMS = [
  { label: 'Início', icon: 'Home', to: '/' },
  { label: 'Perfil', icon: 'Person', to: '/profile' },
]
```

- `label`: texto exibido na aba
- `icon`: pode ser um componente React (ex.: `<HomeIcon />`) ou o nome do ícone como string (ex.: `'Home'`). O `TabNav` resolve strings via `@mui/icons-material`.
- `to`: rota (string)

> Observação: se preferir manter a configuração em outro arquivo, ainda pode **exportar** um array de `NavItem` e importar/usar no `NavLayout`.

## Uso

O `NavLayout` já passa `NAVIGATION_ITEMS` para o `TabNav`. Para sobrescrever dinamicamente, basta passar `items` como prop para `TabNav`:

```tsx
<TabNav items={myCustomItems} />
```

## Estilo
O `TabNav` é renderizado em `position: fixed; bottom: 0;` — `NavLayout` aplica um `padding-bottom` para evitar que o conteúdo seja coberto pela barra.
