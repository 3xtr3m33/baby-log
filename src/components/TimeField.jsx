import { TYPE } from '../lib/tokens.js'
import { fromInput, toInput, MINUTE } from '../lib/time.js'

const SHIFTS = [5, 15, 30, 60]

// Поле точного времени: нативный выбор даты-времени плюс быстрые сдвиги назад.
export default function TimeField({ t, label, value, onChange, allowEmpty = false }) {
  const shift = (mins) => {
    const base = value ?? Date.now()
    onChange(base - mins * MINUTE)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ ...TYPE.label, color: t.dim }}>{label}</div>

      <input
        type="datetime-local"
        value={value == null ? '' : toInput(value)}
        onChange={(e) => {
          const ms = fromInput(e.target.value)
          if (ms != null || allowEmpty) onChange(ms)
        }}
        style={{
          appearance: 'none',
          width: '100%',
          background: t.cardAlt,
          border: `1px solid ${t.line}`,
          borderRadius: 14,
          color: t.text,
          padding: '14px 14px',
          fontSize: 17,
          fontWeight: 500,
          colorScheme: t.name,
        }}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onChange(Date.now())}
          style={chip(t)}
        >
          сейчас
        </button>
        {SHIFTS.map((m) => (
          <button key={m} type="button" onClick={() => shift(m)} style={chip(t)}>
            −{m} мин
          </button>
        ))}
        {allowEmpty && value != null && (
          <button type="button" onClick={() => onChange(null)} style={chip(t)}>
            очистить
          </button>
        )}
      </div>
    </div>
  )
}

function chip(t) {
  return {
    appearance: 'none',
    border: `1px solid ${t.line}`,
    background: 'transparent',
    color: t.dim,
    borderRadius: 999,
    padding: '8px 12px',
    fontSize: 12.5,
    lineHeight: 1,
    cursor: 'pointer',
  }
}
