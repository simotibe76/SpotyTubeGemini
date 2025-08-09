import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Welcome from './Welcome.jsx' // Importa il nuovo componente Welcome

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Welcome /> {/* Renderizza il componente Welcome */}
  </StrictMode>,
)
