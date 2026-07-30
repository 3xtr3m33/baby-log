import { TYPE } from '../lib/tokens.js'
import { DAY, dayStart } from '../lib/time.js'

// Полоса суток: 24 часа слева направо. Кормления и подгузники — засечки,
// сон — отрезок. Всё в цветах типов событий.
export default function Ribbon({ t, events, now }) {
  const start = dayStart(now)
  const end = start + DAY
  const pct = (ms) => Math.min(100, Math.max(0, ((ms - start) / DAY) * 100))

  const today = events.filter((e) => {
    const from = e.started_at
    const to = e.ended_at == null ? (e.type === 'sleep' ? now : e.started_at) : e.ended_at
    return to >= start && from <= end
  })

  const sleeps = today.filter((e) => e.type === 'sleep')
  const marks = today.filter((e) => e.type !== 'sleep')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          position: 'relative',
          height: 44,
          background: t.card,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {/* часовая сетка */}
        {[6, 12, 18].map((h) => (
          <div
            key={h}
            style={{
              position: 'absolute',
              left: `${(h / 24) * 100}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: t.line,
            }}
          />
        ))}

        {/* сон — отрезком по нижней половине */}
        {sleeps.map((e) => {
          const from = Math.max(e.started_at, start)
          const to = Math.min(e.ended_at == null ? now : e.ended_at, end)
          const left = pct(from)
          const width = Math.max(0.6, pct(to) - left)
          return (
            <div
              key={e.id}
              title="Сон"
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                bottom: 6,
                height: 12,
                borderRadius: 6,
                background: t.accent.sleep,
                opacity: e.ended_at == null ? 1 : 0.75,
              }}
            />
          )
        })}

        {/* кормления и подгузники — вертикальные засечки сверху */}
        {marks.map((e) => (
          <div
            key={e.id}
            title={e.type === 'feed' ? 'Кормление' : 'Подгузник'}
            style={{
              position: 'absolute',
              left: `${pct(e.started_at)}%`,
              top: 6,
              width: 3,
              height: 18,
              marginLeft: -1.5,
              borderRadius: 2,
              background: e.type === 'feed' ? t.accent.feed : t.accent.diaper,
            }}
          />
        ))}

        {/* текущий момент */}
        <div
          style={{
            position: 'absolute',
            left: `${pct(now)}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: t.text,
            opacity: 0.35,
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', ...TYPE.caption, color: t.dimmer }}>
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  )
}
