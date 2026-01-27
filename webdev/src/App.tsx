

import './App.css'
import NavLayout from './components/NavLayout'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Config from './pages/Config'


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
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}

export default App
