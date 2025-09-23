import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'


const rootElement = document.getElementById('root') as HTMLElement
if (!rootElement) {
    throw new Error('No se encontró el elemento #root en index.html')
}

createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
