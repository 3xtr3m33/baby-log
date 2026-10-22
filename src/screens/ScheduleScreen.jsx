import { useEffect, useMemo, useState } from 'react'
import SmallBtn from '../components/SmallBtn.jsx'
import { TYPE } from '../lib/tokens.js'
import { DAY, fmtClock, fmtDayTitle, fmtDur, dayStart } from '../lib/time.js'
import {
  matchDay,
  adherence,
  nextFeeding,
  generateTimes,
  normalizeTimes,
  hasSchedule,
  PRESET_TIMES,
} from '../lib/schedule.js'
import * as notify from '../lib/notify.js'
import { ok } from '../lib/haptics.js'

// План против факта. Экран ничего не считает сам — только lib/schedule.js.
export default function ScheduleScreen({ t, events, now, schedule, onSave, onEditEvent, onAddAt }) {
  const [offset, setOffset] = useState(0) // 0 — сегодня, -1 — вчера…
  const [editing, setEditing] = useState(!hasSchedule(schedule))

  const day = dayStart(now) + offset * DAY + DAY / 2
  const { slots, extra } = useMemo(() => matchDay(schedule, events, day, now), [schedule, events, day, now])
  const week = useMemo(() => adherence(schedule, events, 7, now), [schedule, events, now])
  const next = useMemo(() => nextFeeding(schedule, events, now), [schedule, events, now])

  if (editing) {
    return (
      <ScheduleEditor
        t={t}
        schedule={schedule}
        onCancel={hasSchedule(schedule) ? () => setEditing(false) : null}
        onSave={async (patch) => {
          const saved = await onSave(patch)
          setEditing(false)
          return saved
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...TYPE.h2, color: t.text, flex: 1 }}>График</span>
        <SmallBtn t={t} onClick={() => setEditing(true)}>
          Изменить
        </SmallBtn>
      </div>

      {next && offset === 0 && <NextCard t={t} next={next} now={now} />}

      {/* переключатель дня */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SmallBtn t={t} tone="ghost" onClick={() => setOffset((o) => o - 1)}>
          ‹
        </SmallBtn>
        <span style={{ ...TYPE.label, color: t.text, flex: 1, textAlign: 'center' }}>
          {fmtDayTitle(day, now)}
        </span>
        <SmallBtn t={t} tone="ghost" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))}>
          ›
        </SmallBtn>
      </div>

      <div
        style={{
          background: t.card,
          border: `1px solid ${t.line}`,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        <Row t={t} head cells={['План', 'Факт', '']} />
        {slots.map((x) => (
          <Row
            key={x.plan}
            t={t}
            cells={[fmtClock(x.plan), x.actual != null ? fmtClock(x.actual) : '—', <Badge key="b" t={t} slot={x} now={now} />]}
            onClick={() => {
              ok()
              if (x.event) onEditEvent(x.event)
              else if (x.status !== 'upcoming') onAddAt(x.plan)
            }}
          />
        ))}
      </div>

      {extra.length > 0 && (
        <span style={{ ...TYPE.caption, color: t.dim, paddingLeft: 4, lineHeight: 1.4 }}>
          Вне графика: {extra.map((e) => fmtClock(e.started_at)).join(', ')}
        </span>
      )}

      <span style={{ ...TYPE.caption, color: t.dimmer, paddingLeft: 4, lineHeight: 1.4 }}>
        Нажмите на строку без факта, чтобы отметить кормление задним числом.
      </span>

      {week.total > 0 && (
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.line}`,
            borderRadius: 18,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <span style={{ ...TYPE.label, color: t.dim }}>За 7 дней</span>
          <span style={{ ...TYPE.big, fontSize: 28, color: t.text }}>
            {Math.round((week.ontime / week.total) * 100)}%{' '}
            <span style={{ ...TYPE.body, color: t.dim }}>вовремя</span>
          </span>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Stat t={t} color={t.accent.diaper} label="вовремя" value={week.ontime} />
            <Stat t={t} color={t.accent.feed} label="позже" value={week.late} />
            <Stat t={t} color={t.accent.sleep} label="раньше" value={week.early} />
            <Stat t={t} color={t.danger} label="пропущено" value={week.missed} />
          </div>
          {week.avgAbsDeltaMs != null && (
            <span style={{ ...TYPE.caption, color: t.dim }}>
              Среднее отклонение от графика: {fmtDur(week.avgAbsDeltaMs)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function NextCard({ t, next, now }) {
  const late = next.status === 'overdue'
  const color = late ? t.danger : t.accent.feed
  const text =
    next.status === 'overdue'
      ? `опаздываем на ${fmtDur(now - next.plan)}`
      : next.status === 'due'
        ? 'пора кормить'
        : `через ${fmtDur(next.plan - now)}`
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 14px',
        background: t.card,
        border: `1px solid ${late ? color : t.line}`,
        borderRadius: 14,
      }}
    >
      <span style={{ width: 4, height: 26, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ ...TYPE.caption, color: t.dim, flex: 1, lineHeight: 1.35 }}>
        По графику кормление в{' '}
        <span style={{ color: t.text, fontWeight: 600 }}>{fmtClock(next.plan)}</span>
        {' · '}
        <span style={{ color: late ? color : t.dim, fontWeight: late ? 600 : 400 }}>{text}</span>
      </span>
    </div>
  )
}

function Row({ t, cells, head, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 64px 1fr',
        alignItems: 'center',
        gap: 8,
        padding: head ? '10px 16px 8px' : '12px 16px',
        borderTop: head ? 'none' : `1px solid ${t.line}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {cells.map((c, i) => (
        <span
          key={i}
          style={{
            ...(head ? TYPE.caption : TYPE.body),
            color: head ? t.dimmer : i === 1 ? t.text : t.dim,
            fontWeight: !head && i === 1 ? 600 : 400,
            textAlign: i === 2 ? 'right' : 'left',
          }}
        >
          {c}
        </span>
      ))}
    </div>
  )
}

function Badge({ t, slot, now }) {
  const mins = (ms) => Math.round(Math.abs(ms) / 60000)
  const map = {
    ontime: [t.accent.diaper, 'вовремя'],
    late: [t.accent.feed, `+${fmtDur(slot.deltaMs)}`],
    early: [t.accent.sleep, `−${fmtDur(-slot.deltaMs)}`],
    missed: [t.danger, 'пропущено'],
    overdue: [t.danger, `опаздываем ${mins(now - slot.plan)} мин`],
    due: [t.accent.feed, 'сейчас'],
    upcoming: [t.dimmer, `через ${fmtDur(slot.plan - now)}`],
  }
  const [color, label] = map[slot.status]
  return (
    <span
      style={{
        ...TYPE.caption,
        color,
        border: `1px solid ${slot.status === 'upcoming' ? t.line : color}`,
        borderRadius: 999,
        padding: '4px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function Stat({ t, color, label, value }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, ...TYPE.caption, color: t.dim }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
      {label} <span style={{ color: t.text, fontWeight: 600 }}>{value}</span>
    </span>
  )
}

// ── редактор графика ───────────────────────────────────────────────────────
function ScheduleEditor({ t, schedule, onSave, onCancel }) {
  // Пустой график сразу предлагаем тем, что уже вели в заметке.
  const [times, setTimes] = useState(schedule.times.length ? schedule.times : PRESET_TIMES)
  const [newTime, setNewTime] = useState('')
  const [start, setStart] = useState(schedule.times[0] || '06:00')
  const [step, setStep] = useState(3)
  const [count, setCount] = useState(8)
  const [tol, setTol] = useState(schedule.toleranceMin)
  const [remind, setRemind] = useState(schedule.remindBeforeMin)
  const [perm, setPerm] = useState(null)

  useEffect(() => {
    if (notify.supported()) notify.permission().then(setPerm).catch(() => setPerm('denied'))
  }, [])

  const add = () => {
    const next = normalizeTimes([...times, newTime])
    if (next.length !== times.length) {
      ok()
      setTimes(next)
      setNewTime('')
    }
  }

  const input = {
    appearance: 'none',
    background: t.cardAlt,
    color: t.text,
    border: `1px solid ${t.line}`,
    borderRadius: 12,
    padding: '9px 10px',
    fontSize: 15,
    fontFamily: 'inherit',
    colorScheme: t.name,
  }

  // Сначала сохраняем, потом спрашиваем разрешение: системное окно может
  // висеть сколько угодно, и график не должен его ждать.
  const save = async () => {
    const saved = await onSave({ times, toleranceMin: tol, remindBeforeMin: remind })
    if (remind > 0 && perm === 'prompt') {
      notify
        .requestPermission()
        .then((res) => {
          if (res === 'granted') notify.reschedule(saved)
        })
        .catch(() => {})
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <span style={{ ...TYPE.h2, color: t.text }}>График кормлений</span>

      <Section t={t} title="Быстро заполнить">
        <div>
          <SmallBtn
            t={t}
            onClick={() => {
              ok()
              setTimes(PRESET_TIMES)
            }}
          >
            Наш график: {PRESET_TIMES.join(' · ')}
          </SmallBtn>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', ...TYPE.body, color: t.dim }}>
          с
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={input} />
          каждые
          <select value={step} onChange={(e) => setStep(Number(e.target.value))} style={input}>
            {[2, 2.5, 3, 3.5, 4].map((h) => (
              <option key={h} value={h}>
                {String(h).replace('.', ',')} ч
              </option>
            ))}
          </select>
          раз
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} style={input}>
            {[4, 5, 6, 7, 8, 9, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <SmallBtn
            t={t}
            onClick={() => {
              ok()
              setTimes(generateTimes(start, step, count))
            }}
          >
            Заполнить
          </SmallBtn>
        </div>
      </Section>

      <Section t={t} title={`Время кормлений · ${times.length}`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {times.map((hhmm) => (
            <button
              key={hhmm}
              type="button"
              onClick={() => setTimes(times.filter((x) => x !== hhmm))}
              style={{
                appearance: 'none',
                border: `1px solid ${t.accent.feed}`,
                background: 'transparent',
                color: t.text,
                borderRadius: 999,
                padding: '8px 12px',
                ...TYPE.label,
                cursor: 'pointer',
              }}
              title="Убрать"
            >
              {hhmm} <span style={{ color: t.dim }}>×</span>
            </button>
          ))}
          {!times.length && <span style={{ ...TYPE.caption, color: t.dimmer }}>пока пусто</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={input} />
          <SmallBtn t={t} onClick={add} disabled={!newTime}>
            Добавить
          </SmallBtn>
        </div>
      </Section>

      <Section t={t} title="Сколько считать «вовремя»">
        <Choice t={t} value={tol} onChange={setTol} options={[10, 15, 20, 30].map((m) => [m, `± ${m} мин`])} />
      </Section>

      <Section t={t} title="Напоминание">
        <Choice
          t={t}
          value={remind}
          onChange={setRemind}
          options={[
            [0, 'нет'],
            [5, 'за 5 мин'],
            [10, 'за 10 мин'],
            [15, 'за 15 мин'],
            [30, 'за 30 мин'],
          ]}
        />
        {remind > 0 && (
          <span style={{ ...TYPE.caption, color: perm === 'denied' ? t.danger : t.dimmer, lineHeight: 1.4 }}>
            {!notify.supported()
              ? 'Этот браузер не умеет уведомления.'
              : perm === 'denied'
                ? 'Уведомления запрещены в настройках телефона — включите их для приложения.'
                : notify.isNative()
                  ? 'Напоминания придут, даже если приложение закрыто.'
                  : 'В браузере напоминание придёт, только пока приложение открыто. В версии из магазина — всегда.'}
          </span>
        )}
      </Section>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <SmallBtn t={t} tone="accent" onClick={save} disabled={!times.length}>
          Сохранить
        </SmallBtn>
        {onCancel && (
          <SmallBtn t={t} tone="ghost" onClick={onCancel}>
            Отмена
          </SmallBtn>
        )}
      </div>
    </div>
  )
}

function Section({ t, title, children }) {
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.line}`,
        borderRadius: 18,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span style={{ ...TYPE.label, color: t.dim }}>{title}</span>
      {children}
    </div>
  )
}

function Choice({ t, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(([v, label]) => (
        <SmallBtn key={v} t={t} tone={value === v ? 'accent' : 'ghost'} onClick={() => onChange(v)}>
          {label}
        </SmallBtn>
      ))}
    </div>
  )
}
