import { useMemo, useState } from 'react'
import Counter from '../components/Counter.jsx'
import Ribbon from '../components/Ribbon.jsx'
import BigButton from '../components/BigButton.jsx'
import SummaryCard from '../components/SummaryCard.jsx'
import { useEvents, useNow } from '../hooks/useEvents.js'
import { TYPE } from '../lib/tokens.js'
import { fmtClock, fmtDurShort, fmtDur, MINUTE } from '../lib/time.js'
import { todaySummary, predictNext } from '../lib/stats.js'
import { ok, done, warn } from '../lib/haptics.js'

// Двойное нажатие в темноте — обычное дело. Повтор того же события в этом
// окне не пишем молча, а переспрашиваем одной кнопкой в тосте.
const DOUBLE_TAP_MS = 3 * MINUTE

export default function TrackerScreen({ t, onOpenSheet, setToast }) {
  const now = useNow(15000)
  const { events, activeSleep, addEvent, updateEvent, removeEvent, wakeUp, lastOf } = useEvents()
  const [confirming, setConfirming] = useState(null)

  const lastFeed = lastOf('feed')
  const lastDiaper = lastOf('diaper')
  const lastSleep = useMemo(
    () =>
      events
        .filter((e) => e.type === 'sleep' && e.ended_at != null)
        .sort((a, b) => b.ended_at - a.ended_at)[0] || null,
    [events]
  )

  const summary = useMemo(() => todaySummary(events, now), [events, now])
  const nextFeed = useMemo(() => predictNext(events, 'feed', now), [events, now])

  const write = async (type) => {
    const event = await addEvent({ type })
    done()
    setToast({
      text: `Записано · ${fmtClock(event.started_at)}`,
      undo: () => removeEvent(event.id),
    })
  }

  const quickAdd = async (type) => {
    const last = lastOf(type)
    if (last && now - last.started_at < DOUBLE_TAP_MS && confirming !== type) {
      warn()
      setConfirming(type)
      setToast({
        text: `Уже отмечено ${fmtDur(now - last.started_at)} назад`,
        actionLabel: 'Всё равно',
        action: async () => {
          setConfirming(null)
          await write(type)
        },
        onDismiss: () => setConfirming(null),
      })
      return
    }
    setConfirming(null)
    await write(type)
  }

  const quickWake = async () => {
    const sleepId = activeSleep?.id
    const startedAt = activeSleep?.started_at
    const finished = await wakeUp()
    if (!finished) return
    done()
    setToast({
      text: `Проснулся · спал ${fmtDur(finished.ended_at - startedAt)}`,
      undo: () => updateEvent(sleepId, { ended_at: null }),
    })
  }

  const sleepTotal = summary.sleep.totalMs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* счётчики «сколько прошло» */}
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

      {/* прогноз: медиана последних перерывов, а не среднее */}
      {nextFeed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 14px',
            background: t.card,
            border: `1px solid ${t.line}`,
            borderRadius: 14,
          }}
        >
          <span
            style={{ width: 4, height: 26, borderRadius: 2, background: t.accent.feed, flexShrink: 0 }}
          />
          <span style={{ ...TYPE.caption, color: t.dim, flex: 1, lineHeight: 1.35 }}>
            Следующее кормление обычно около{' '}
            <span style={{ color: t.text, fontWeight: 600 }}>{fmtClock(nextFeed.at)}</span>
            {' · '}
            перерыв {fmtDur(nextFeed.step)}
          </span>
        </div>
      )}

      <Ribbon t={t} events={events} now={now} />

      {/* действия */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <BigButton
          t={t}
          color={t.accent.feed}
          title="Покормили"
          subtitle={lastFeed ? `прошлое в ${fmtClock(lastFeed.started_at)}` : 'первая запись'}
          onPress={() => quickAdd('feed')}
          onOther={() => onOpenSheet({ mode: 'add', type: 'feed', draft: { started_at: Date.now() } })}
        />
        <BigButton
          t={t}
          color={t.accent.diaper}
          title="Подгузник"
          subtitle={lastDiaper ? `прошлый в ${fmtClock(lastDiaper.started_at)}` : 'первая запись'}
          onPress={() => quickAdd('diaper')}
          onOther={() =>
            onOpenSheet({ mode: 'add', type: 'diaper', draft: { started_at: Date.now() } })
          }
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
          onPress={() => {
            ok()
            return activeSleep ? quickWake() : quickAdd('sleep')
          }}
          onOther={() =>
            activeSleep
              ? onOpenSheet({ mode: 'edit', type: 'sleep', id: activeSleep.id, draft: activeSleep })
              : onOpenSheet({ mode: 'add', type: 'sleep', draft: { started_at: Date.now() } })
          }
        />
      </div>

      {/* итоги суток */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
          <span style={{ ...TYPE.label, color: t.dim, flex: 1 }}>Итоги суток</span>
          <span style={{ ...TYPE.caption, color: t.dimmer }}>с полуночи</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <SummaryCard
            t={t}
            color={t.accent.feed}
            label="Кормлений"
            value={summary.feeds.count}
            hint={
              summary.feeds.ml
                ? `${summary.feeds.ml} мл смеси`
                : summary.feeds.breast
                  ? `грудь ${summary.feeds.breast}`
                  : 'пока нет'
            }
          />
          <SummaryCard
            t={t}
            color={t.accent.diaper}
            label="Подгузников"
            value={summary.diapers.count}
            hint={
              summary.diapers.count
                ? `мокрых ${summary.diapers.wet} · по-большому ${summary.diapers.dirty}`
                : 'пока нет'
            }
          />
          <SummaryCard
            t={t}
            color={t.accent.sleep}
            label="Сон"
            value={sleepTotal ? fmtDurShort(sleepTotal) : '—'}
            hint={
              sleepTotal
                ? `ночью ${fmtDurShort(summary.sleep.nightMs)} · снов ${summary.sleep.count}`
                : 'пока нет'
            }
          />
        </div>
      </div>

      {!events.length && (
        <div
          style={{
            ...TYPE.body,
            color: t.dim,
            background: t.card,
            border: `1px dashed ${t.line}`,
            borderRadius: 18,
            padding: '20px 18px',
            textAlign: 'center',
            lineHeight: 1.45,
          }}
        >
          Нажмите большую кнопку — запись встанет текущим временем.
          <br />
          <span style={{ color: t.dimmer }}>
            «Другое время» — если отмечаете задним числом.
          </span>
        </div>
      )}
    </div>
  )
}
