import { useEffect } from 'react'
import { TYPE } from '../lib/tokens.js'

// Всплывающая подсказка внизу: подтверждение записи с «Отменить» либо
// переспрос про повтор. Живёт 5 секунд — успеть прочитать одной рукой с ребёнком.
export default function Toast({ t, toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => {
      toast.onDismiss?.()
      onClose()
    }, 5000)
    return () => clearTimeout(id)
  }, [toast, onClose])

  if (!toast) return null

  const label = toast.actionLabel || 'Отменить'
  const run = toast.action || toast.undo

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(84px + env(safe-area-inset-bottom))',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: 496,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: t.cardAlt,
          border: `1px solid ${t.line}`,
          borderRadius: 16,
          boxShadow: t.shadow,
          padding: '12px 14px',
        }}
      >
        <span
          style={{
            ...TYPE.body,
            color: t.text,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.text}
        </span>

        {run && (
          <button
            type="button"
            onClick={async () => {
              await run()
              onClose()
            }}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'transparent',
              color: t.accent.feed,
              ...TYPE.label,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 2px',
              flexShrink: 0,
            }}
          >
            {label}
          </button>
        )}
      </div>
    </div>
  )
}
