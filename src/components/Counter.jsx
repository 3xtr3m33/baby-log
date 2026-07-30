import { TYPE } from '../lib/tokens.js'

// Карточка «сколько прошло»: подпись, крупное значение, цветная засечка.
export default function Counter({ t, label, value, hint, color, active }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: t.card,
        border: `1px solid ${active ? color : t.line}`,
        borderRadius: 18,
        padding: '12px 12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 4, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span
          style={{
            ...TYPE.caption,
            color: t.dim,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          ...TYPE.h2,
          fontSize: 22,
          color: active ? color : t.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
      <div style={{ ...TYPE.caption, color: t.dimmer, minHeight: 15 }}>{hint || ''}</div>
    </div>
  )
}
