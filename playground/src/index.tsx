import './index.scss'
import './polyfill'
import './tdesign.fix.d'

import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

createRoot(document.getElementById('app')!)
  .render(<React.StrictMode>
    <App />
  </React.StrictMode>)
