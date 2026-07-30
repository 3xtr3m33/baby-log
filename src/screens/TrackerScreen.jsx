import { useEffect, useMemo, useState } from 'react'
import Counter from '../components/Counter.jsx'
import Ribbon from '../components/Ribbon.jsx'
import BigButton from '../components/BigButton.jsx'
import TimeSheet from '../components/TimeSheet.jsx'
import History from '../components/History.jsx'
import SmallBtn from '../components/SmallBtn.jsx'
import { useEvents, useMeta, useNow, useSyncStatus } from '../hooks/useEvents.js'
import { TYPE, TYPE_META } from '../lib/tokens.js'
import { fmtClock, fmtDurShort, fmtDur } from '../lib/time.js'
import * as sync from '../lib/sync.js'

export default function TrackerScreen({ t, themeName, onToggleTheme, inviteCode, onSignOut }) {
  const now = useNow(15000)
  const meta = useMeta()
  const status = useSyncStatus()
  const { events, activeSleep, addEvent, updateEvent, removeEvent, wakeUp, lastOf } = useEvents()

  const [sheet, setSheet] = useState(null) // {mode:'add'|'edit', type, draft, id}
  const [toast, setToast] = useState(null)
  const [settings, setSettings] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(id)
  }, [toast])

  const lastFeed = lastOf('feed')
  const lastDiaper = lastOf('diaper')
  const lastSleep = useMemo(
    () => events.filter((e) => e.type === 'sleep' && e.ended_at != null).sort((a, b) => b.ended_at - a.ended_at)[0] || null,
    [events]
  )

  const quickAdd = async (type) => {
    const event = await addEvent({ type })
    setToast({
      text: `${TYPE_META[type].title} · ${fmtClock(event.started_at)}`,
      undo: () => removeEvent(event.id),
    })
  }

  const quickWake = async () => {
    const sleepId = activeSleep?.id
    const startedAt = activeSleep?.started_at
    const done = await wakeUp()
    if (!done) return
    setToast({
      text: `Проснулся · спал ${fmtDur(done.ended_at - startedAt)}`,
      undo: () => updateEvent(sleepId, { ended_at: null }),
    })
  }

  const saveSheet = async (values) => {
    if (!sheet) return
    if (sheet.mode === 'add') {
      const event = await addEvent({
        type: sheet.type,
        startedAt: values.started_at,
        endedAt: values.ended_at,
        kind: values.kind,
      })
      setToast({
        text: `${TYPE_META[sheet.type].title} · ${fmtClock(event.started_at)}`,
        undo: () => removeEvent(event.id),
      })
    } else {
      await updateEvent(sheet.id, {
        started_at: values.started_at,
        ended_at: sheet.type === 'sleep' ? values.ended_at : null,
        kind: values.kind,
      })
    }
    setSheet(null)
  }

  const deleteFromSheet = async () => {
    if (!sheet || sheet.mode !== 'edit') return
    const id = sheet.id
    await removeEvent(id)
    setSheet(null)
    setToast({ text: 'Запись удалена', undo: () => updateEvent(id, { deleted: false }) })
  }

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* пусть просто перепишут руками */
    }
  }

  const offline = !status.online
  const showStatus = offline || status.pendingCount > 0

  return (
    <div
      style={{
        minHeight: '100%',
        background: t.bg,
        color: t.text,
        maxWidth: 520,
        margin: '0 auto',
        padding: 'calc(16px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* шапка */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{ ...TYPE.h2, color: t.text }}>Дневник</span>
          <span style={{ ...TYPE.caption, color: showStatus ? t.accent.feed : t.dimmer }}>
            {showStatus
              ? `${offline ? 'офлайн' : 'синхронизация'} · ${status.pendingCount} ${
                  status.pendingCount === 1 ? 'запись ждёт' : 'записей ждут'
                } отправки`
              : meta.myName || ''}
          </span>
        </div>
        <SmallBtn t={t} tone="ghost" onClick={onToggleTheme}>
          {themeName === 'dark' ? 'Светлая' : 'Тёмная'}
        </SmallBtn>
        <SmallBtn t={t} onClick={() => setSettings(true)}>
          Ещё
        </SmallBtn>
      </div>

      {/* счётчики */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Counter
          t={t}
          color={t.accent.feed}
          label="С кормления"
          value={lastFeed ? fmtDurShort(now - lastFeed.started_at) : '—'}
          hint={lastFeed ? `в ${fmtClock(lastFeed.started_at)}` : 'нет записей'}
        />
        <Counter
          t={t}
          color={t.accent.diaper}
          label="С подгузника"
          value={lastDiaper ? fmtDurShort(now - lastDiaper.started_at) : '—'}
          hint={lastDiaper ? `в ${fmtClock(lastDiaper.started_at)}` : 'нет записей'}
        />
        <Counter
          t={t}
          color={t.accent.sleep}
          active={!!activeSleep}
          label={activeSleep ? 'Спит' : 'С пробуждения'}
          value={
            activeSleep
              ? fmtDurShort(now - activeSleep.started_at)
              : lastSleep
                ? fmtDurShort(now - lastSleep.ended_at)
                : '—'
          }
          hint={
            activeSleep
              ? `уснул в ${fmtClock(activeSleep.started_at)}`
              : lastSleep
                ? `встал в ${fmtClock(lastSleep.ended_at)}`
                : 'нет записей'
          }
        />
      </div>

      <Ribbon t={t} events={events} now={now} />

      {/* действия */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <BigButton
          t={t}
          color={t.accent.feed}
          title="Покормили"
          subtitle={lastFeed ? `прошлое в ${fmtClock(lastFeed.started_at)}` : 'первая запись'}
          onPress={() => quickAdd('feed')}
          onOther={() => setSheet({ mode: 'add', type: 'feed', draft: { started_at: Date.now() } })}
        />
        <BigButton
          t={t}
          color={t.accent.diaper}
          title="Подгузник"
          subtitle={lastDiaper ? `прошлый в ${fmtClock(lastDiaper.started_at)}` : 'первая запись'}
          onPress={() => quickAdd('diaper')}
          onOther={() => setSheet({ mode: 'add', type: 'diaper', draft: { started_at: Date.now() } })}
        />
        <BigButton
          t={t}
          color={t.accent.sleep}
          title={activeSleep ? 'Проснулся' : 'Уснул'}
          subtitle={
            activeSleep
              ? `спит с ${fmtClock(activeSleep.started_at)}`
              : lastSleep
                ? `прошлый сон ${fmtDur(lastSleep.ended_at - lastSleep.started_at)}`
                : 'первая запись'
          }
          onPress={() => (activeSleep ? quickWake() : quickAdd('sleep'))}
          onOther={() =>
            activeSleep
              ? setSheet({ mode: 'edit', type: 'sleep', id: activeSleep.id, draft: activeSleep })
              : setSheet({ mode: 'add', type: 'sleep', draft: { started_at: Date.now() } })
          }
        />
      </div>

      <History
        t={t}
        events={events}
        now={now}
        onEdit={(e) => setSheet({ mode: 'edit', type: e.type, id: e.id, draft: e })}
      />

      <TimeSheet
        t={t}
        open={!!sheet}
        type={sheet?.type}
        draft={sheet?.draft}
        title={
          sheet?.mode === 'edit'
            ? `${TYPE_META[sheet.type].title} — правка`
            : sheet
              ? `${TYPE_META[sheet.type].title} — другое время`
              : ''
        }
        onSave={saveSheet}
        onClose={() => setSheet(null)}
        onDelete={sheet?.mode === 'edit' ? deleteFromSheet : undefined}
      />

      {settings && (
        <div
          onClick={() => setSettings(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: t.overlay,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 40,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              background: t.bgSoft,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              border: `1px solid ${t.line}`,
              borderBottom: 'none',
              boxShadow: t.shadow,
              padding: '10px 18px calc(22px + env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 40, height: 4, borderRadius: 2, background: t.line }} />
            </div>

            <div style={{ ...TYPE.h2, color: t.text }}>Настройки</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ ...TYPE.label, color: t.dim }}>Отмечает</span>
              <span style={{ ...TYPE.body, color: t.text }}>{meta.myName || '—'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ ...TYPE.label, color: t.dim }}>Код приглашения</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...TYPE.h2, letterSpacing: 4, color: t.text }}>
                  {inviteCode || '······'}
                </span>
                <SmallBtn t={t} onClick={copyInvite} disabled={!inviteCode}>
                  {copied ? 'Скопировано' : 'Скопировать'}
                </SmallBtn>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ ...TYPE.label, color: t.dim }}>Синхронизация</span>
              <span style={{ ...TYPE.body, color: t.dim }}>
                {status.pendingCount > 0
                  ? `${status.pendingCount} записей ждут отправки`
                  : 'всё отправлено'}
                {status.lastError ? ` · ошибка: ${status.lastError}` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <SmallBtn t={t} onClick={() => sync.syncNow()}>
                Синхронизировать
              </SmallBtn>
              <div style={{ flex: 1 }} />
              <SmallBtn t={t} tone="danger" onClick={onSignOut}>
                Выйти
              </SmallBtn>
              <SmallBtn t={t} tone="ghost" onClick={() => setSettings(false)}>
                Закрыть
              </SmallBtn>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 'calc(20px + env(safe-area-inset-bottom))',
            maxWidth: 488,
            margin: '0 auto',
            background: t.cardAlt,
            border: `1px solid ${t.line}`,
            borderRadius: 16,
            boxShadow: t.shadow,
            padding: '12px 12px 12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 50,
          }}
        >
          <span style={{ ...TYPE.body, color: t.text, flex: 1, minWidth: 0 }}>{toast.text}</span>
          {toast.undo && (
            <SmallBtn
              t={t}
              onClick={() => {
                toast.undo()
                setToast(null)
              }}
            >
              Отменить
            </SmallBtn>
          )}
        </div>
      )}
    </div>
  )
}
