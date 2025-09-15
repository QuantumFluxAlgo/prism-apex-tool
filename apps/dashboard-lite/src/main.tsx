import { createRoot } from 'react-dom/client'
import { App } from './ui/App.js'

const el = document.getElementById('root')!
createRoot(el).render(<App />)
