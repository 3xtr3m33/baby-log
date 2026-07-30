import { useState } from 'react'
import { isConfigured, supabase } from '../lib/supabase.js'
import { TYPE, field, link, primary } from '../lib/tokens.js'

// Вход по коду из письма, без паролей.
export default function AuthScreen({ t }) {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const sendCode = async (e) => {
    e.preventDefault()
    if (!isConfigured) return
    const value = email.trim().toLowerCase()
    if (!value.includes('@')) {
      setError('Проверьте адрес почты.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: value,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (err) {
      setError(err.message || 'Не удалось отправить письмо. Попробуйте ещё раз.')
      return
    }
    setEmail(value)
    setStep('code')
  }

  const verify = async (e) => {
    e.preventDefault()
    const token = code.trim()
    if (token.length < 6) {
      setError('Код состоит из шести цифр.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    setBusy(false)
    if (err) {
      setError('Код не подошёл. Проверьте цифры или запросите новый.')
      return
    }
    // Дальше всё решает App: появилась сессия — он покажет следующий экран.
  }

  return (
    <div style={wrap(t)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={bar(t.accent.feed, 34)} />
          <span style={bar(t.accent.diaper, 26)} />
          <span style={bar(t.accent.sleep, 18)} />
        </div>
        <h1 style={{ ...TYPE.h1, color: t.text, margin: 0 }}>Дневник ухода</h1>
        <p style={{ ...TYPE.body, color: t.dim, margin: 0 }}>
          {step === 'email'
            ? 'Введите почту — пришлём код для входа. Пароль придумывать не нужно.'
            : `Код отправили на ${email}. Введите шесть цифр из письма.`}
        </p>
      </div>

      {!isConfigured && (
        <div
          style={{
            ...TYPE.body,
            color: t.text,
            background: t.card,
            border: `1px solid ${t.accent.feed}`,
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span style={{ fontWeight: 600 }}>Ключи Supabase не заданы</span>
          <span style={{ ...TYPE.caption, color: t.dim }}>
            Впишите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в файл .env.local и перезапустите
            npm run dev. До этого вход работать не будет.
          </span>
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="почта@пример.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field(t)}
          />
          <button type="submit" disabled={busy || !isConfigured} style={primary(t, busy || !isConfigured)}>
            {busy ? 'Отправляем…' : 'Получить код'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={{ ...field(t), letterSpacing: 8, textAlign: 'center', fontSize: 24 }}
          />
          <button type="submit" disabled={busy} style={primary(t, busy)}>
            {busy ? 'Проверяем…' : 'Войти'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setCode('')
              setError(null)
            }}
            style={link(t)}
          >
            Изменить почту
          </button>
        </form>
      )}

      {error && <div style={{ ...TYPE.body, color: t.danger }}>{error}</div>}
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
  gap: 28,
  maxWidth: 520,
  margin: '0 auto',
})

const bar = (color, h) => ({ width: 8, height: h, borderRadius: 4, background: color })
