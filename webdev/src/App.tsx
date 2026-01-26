
import './App.css'
import Sidebar from './components/Sidebar'
import { Button, Input } from '@mui/material'
import React from 'react'

function App() {
  const [name, setName] = React.useState('')


  return (
    <Sidebar>

      <div style={{ padding: 16 }}>
        <h1>Controle de Máquinas</h1>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite seu nome"
          style={{ marginBottom: 16 }}
        />
        <br />
        <Button
          variant="contained"
          onClick={async () => {
            console.log('Botão clicado')
            console.log('window.eel existe?', !!window.eel)
            console.log('window.eel.say_hello existe?', window.eel?.say_hello)

            if (window.eel) {
              console.log('Chamando say_hello com:', name)
              const result = await window.eel.say_hello(name)
              if (typeof result === 'object' && result !== null && 'error' in result) {
                alert(`Erro: ${result.error}`)
              } else {
                // result é do tipo string
                alert(result as string)
              }
            } else {
              alert(`Hello, ${name}! (eel not connected)`)
            }
          }}
        >
          Cumprimentar
        </Button>
      </div>
       
    </Sidebar>
  )
}

export default App
