import { useCallback, useEffect, useState } from 'react'
import TrackerScreen from './TrackerScreen.jsx'
import HistoryScreen from './HistoryScreen.jsx'
import StatsScreen from './StatsScreen.jsx'
import ScheduleScreen from './ScheduleScreen.jsx'
import TabBar from '../components/TabBar.jsx'
import TimeSheet from '../components/TimeSheet.jsx'
import Toast from '../components/Toast.jsx'
import SmallBtn from '../components/SmallBtn.jsx'
import { useEvents, useMeta, useNow, useSchedule, useSyncStatus } from '../hooks/useEvents.js'
import { TYPE, TYPE_META } from '../lib/tokens.js'
import { fmtClock, fmtDayTitle } from '../lib/time.js'
import { todaySummary } from '../lib/stats.js'
import { summaryText } from '../lib/export.js'
import * as sync from '../lib/sync.js'
import { ok } from '../lib/haptics.js'
import * as notify from '../lib/notify.js'

// Каркас приложения: шапка, вкладки, общие диалоги. Экраны внутри занимаются
// только своим содержимым и ничего не знают про навигацию.
export default function MainShell({
  t,
  themeName,
  onToggleTheme,
  inviteCode,
  onSignOut,
  localOnly = false,
  onWipe,
}) {
  const now = useNow(15000)
  const meta = useMeta()
  const status = useSyncStatus()
  const { events, addEvent, updateEvent, removeEvent } = useEvents()
  const { schedule, saveSchedule } = useSchedule()

  // Напоминания перевыставляем при старте и при любой смене графика —
  // в том числе пришедшей со второго телефона.
  useEffect(() => {
    notify.reschedule(schedule)
  }, [schedule])

  const [tab, setTab] = useState('today')
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)
  const [settings, setSettings] = useState(false)
  const [copied, setCopied] = useState(false)

  const closeToast = useCallback(() => setToast(null), [])

  const saveSheet = async (values) => {
    if (!sheet) return
    if (sheet.mode === 'add') {
      const event = await addEvent({
        type: sheet.type,
        startedAt: values.started_at,
        endedAt: values.ended_at,
        kind: values.kind,
        side: values.side,
        amount: values.amount,
        note: values.note,
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
        side: values.side,
        amount: values.amount,
        note: values.note,
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

  const copy = async (text, mark) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(mark)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* нет доступа к буферу — перепишут руками */
    }
  }

  const shareDay = async () => {
    const text = summaryText(todaySummary(events, now), fmtDayTitle(now, now))
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        /* закрыли системное окно — молча уходим в буфер */
      }
    }
    await copy(text, 'day')
    setToast({ text: 'Сводка дня скопирована' })
  }

  const offline = !status.online
  const showStatus = !localOnly && (offline || status.pendingCount > 0)

  return (
    <div
      style={{
        minHeight: '100%',
        background: t.bg,
        color: t.text,
        maxWidth: 520,
        margin: '0 auto',
        padding:
          'calc(14px + env(safe-area-inset-top)) 16px calc(10px + env(safe-area-inset-bottom))',
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
              : fmtDayTitle(now, now)}
          </span>
        </div>
        <SmallBtn t={t} tone="ghost" onClick={onToggleTheme}>
          {themeName === 'dark' ? 'Светлая' : 'Тёмная'}
        </SmallBtn>
        <SmallBtn
          t={t}
          onClick={() => {
            ok()
            setSettings(true)
          }}
        >
          Ещё
        </SmallBtn>
      </div>

      {tab === 'today' && (
        <TrackerScreen t={t} schedule={schedule} onOpenSheet={setSheet} setToast={setToast} />
      )}

      {tab === 'schedule' && (
        <ScheduleScreen
          t={t}
          events={events}
          now={now}
          schedule={schedule}
          onSave={saveSchedule}
          onEditEvent={(e) => setSheet({ mode: 'edit', type: e.type, id: e.id, draft: e })}
          onAddAt={(plan) => setSheet({ mode: 'add', type: 'feed', draft: { started_at: Math.min(plan, Date.now()) } })}
        />
      )}

      {tab === 'history' && (
        <HistoryScreen
          t={t}
          events={events}
          now={now}
          onEdit={(e) => setSheet({ mode: 'edit', type: e.type, id: e.id, draft: e })}
        />
      )}

      {tab === 'stats' && <StatsScreen t={t} events={events} now={now} />}

      <div style={{ height: 8 }} />
      <TabBar t={t} value={tab} onChange={setTab} />

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

      <Toast t={t} toast={toast} onClose={closeToast} />

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
            zIndex: 60,
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

            {!localOnly && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ ...TYPE.label, color: t.dim }}>Код приглашения</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...TYPE.h2, letterSpacing: 4, color: t.text }}>
                    {inviteCode || '······'}
                  </span>
                  <SmallBtn
                    t={t}
                    onClick={() => copy(inviteCode || '', 'invite')}
                    disabled={!inviteCode}
                  >
                    {copied === 'invite' ? 'Скопировано' : 'Скопировать'}
                  </SmallBtn>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ ...TYPE.label, color: t.dim }}>
                {localOnly ? 'Хранение' : 'Синхронизация'}
              </span>
              <span style={{ ...TYPE.body, color: t.dim, lineHeight: 1.35 }}>
                {localOnly
                  ? 'Записи лежат только на этом устройстве. Общий доступ для второго телефона включим позже.'
                  : `${
                      status.pendingCount > 0
                        ? `${status.pendingCount} записей ждут отправки`
                        : 'всё отправлено'
                    }${status.lastError ? ` · ошибка: ${status.lastError}` : ''}`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <SmallBtn t={t} onClick={shareDay}>
                Сводка дня
              </SmallBtn>
              {localOnly ? (
                <SmallBtn
                  t={t}
                  tone="danger"
                  onClick={async () => {
                    if (!window.confirm('Стереть все записи на этом устройстве?')) return
                    await onWipe()
                    setSettings(false)
                  }}
                >
                  Стереть записи
                </SmallBtn>
              ) : (
                <>
                  <SmallBtn t={t} onClick={() => sync.syncNow()}>
                    Синхронизировать
                  </SmallBtn>
                  <SmallBtn t={t} tone="danger" onClick={onSignOut}>
                    Выйти
                  </SmallBtn>
                </>
              )}
              <div style={{ flex: 1 }} />
              <SmallBtn t={t} tone="ghost" onClick={() => setSettings(false)}>
                Закрыть
              </SmallBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
