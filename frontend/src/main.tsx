import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const root = document.getElementById('root') as HTMLElement
if (!root) throw new Error('No se encontró #root')

createRoot(root).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
