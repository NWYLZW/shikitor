import '@shikitor/react/index.css'

import { Editor } from '@shikitor/react'
import React from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('app')!)
  .render(
    <React.StrictMode>
      <Editor />
    </React.StrictMode>
  )
