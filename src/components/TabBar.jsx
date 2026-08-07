import { TYPE } from '../lib/tokens.js'
import { ok } from '../lib/haptics.js'

const TABS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'history', label: 'История' },
  { key: 'stats', label: 'Статистика' },
]

// Нижняя навигация: большой палец достаёт до неё одной рукой, а лента
// перестала быть бесконечной простынёй на главном экране.
export default function TabBar({ t, value, onChange }) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        marginTop: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: `linear-gradient(to top, ${t.bg} 62%, transparent)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: 5,
          background: t.card,
          border: `1px solid ${t.line}`,
          borderRadius: 999,
          boxShadow: t.shadow,
        }}
      >
        {TABS.map((tab) => {
          const on = tab.key === value
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                if (!on) ok()
                onChange(tab.key)
              }}
              style={{
                appearance: 'none',
                flex: 1,
                border: 'none',
                borderRadius: 999,
                background: on ? t.text : 'transparent',
                color: on ? t.bg : t.dim,
                padding: '11px 8px',
                ...TYPE.label,
                fontWeight: on ? 600 : 500,
                cursor: 'pointer',
                transition: 'background .18s ease, color .18s ease',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
