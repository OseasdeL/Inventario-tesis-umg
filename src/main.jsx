import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './ThemeContext.jsx' // <-- Importas el proveedor

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider> {/* <-- Envuelves la App */}
      <App />
    </ThemeProvider>
  </StrictMode>,
)