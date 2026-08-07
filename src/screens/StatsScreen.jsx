import { useMemo, useState } from 'react'
import Bars from '../components/Bars.jsx'
import SmallBtn from '../components/SmallBtn.jsx'
import { TYPE } from '../lib/tokens.js'
import { fmtDur, fmtDurShort, DAY } from '../lib/time.js'
import { dailySeries, intervals, median, summaryFor, streakDays } from '../lib/stats.js'

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export default function StatsScreen({ t, events, now }) {
  const [range, setRange] = useState(7)

  const series = useMemo(() => dailySeries(events, range, now), [events, range, now])

  const total = useMemo(() => {
    const from = series[0]?.day ?? now
    return summaryFor(events, from, from + range * DAY, now)
  }, [events, series, range, now])

  const feedGaps = useMemo(() => intervals(events, 'feed', 20), [events])
  const medianGap = median(feedGaps)
  const streak = useMemo(() => streakDays(events, now), [events, now])

  // Дни, по которым есть хоть что-то: делить итог на пустые сутки нечестно —
  // среднее просядет только потому, что дневник начали вести вчера.
  const filled = series.filter(
    (d) => d.feeds.count || d.diapers.count || d.sleep.totalMs
  ).length
  const days = Math.max(1, filled)

  if (!events.length) {
    return (
      <Empty t={t} text="Статистика появится, как только наберутся первые записи." />
    )
  }

  const label = (day) => WEEKDAYS[new Date(day).getDay()]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...TYPE.h2, color: t.text, flex: 1 }}>Статистика</span>
        {[7, 14, 30].map((r) => (
          <SmallBtn
            key={r}
            t={t}
            tone={range === r ? 'accent' : 'ghost'}
            onClick={() => setRange(r)}
            style={{ padding: '8px 11px' }}
          >
            {r} дн
          </SmallBtn>
        ))}
      </div>

      <Panel t={t} title="Сон по дням" note={`в среднем ${fmtDur(total.sleep.totalMs / days)} в сутки`}>
        <Bars
          t={t}
          color={t.accent.sleep}
          height={110}
          data={series.map((d) => ({
            key: d.day,
            label: label(d.day),
            value: Math.round(d.sleep.totalMs / 60000),
            title: fmtDur(d.sleep.totalMs),
          }))}
          format={(mins) => fmtDurShort(mins * 60000)}
        />
        <Split
          t={t}
          items={[
            ['Ночной сон', fmtDur(total.sleep.nightMs / days)],
            ['Дневной сон', fmtDur(total.sleep.dayMs / days)],
            ['Самый долгий', fmtDur(total.sleep.longestMs)],
          ]}
        />
      </Panel>

      <Panel
        t={t}
        title="Кормления по дням"
        note={`в среднем ${(total.feeds.count / days).toFixed(1)} в сутки`}
      >
        <Bars
          t={t}
          color={t.accent.feed}
          data={series.map((d) => ({
            key: d.day,
            label: label(d.day),
            value: d.feeds.count,
          }))}
        />
        <Split
          t={t}
          items={[
            ['Обычный перерыв', medianGap ? fmtDur(medianGap) : '—'],
            ['Грудь / бутылочка', `${total.feeds.breast} / ${total.feeds.bottle}`],
            total.feeds.ml
              ? ['Смеси за период', `${total.feeds.ml} мл`]
              : ['Прикорм', String(total.feeds.food)],
          ]}
        />
      </Panel>

      <Panel
        t={t}
        title="Подгузники по дням"
        note={`в среднем ${(total.diapers.count / days).toFixed(1)} в сутки`}
      >
        <Bars
          t={t}
          color={t.accent.diaper}
          data={series.map((d) => ({
            key: d.day,
            label: label(d.day),
            value: d.diapers.count,
          }))}
        />
        <Split
          t={t}
          items={[
            ['Мокрых', String(total.diapers.wet)],
            ['По-большому', String(total.diapers.dirty)],
            ['Дней подряд в дневнике', String(streak)],
          ]}
        />
      </Panel>
    </div>
  )
}

function Panel({ t, title, note, children }) {
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.line}`,
        borderRadius: 20,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ ...TYPE.body, fontWeight: 600, color: t.text }}>{title}</span>
        {note ? <span style={{ ...TYPE.caption, color: t.dim }}>{note}</span> : null}
      </div>
      {children}
    </div>
  )
}

function Split({ t, items }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        paddingTop: 12,
        borderTop: `1px solid ${t.line}`,
      }}
    >
      {items.map(([label, value]) => (
        <div key={label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ ...TYPE.body, fontWeight: 600, color: t.text }}>{value}</span>
          <span style={{ ...TYPE.caption, color: t.dimmer, lineHeight: 1.25 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function Empty({ t, text }) {
  return (
    <div
      style={{
        ...TYPE.body,
        color: t.dim,
        background: t.card,
        border: `1px dashed ${t.line}`,
        borderRadius: 18,
        padding: '26px 18px',
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  )
}
