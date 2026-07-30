import { useEffect, useState } from 'react'
import { KINDS, TYPE } from '../lib/tokens.js'
import TimeField from './TimeField.jsx'
import SmallBtn from './SmallBtn.jsx'

// Диалог точного времени: выезжает снизу, закрывается по фону.
// Используется и для «другое время», и для правки записи в ленте.
export default function TimeSheet({ t, open, title, type, draft, onSave, onClose, onDelete }) {
  const [startedAt, setStartedAt] = useState(draft?.started_at ?? Date.now())
  const [endedAt, setEndedAt] = useState(draft?.ended_at ?? null)
  const [kind, setKind] = useState(draft?.kind ?? null)

  useEffect(() => {
    if (!open) return
    setStartedAt(draft?.started_at ?? Date.now())
    setEndedAt(draft?.ended_at ?? null)
    setKind(draft?.kind ?? null)
  }, [open, draft])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const kinds = KINDS[type] || []
  const invalid = endedAt != null && endedAt < startedAt

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: t.overlay,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: t.bgSoft,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          border: `1px solid ${t.line}`,
          borderBottom: 'none',
          boxShadow: t.shadow,
          padding: '10px 18px calc(22px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: t.line }} />
        </div>

        <div style={{ ...TYPE.h2, color: t.text }}>{title}</div>

        <TimeField t={t} label="Время" value={startedAt} onChange={setStartedAt} />

        {type === 'sleep' && (
          <TimeField
            t={t}
            label="Проснулся"
            value={endedAt}
            onChange={setEndedAt}
            allowEmpty
          />
        )}

        {kinds.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...TYPE.label, color: t.dim }}>Вид</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {kinds.map((k) => {
                const on = kind === k.value
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(on ? null : k.value)}
                    style={{
                      appearance: 'none',
                      border: `1px solid ${on ? t.text : t.line}`,
                      background: on ? t.text : 'transparent',
                      color: on ? t.bg : t.dim,
                      borderRadius: 999,
                      padding: '9px 14px',
                      fontSize: 13,
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    {k.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {invalid && (
          <div style={{ ...TYPE.caption, color: t.danger }}>
            Пробуждение раньше начала сна — поправьте время.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {onDelete && (
            <SmallBtn t={t} tone="danger" onClick={onDelete}>
              Удалить
            </SmallBtn>
          )}
          <div style={{ flex: 1 }} />
          <SmallBtn t={t} tone="ghost" onClick={onClose}>
            Отмена
          </SmallBtn>
          <SmallBtn
            t={t}
            tone="accent"
            disabled={invalid}
            onClick={() => onSave({ started_at: startedAt, ended_at: endedAt, kind })}
          >
            Сохранить
          </SmallBtn>
        </div>
      </div>
    </div>
  )
}
