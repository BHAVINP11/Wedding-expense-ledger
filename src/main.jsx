import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const pointerFine = window.matchMedia('(pointer: fine)')
const applyCursorPreference = () => {
  document.documentElement.classList.toggle('has-custom-cursor', pointerFine.matches)
}

applyCursorPreference()
pointerFine.addEventListener?.('change', applyCursorPreference)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
