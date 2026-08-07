import { useEffect, useState } from 'react'
import { KINDS, ML_PRESETS, SIDES, TYPE } from '../lib/tokens.js'
import TimeField from './TimeField.jsx'
import SmallBtn from './SmallBtn.jsx'

// Диалог точного времени: выезжает снизу, закрывается по фону.
// Используется и для «другое время», и для правки записи в ленте.
export default function TimeSheet({ t, open, title, type, draft, onSave, onClose, onDelete }) {
  const [startedAt, setStartedAt] = useState(draft?.started_at ?? Date.now())
  const [endedAt, setEndedAt] = useState(draft?.ended_at ?? null)
  const [kind, setKind] = useState(draft?.kind ?? null)
  const [side, setSide] = useState(draft?.side ?? null)
  const [amount, setAmount] = useState(draft?.amount ?? null)
  const [note, setNote] = useState(draft?.note ?? '')

  useEffect(() => {
    if (!open) return
    setStartedAt(draft?.started_at ?? Date.now())
    setEndedAt(draft?.ended_at ?? null)
    setKind(draft?.kind ?? null)
    setSide(draft?.side ?? null)
    setAmount(draft?.amount ?? null)
    setNote(draft?.note ?? '')
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

  // Сторона важна для груди, объём — для бутылочки. Показываем то, что
  // относится к делу, иначе диалог превращается в анкету.
  const showSides = type === 'feed' && kind === 'breast'
  const showAmount = type === 'feed' && kind === 'bottle'

  const save = () =>
    onSave({
      started_at: startedAt,
      ended_at: endedAt,
      kind,
      side: showSides ? side : null,
      amount: showAmount ? amount : null,
      note: note.trim() || null,
    })

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
          maxHeight: '92vh',
          overflowY: 'auto',
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
          <TimeField t={t} label="Проснулся" value={endedAt} onChange={setEndedAt} allowEmpty />
        )}

        {kinds.length > 0 && (
          <Row t={t} label="Вид">
            {kinds.map((k) => (
              <Chip
                key={k.value}
                t={t}
                on={kind === k.value}
                onClick={() => setKind(kind === k.value ? null : k.value)}
              >
                {k.label}
              </Chip>
            ))}
          </Row>
        )}

        {showSides && (
          <Row t={t} label="Грудь">
            {SIDES.map((s) => (
              <Chip
                key={s.value}
                t={t}
                on={side === s.value}
                onClick={() => setSide(side === s.value ? null : s.value)}
              >
                {s.label}
              </Chip>
            ))}
          </Row>
        )}

        {showAmount && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...TYPE.label, color: t.dim }}>Объём, мл</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ML_PRESETS.map((ml) => (
                <Chip key={ml} t={t} on={amount === ml} onClick={() => setAmount(amount === ml ? null : ml)}>
                  {ml}
                </Chip>
              ))}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="1000"
              placeholder="своё значение"
              value={amount ?? ''}
              onChange={(e) => {
                const v = e.target.value
                setAmount(v === '' ? null : Math.max(0, Math.min(1000, Number(v))))
              }}
              style={{
                appearance: 'none',
                width: '100%',
                background: t.cardAlt,
                border: `1px solid ${t.line}`,
                borderRadius: 14,
                color: t.text,
                padding: '13px 14px',
                fontSize: 16,
                outline: 'none',
                colorScheme: t.name,
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...TYPE.label, color: t.dim }}>Заметка</div>
          <input
            type="text"
            maxLength={120}
            placeholder="срыгнул, капризничал, дали витамин D…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              appearance: 'none',
              width: '100%',
              background: t.cardAlt,
              border: `1px solid ${t.line}`,
              borderRadius: 14,
              color: t.text,
              padding: '13px 14px',
              fontSize: 16,
              outline: 'none',
            }}
          />
        </div>

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
          <SmallBtn t={t} tone="accent" disabled={invalid} onClick={save}>
            Сохранить
          </SmallBtn>
        </div>
      </div>
    </div>
  )
}

function Row({ t, label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ ...TYPE.label, color: t.dim }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function Chip({ t, on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        border: `1px solid ${on ? t.text : t.line}`,
        background: on ? t.text : 'transparent',
        color: on ? t.bg : t.dim,
        borderRadius: 999,
        padding: '10px 15px',
        fontSize: 13.5,
        lineHeight: 1,
        cursor: 'pointer',
        transition: 'background .15s ease, color .15s ease',
      }}
    >
      {children}
    </button>
  )
}
