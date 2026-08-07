import { useMemo, useState } from 'react'
import History from '../components/History.jsx'
import SmallBtn from '../components/SmallBtn.jsx'
import { TYPE, TYPE_META } from '../lib/tokens.js'
import { exportCsv, exportJson } from '../lib/export.js'
import { ok } from '../lib/haptics.js'

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'feed', label: TYPE_META.feed.title },
  { key: 'diaper', label: TYPE_META.diaper.title },
  { key: 'sleep', label: TYPE_META.sleep.title },
]

export default function HistoryScreen({ t, events, now, onEdit }) {
  const [filter, setFilter] = useState('all')

  const list = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.type === filter)),
    [events, filter]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...TYPE.h2, color: t.text, flex: 1 }}>История</span>
        <span style={{ ...TYPE.caption, color: t.dimmer }}>
          {list.length} {list.length === 1 ? 'запись' : 'записей'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {FILTERS.map((f) => (
          <SmallBtn
            key={f.key}
            t={t}
            tone={filter === f.key ? 'accent' : 'ghost'}
            onClick={() => {
              ok()
              setFilter(f.key)
            }}
            style={{ flexShrink: 0 }}
          >
            {f.label}
          </SmallBtn>
        ))}
      </div>

      <History t={t} events={list} now={now} onEdit={onEdit} />

      {events.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            padding: '14px 16px',
            background: t.card,
            border: `1px solid ${t.line}`,
            borderRadius: 18,
          }}
        >
          <span style={{ ...TYPE.caption, color: t.dim, flex: 1, lineHeight: 1.3 }}>
            Выгрузить дневник — показать врачу или сохранить копию
          </span>
          <SmallBtn t={t} onClick={() => exportCsv(events)}>
            CSV
          </SmallBtn>
          <SmallBtn t={t} tone="ghost" onClick={() => exportJson(events)}>
            JSON
          </SmallBtn>
        </div>
      )}
    </div>
  )
}
