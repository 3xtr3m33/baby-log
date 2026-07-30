import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { TYPE, field, link, primary } from '../lib/tokens.js'

// Экран для тех, у кого ещё нет семьи: создать свою или войти по коду.
export default function FamilyScreen({ t, onReady, onSignOut }) {
  const [mode, setMode] = useState('pick')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [invite, setInvite] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const create = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Как вас записывать в журнале?')
      return
    }
    setBusy(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('create_family', { p_name: name.trim() })
    setBusy(false)
    if (err) {
      setError(err.message || 'Не получилось создать семью.')
      return
    }
    setInvite(data)
  }

  const join = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Как вас записывать в журнале?')
      return
    }
    if (code.trim().length < 4) {
      setError('Код состоит из шести символов.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.rpc('join_family', {
      p_code: code.trim().toUpperCase(),
      p_name: name.trim(),
    })
    setBusy(false)
    if (err) {
      setError(
        /INVALID_CODE/i.test(err.message || '')
          ? 'Такого кода нет. Он вводится латиницей заглавными.'
          : err.message || 'Не получилось войти в семью.'
      )
      return
    }
    onReady(name.trim())
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Скопировать не вышло — перепишите код вручную.')
    }
  }

  const whatsapp = () => {
    const text = `Код для входа в наш дневник ухода: ${invite}\nОткрой ссылку ${window.location.origin} и введи его.`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  if (invite) {
    return (
      <div style={wrap(t)}>
        <h1 style={{ ...TYPE.h1, color: t.text, margin: 0 }}>Семья создана</h1>
        <p style={{ ...TYPE.body, color: t.dim, margin: 0 }}>
          Передайте этот код тем, кто будет вести журнал вместе с вами. Он всегда доступен в
          настройках.
        </p>

        <div
          style={{
            background: t.card,
            border: `1px solid ${t.line}`,
            borderRadius: 20,
            padding: '26px 18px',
            textAlign: 'center',
            ...TYPE.big,
            fontSize: 40,
            letterSpacing: 6,
            color: t.text,
          }}
        >
          {invite}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={copy} style={{ ...primary(t, false), flex: 1 }}>
            {copied ? 'Скопировано' : 'Скопировать'}
          </button>
          <button
            type="button"
            onClick={whatsapp}
            style={{
              ...primary(t, false),
              flex: 1,
              background: 'transparent',
              color: t.text,
              border: `1px solid ${t.line}`,
            }}
          >
            В WhatsApp
          </button>
        </div>

        <button type="button" onClick={() => onReady(name.trim())} style={{ ...primary(t, false) }}>
          Перейти к журналу
        </button>
        {error && <div style={{ ...TYPE.body, color: t.danger }}>{error}</div>}
      </div>
    )
  }

  return (
    <div style={wrap(t)}>
      <h1 style={{ ...TYPE.h1, color: t.text, margin: 0 }}>Ваша семья</h1>
      <p style={{ ...TYPE.body, color: t.dim, margin: 0 }}>
        Записи видят все, кто в одной семье: вы, жена, няня. Создайте новую или войдите по коду.
      </p>

      {mode === 'pick' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="button" onClick={() => setMode('create')} style={primary(t, false)}>
            Создать семью
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            style={{
              ...primary(t, false),
              background: 'transparent',
              color: t.text,
              border: `1px solid ${t.line}`,
            }}
          >
            У меня есть код
          </button>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={field(t)}
          />
          <button type="submit" disabled={busy} style={primary(t, busy)}>
            {busy ? 'Создаём…' : 'Создать'}
          </button>
          <button type="button" onClick={() => setMode('pick')} style={link(t)}>
            Назад
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={join} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus
            placeholder="Код приглашения"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            style={{ ...field(t), letterSpacing: 4, textTransform: 'uppercase' }}
          />
          <input
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={field(t)}
          />
          <button type="submit" disabled={busy} style={primary(t, busy)}>
            {busy ? 'Входим…' : 'Войти в семью'}
          </button>
          <button type="button" onClick={() => setMode('pick')} style={link(t)}>
            Назад
          </button>
        </form>
      )}

      {error && <div style={{ ...TYPE.body, color: t.danger }}>{error}</div>}

      <button type="button" onClick={onSignOut} style={{ ...link(t), marginTop: 'auto' }}>
        Выйти из аккаунта
      </button>
    </div>
  )
}

const wrap = (t) => ({
  minHeight: '100%',
  background: t.bg,
  color: t.text,
  padding: 'calc(48px + env(safe-area-inset-top)) 22px 32px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  maxWidth: 520,
  margin: '0 auto',
})
