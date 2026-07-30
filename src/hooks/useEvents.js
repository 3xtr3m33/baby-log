import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import * as db from '../lib/db.js'
import * as sync from '../lib/sync.js'

// Тикающие часы для счётчиков «сколько прошло».
export function useNow(interval = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [interval])
  return now
}

export function useMeta() {
  return useSyncExternalStore(db.subscribe, db.getMeta)
}

export function useSyncStatus() {
  const status = useSyncExternalStore(sync.subscribeStatus, sync.getStatus)
  const pending = useSyncExternalStore(db.subscribe, db.getPending)
  return { ...status, pendingCount: pending.length }
}

export function useEvents() {
  const all = useSyncExternalStore(db.subscribe, db.getEvents)
  const meta = useMeta()

  // Удалённые записи прячем: строка остаётся ради синхронизации.
  const events = useMemo(() => all.filter((e) => !e.deleted), [all])

  const activeSleep = useMemo(
    () => events.filter((e) => e.type === 'sleep' && e.ended_at == null).sort((a, b) => a.started_at - b.started_at)[0] || null,
    [events]
  )

  const base = useCallback(
    (patch) => ({
      family_id: meta.familyId,
      by_name: meta.myName || null,
      deleted: false,
      updated_at: Date.now(),
      ...patch,
    }),
    [meta.familyId, meta.myName]
  )

  const addEvent = useCallback(
    async ({ type, startedAt = Date.now(), kind = null, endedAt = null }) => {
      const event = base({
        id: crypto.randomUUID(),
        type,
        started_at: startedAt,
        ended_at: type === 'sleep' ? endedAt : null,
        kind,
      })
      await db.putLocal([event])
      sync.flush()
      return event
    },
    [base]
  )

  const updateEvent = useCallback(
    async (id, patch) => {
      const cur = db.getEvents().find((e) => e.id === id)
      if (!cur) return null
      const next = { ...cur, ...patch, updated_at: Date.now() }
      await db.putLocal([next])
      sync.flush()
      return next
    },
    []
  )

  // Удаление — это deleted: true, иначе оно не доедет на второй телефон.
  const removeEvent = useCallback((id) => updateEvent(id, { deleted: true }), [updateEvent])

  const wakeUp = useCallback(
    async (at = Date.now()) => {
      if (!activeSleep) return null
      return updateEvent(activeSleep.id, { ended_at: Math.max(at, activeSleep.started_at) })
    },
    [activeSleep, updateEvent]
  )

  const lastOf = useCallback(
    (type) => events.filter((e) => e.type === type).sort((a, b) => b.started_at - a.started_at)[0] || null,
    [events]
  )

  return { events, activeSleep, addEvent, updateEvent, removeEvent, wakeUp, lastOf }
}
