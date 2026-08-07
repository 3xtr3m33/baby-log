import { TYPE } from '../lib/tokens.js'

// Столбики по дням. Своя вёрстка вместо библиотеки графиков: данных мало,
// а лишние 40 КБ в бандле на телефоне с одной палкой сети — это заметно.
export default function Bars({ t, data, color, format, height = 96, highlightLast = true }) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const strong = highlightLast && isLast
        const h = Math.round((d.value / max) * (height - 34))
        return (
          <div
            key={d.key ?? i}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'flex-end',
              height: '100%',
            }}
          >
            <span
              style={{
                ...TYPE.caption,
                fontSize: 10.5,
                color: strong ? t.text : t.dimmer,
                whiteSpace: 'nowrap',
              }}
            >
              {d.value ? (format ? format(d.value) : d.value) : ''}
            </span>
            <div
              title={d.title || ''}
              style={{
                width: '100%',
                height: Math.max(d.value ? 4 : 2, h),
                borderRadius: 6,
                background: d.value ? color : t.line,
                opacity: d.value ? (strong ? 1 : 0.55) : 0.5,
                transition: 'height .25s ease',
              }}
            />
            <span style={{ ...TYPE.caption, fontSize: 10.5, color: strong ? t.text : t.dimmer }}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
