export default function SmallBtn({ t, children, onClick, tone = 'default', style, disabled }) {
  const tones = {
    default: { bg: t.cardAlt, fg: t.text, border: t.line },
    ghost: { bg: 'transparent', fg: t.dim, border: t.line },
    danger: { bg: 'transparent', fg: t.danger, border: t.line },
    accent: { bg: t.text, fg: t.bg, border: t.text },
  }
  const c = tones[tone] || tones.default
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.fg,
        borderRadius: 999,
        padding: '9px 14px',
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity .15s ease, background .15s ease',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
