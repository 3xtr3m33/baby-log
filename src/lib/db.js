// Локальное хранилище. Экран читает только отсюда, никогда из сети.
// Ключи в IndexedDB: events (массив), pending (id, ждущие отправки), meta.
import { get, set, del } from 'idb-keyval'

const K_EVENTS = 'events'
const K_PENDING = 'pending'
const K_META = 'meta'

const EMPTY_META = { familyId: null, myName: null, lastPulledAt: null }

let events = []
let pending = []
let meta = { ...EMPTY_META }
let loaded = false
let loading = null

const listeners = new Set()

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  for (const fn of [...listeners]) fn()
}

export async function load() {
  if (loaded) return
  if (loading) return loading
  loading = (async () => {
    const [e, p, m] = await Promise.all([get(K_EVENTS), get(K_PENDING), get(K_META)])
    events = Array.isArray(e) ? e : []
    pending = Array.isArray(p) ? p : []
    meta = { ...EMPTY_META, ...(m || {}) }
    loaded = true
    emit()
  })()
  return loading
}

export function getEvents() {
  return events
}

export function getPending() {
  return pending
}

export function getMeta() {
  return meta
}

async function persistEvents() {
  await set(K_EVENTS, events)
}

async function persistPending() {
  await set(K_PENDING, pending)
}

async function persistMeta() {
  await set(K_META, meta)
}

function sortEvents(list) {
  return list.sort((a, b) => b.started_at - a.started_at)
}

// Слияние по id: выигрывает запись с бо́льшим updated_at.
// Исключение — id в pending: локальная правка ещё не уехала на сервер,
// поэтому серверная копия её не затирает.
function mergeInto(incoming) {
  const byId = new Map(events.map((e) => [e.id, e]))
  let changed = false
  for (const inc of incoming) {
    if (!inc || !inc.id) continue
    const cur = byId.get(inc.id)
    if (!cur) {
      byId.set(inc.id, inc)
      changed = true
      continue
    }
    if (pending.includes(inc.id)) continue
    if ((inc.updated_at || 0) >= (cur.updated_at || 0)) {
      byId.set(inc.id, inc)
      changed = true
    }
  }
  if (!changed) return false
  events = sortEvents([...byId.values()])
  return true
}

// Правило 7: если открытых снов несколько (оба нажали «Уснул»), активным
// остаётся самый ранний, остальные закрываются началом следующего.
// Исправленные записи возвращаются, чтобы отправить их на сервер.
function reconcileSleeps() {
  const open = events
    .filter((e) => e.type === 'sleep' && !e.deleted && e.ended_at == null)
    .sort((a, b) => a.started_at - b.started_at)
  if (open.length < 2) return []

  const fixed = []
  const byId = new Map(events.map((e) => [e.id, e]))
  for (let i = 1; i < open.length; i += 1) {
    const cur = open[i]
    const next = open[i + 1]
    const closedAt = next ? next.started_at : cur.started_at
    const patched = { ...cur, ended_at: closedAt, updated_at: Date.now() }
    byId.set(cur.id, patched)
    fixed.push(patched)
  }
  if (fixed.length) events = sortEvents([...byId.values()])
  return fixed
}

// Применить входящие записи (сервер или realtime).
export async function applyRemote(incoming) {
  const changed = mergeInto(incoming)
  const fixed = changed ? reconcileSleeps() : []
  if (changed || fixed.length) {
    if (fixed.length) {
      pending = [...new Set([...pending, ...fixed.map((e) => e.id)])]
      await persistPending()
    }
    await persistEvents()
    emit()
  }
  return fixed
}

// Записать локальное действие пользователя: сразу в базу и в очередь отправки.
export async function putLocal(list) {
  const byId = new Map(events.map((e) => [e.id, e]))
  for (const item of list) byId.set(item.id, item)
  events = sortEvents([...byId.values()])
  const fixed = reconcileSleeps()
  pending = [...new Set([...pending, ...list.map((e) => e.id), ...fixed.map((e) => e.id)])]
  await Promise.all([persistEvents(), persistPending()])
  emit()
}

export async function clearPending(ids) {
  const done = new Set(ids)
  pending = pending.filter((id) => !done.has(id))
  await persistPending()
  emit()
}

export function pendingEvents() {
  const ids = new Set(pending)
  return events.filter((e) => ids.has(e.id))
}

export async function setMeta(patch) {
  meta = { ...meta, ...patch }
  await persistMeta()
  emit()
}

// Выход из аккаунта: локальный кэш чужой семье не нужен.
export async function resetAll() {
  events = []
  pending = []
  meta = { ...EMPTY_META }
  loaded = true
  await Promise.all([del(K_EVENTS), del(K_PENDING), del(K_META)])
  emit()
}
