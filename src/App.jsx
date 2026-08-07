import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import * as db from './lib/db.js'
import * as sync from './lib/sync.js'
import { THEMES, TYPE } from './lib/tokens.js'
import { LOCAL_ONLY, LOCAL_FAMILY_ID } from './lib/mode.js'
import AuthScreen from './screens/AuthScreen.jsx'
import FamilyScreen from './screens/FamilyScreen.jsx'
import TrackerScreen from './screens/TrackerScreen.jsx'

const THEME_KEY = 'baby-log-theme' // для событий localStorage не используется, только для темы

export default function App() {
  const [stage, setStage] = useState('loading') // loading | auth | family | tracker
  const [session, setSession] = useState(null)
  const [inviteCode, setInviteCode] = useState(null)
  const [themeName, setThemeName] = useState(
    () => localStorage.getItem(THEME_KEY) || 'dark'
  )

  const t = THEMES[themeName] || THEMES.dark

  useEffect(() => {
    document.body.style.background = t.bg
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t.bg)
  }, [t])

  const toggleTheme = useCallback(() => {
    setThemeName((cur) => {
      const next = cur === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      return next
    })
  }, [])

  // Определяем семью. Офлайн полагаемся на то, что уже лежит локально —
  // приложение обязано открываться без сети.
  const resolveFamily = useCallback(async () => {
    const cached = db.getMeta().familyId
    if (cached) {
      sync.start(cached)
      setStage('tracker')
    }
    if (!navigator.onLine) {
      if (!cached) setStage('family')
      return
    }
    const [{ data: familyId }, { data: member }] = await Promise.all([
      supabase.rpc('my_family'),
      supabase.from('members').select('family_id, name').maybeSingle(),
    ])
    if (!familyId) {
      if (!cached) setStage('family')
      return
    }
    await db.setMeta({ familyId, myName: member?.name || db.getMeta().myName || null })
    sync.start(familyId)
    setStage('tracker')

    const { data: family } = await supabase
      .from('families')
      .select('invite_code')
      .eq('id', familyId)
      .maybeSingle()
    if (family?.invite_code) setInviteCode(family.invite_code)
  }, [])

  useEffect(() => {
    let alive = true

    // Локальный режим: ни входа, ни сети — сразу к трекеру.
    if (LOCAL_ONLY) {
      ;(async () => {
        await db.load()
        if (!alive) return
        if (!db.getMeta().familyId) {
          await db.setMeta({ familyId: LOCAL_FAMILY_ID, myName: db.getMeta().myName || 'Я' })
        }
        if (!alive) return
        setStage('tracker')
      })()
      return () => {
        alive = false
      }
    }

    ;(async () => {
      await db.load()
      const { data } = await supabase.auth.getSession()
      if (!alive) return
      setSession(data.session)
      if (!data.session) {
        setStage('auth')
        return
      }
      await resolveFamily()
    })()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, next) => {
      setSession(next)
      if (event === 'SIGNED_OUT' || !next) {
        sync.stop()
        setInviteCode(null)
        setStage('auth')
        return
      }
      if (event === 'SIGNED_IN') {
        setStage('loading')
        await resolveFamily()
      }
    })

    return () => {
      alive = false
      listener?.subscription?.unsubscribe()
    }
  }, [resolveFamily])

  const signOut = useCallback(async () => {
    sync.stop()
    await supabase.auth.signOut()
    await db.resetAll()
    setInviteCode(null)
    setStage('auth')
  }, [])

  // Локальный режим: «выйти» некуда, но стереть накопленное на устройстве надо уметь.
  const wipeLocal = useCallback(async () => {
    await db.resetAll()
    await db.setMeta({ familyId: LOCAL_FAMILY_ID, myName: 'Я' })
  }, [])

  const onFamilyReady = useCallback(
    async (name) => {
      await db.setMeta({ myName: name })
      setStage('loading')
      await resolveFamily()
    },
    [resolveFamily]
  )

  if (stage === 'loading') {
    return (
      <div
        style={{
          minHeight: '100%',
          background: t.bg,
          color: t.dim,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...TYPE.body,
        }}
      >
        Загружаем…
      </div>
    )
  }

  if (!LOCAL_ONLY && (stage === 'auth' || !session)) return <AuthScreen t={t} />

  if (stage === 'family') return <FamilyScreen t={t} onReady={onFamilyReady} onSignOut={signOut} />

  return (
    <TrackerScreen
      t={t}
      themeName={themeName}
      onToggleTheme={toggleTheme}
      inviteCode={inviteCode}
      onSignOut={signOut}
      localOnly={LOCAL_ONLY}
      onWipe={wipeLocal}
    />
  )
}
