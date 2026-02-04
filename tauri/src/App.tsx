

import './App.css'
import NavLayout from './components/NavLayout'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Config from './pages/Config'
import LancamentoRapido from './pages/LancamentoRapido'
import Reports from './pages/Reports'
import StatusExtratores from './pages/StatusExtratores'


function Search() {
  return <div style={{ padding: 16 }}>Pesquisar</div>
}
function Profile() {
  return <div style={{ padding: 16 }}>Perfil</div>
}
function Settings() {
  return <div style={{ padding: 16 }}>Ajustes</div>
}

function App() {
  return (
    <Routes>
      <Route element={<NavLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/config" element={<Config />} />
        <Route path="/transactions" element={<LancamentoRapido />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/status-extratores" element={<StatusExtratores />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}

export default App
