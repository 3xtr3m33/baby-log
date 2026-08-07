import { TYPE } from '../lib/tokens.js'

// Плитка сводки: крупное число и расшифровка мелким. Одна строка смысла,
// без графиков — их место на вкладке статистики.
export default function SummaryCard({ t, color, label, value, unit, hint }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: t.card,
        border: `1px solid ${t.line}`,
        borderRadius: 18,
        padding: '13px 13px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
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

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ ...TYPE.h2, fontSize: 24, color: t.text }}>{value}</span>
        {unit ? <span style={{ ...TYPE.caption, color: t.dim }}>{unit}</span> : null}
      </div>

      <div style={{ ...TYPE.caption, color: t.dimmer, minHeight: 15, lineHeight: 1.25 }}>
        {hint || ''}
      </div>
    </div>
  )
}
