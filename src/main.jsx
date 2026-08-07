import React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'

// Новая версия должна доезжать до телефона сама: иначе на экране месяцами
// живёт старый закэшированный бандл, а человек уверен, что смотрит свежий.
// Перезагружаем только когда вкладка не на виду или запись не идёт —
// выдёргивать интерфейс из-под пальца в момент нажатия нельзя.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const reload = () => updateSW(true)
    if (document.visibilityState === 'hidden') reload()
    else document.addEventListener('visibilitychange', function once() {
      if (document.visibilityState !== 'hidden') return
      document.removeEventListener('visibilitychange', once)
      reload()
    })
  },
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
