import { TYPE } from '../lib/tokens.js'

// Большая кнопка действия + маленькая «другое время» в правом углу.
export default function BigButton({ t, color, title, subtitle, onPress, onOther }) {
  return (
    <div
      style={{
        position: 'relative',
        background: t.card,
        border: `1px solid ${t.line}`,
        borderRadius: 22,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onPress}
        style={{
          appearance: 'none',
          border: 'none',
          background: 'transparent',
          width: '100%',
          textAlign: 'left',
          padding: '18px 116px 18px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          color: t.text,
        }}
      >
        <span style={{ width: 6, height: 40, borderRadius: 3, background: color, flexShrink: 0 }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ ...TYPE.h2, color: t.text }}>{title}</span>
          <span
            style={{
              ...TYPE.caption,
              color: t.dim,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onOther}
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          appearance: 'none',
          border: `1px solid ${t.line}`,
          background: t.cardAlt,
          color: t.dim,
          borderRadius: 999,
          padding: '9px 13px',
          fontSize: 12.5,
          fontWeight: 500,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        другое время
      </button>
    </div>
  )
}
