// Отправка очереди, подтягивание изменений и realtime.
// Пользовательский интерфейс никогда не ждёт сеть: всё пишется локально,
// сюда попадает только доставка.
import { supabase } from './supabase.js'
import * as db from './db.js'

const PULL_INTERVAL = 60000

let familyId = null
let channel = null
let timer = null
let flushing = false
let started = false

let status = { online: navigator.onLine, syncing: false, lastError: null }
const statusListeners = new Set()

export function subscribeStatus(fn) {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

export function getStatus() {
  return status
}

function setStatus(patch) {
  status = { ...status, ...patch }
  for (const fn of [...statusListeners]) fn()
}

// мс -> ISO для Supabase
function toRow(e) {
  return {
    id: e.id,
    family_id: e.family_id,
    type: e.type,
    started_at: new Date(e.started_at).toISOString(),
    ended_at: e.ended_at == null ? null : new Date(e.ended_at).toISOString(),
    kind: e.kind ?? null,
    by_name: e.by_name ?? null,
    deleted: !!e.deleted,
  }
}

// ISO -> мс для приложения
export function fromRow(r) {
  return {
    id: r.id,
    family_id: r.family_id,
    type: r.type,
    started_at: new Date(r.started_at).getTime(),
    ended_at: r.ended_at == null ? null : new Date(r.ended_at).getTime(),
    kind: r.kind ?? null,
    by_name: r.by_name ?? null,
    deleted: !!r.deleted,
    updated_at: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
  }
}

export async function flush() {
  if (flushing || !familyId) return
  const rows = db.pendingEvents()
  if (!rows.length) return
  if (!navigator.onLine) return

  flushing = true
  setStatus({ syncing: true })
  try {
    const { error } = await supabase.from('events').upsert(rows.map(toRow), { onConflict: 'id' })
    if (error) throw error
    await db.clearPending(rows.map((r) => r.id))
    setStatus({ lastError: null })
  } catch (err) {
    // Оставляем очередь как есть — попробуем в следующий раз.
    setStatus({ lastError: err?.message || String(err) })
  } finally {
    flushing = false
    setStatus({ syncing: false })
  }
}

export async function pull() {
  if (!familyId || !navigator.onLine) return
  const since = db.getMeta().lastPulledAt || '1970-01-01T00:00:00.000Z'
  setStatus({ syncing: true })
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
    if (error) throw error
    if (data && data.length) {
      const fixed = await db.applyRemote(data.map(fromRow))
      await db.setMeta({ lastPulledAt: data[data.length - 1].updated_at })
      if (fixed.length) await flush()
    }
    setStatus({ lastError: null })
  } catch (err) {
    setStatus({ lastError: err?.message || String(err) })
  } finally {
    setStatus({ syncing: false })
  }
}

export async function syncNow() {
  await flush()
  await pull()
}

function openChannel() {
  if (!familyId) return
  closeChannel()
  channel = supabase
    .channel(`events:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` },
      async (payload) => {
        const row = payload.new || payload.old
        if (!row) return
        const fixed = await db.applyRemote([fromRow(row)])
        if (row.updated_at) {
          const cur = db.getMeta().lastPulledAt
          if (!cur || new Date(row.updated_at) > new Date(cur)) {
            await db.setMeta({ lastPulledAt: row.updated_at })
          }
        }
        if (fixed.length) await flush()
      }
    )
    .subscribe()
}

function closeChannel() {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
}

const onOnline = () => {
  setStatus({ online: true })
  syncNow()
}
const onOffline = () => setStatus({ online: false })
const onVisible = () => {
  if (document.visibilityState === 'visible') syncNow()
}

export function start(family) {
  familyId = family
  if (!started) {
    started = true
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    timer = setInterval(syncNow, PULL_INTERVAL)
  }
  openChannel()
  syncNow()
}

export function stop() {
  closeChannel()
  familyId = null
  if (started) {
    started = false
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
    if (timer) clearInterval(timer)
    timer = null
  }
}
