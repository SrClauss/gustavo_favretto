import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Horimetro from './pages/Horimetro'
import Configuracoes from './pages/Configuracoes'

function App() {
  return (
    <BrowserRouter>
      <Sidebar>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/horimetro" element={<Horimetro />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </Sidebar>
    </BrowserRouter>
  )
}

export default App
