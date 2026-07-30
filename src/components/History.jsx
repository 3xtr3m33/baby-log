import { useMemo } from 'react'
import { TYPE, TYPE_META, kindLabel } from '../lib/tokens.js'
import { dayStart, fmtClock, fmtDayTitle, fmtDur } from '../lib/time.js'

// Лента событий, сгруппированная по дням. Тап по строке — правка времени.
export default function History({ t, events, now, onEdit }) {
  const groups = useMemo(() => {
    const map = new Map()
    for (const e of events) {
      const key = dayStart(e.started_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([day, list]) => [day, list.sort((a, b) => b.started_at - a.started_at)])
  }, [events])

  if (!events.length) {
    return (
      <div
        style={{
          ...TYPE.body,
          color: t.dim,
          background: t.card,
          border: `1px dashed ${t.line}`,
          borderRadius: 18,
          padding: '22px 18px',
          textAlign: 'center',
        }}
      >
        Пока пусто. Нажмите кнопку выше — запись появится здесь.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map(([day, list]) => (
        <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...TYPE.label, color: t.dim, paddingLeft: 4 }}>{fmtDayTitle(day, now)}</div>

          <div
            style={{
              background: t.card,
              border: `1px solid ${t.line}`,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            {list.map((e, i) => {
              const meta = TYPE_META[e.type]
              const color = t.accent[meta.color]
              const kind = kindLabel(e.type, e.kind)
              const running = e.type === 'sleep' && e.ended_at == null
              const duration =
                e.type === 'sleep' ? fmtDur((e.ended_at == null ? now : e.ended_at) - e.started_at) : null

              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onEdit(e)}
                  style={{
                    appearance: 'none',
                    border: 'none',
                    borderTop: i === 0 ? 'none' : `1px solid ${t.line}`,
                    background: 'transparent',
                    width: '100%',
                    textAlign: 'left',
                    padding: '13px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    color: t.text,
                  }}
                >
                  <span
                    style={{ width: 4, height: 30, borderRadius: 2, background: color, flexShrink: 0 }}
                  />

                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ ...TYPE.body, fontWeight: 500, color: t.text }}>
                      {meta.title}
                      {kind ? <span style={{ color: t.dim, fontWeight: 400 }}> · {kind}</span> : null}
                    </span>
                    <span
                      style={{
                        ...TYPE.caption,
                        color: t.dimmer,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {duration ? `${duration}${running ? ' · идёт' : ''}` : ' '}
                      {e.by_name ? `${duration ? ' · ' : ''}${e.by_name}` : ''}
                    </span>
                  </span>

                  <span style={{ ...TYPE.body, color: running ? color : t.dim, fontWeight: 500 }}>
                    {fmtClock(e.started_at)}
                    {e.type === 'sleep' && e.ended_at != null ? `–${fmtClock(e.ended_at)}` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
