// График кормлений: план (фиксированные часы) против факта (записи «Покормили»).
// Чистые функции, как в stats.js: экраны и проверки считают одно и то же.
import { DAY, MINUTE, dayStart } from './time.js'

// График Лиама из заметки (22.10.2026) — предлагается кнопкой в редакторе.
export const PRESET_TIMES = ['00:00', '03:30', '07:00', '09:30', '12:00', '14:30', '17:00', '20:00']

export const DEFAULT_SCHEDULE = {
  times: [],
  toleranceMin: 15, // в пределах ± этого считаем «вовремя»
  remindBeforeMin: 10, // 0 — без напоминаний
  updated_at: 0,
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/

// "6:5" и мусор отбрасываем, дубли убираем, сортируем по времени суток.
export function normalizeTimes(list) {
  const out = new Set()
  for (const raw of list || []) {
    const m = TIME_RE.exec(String(raw).trim())
    if (!m) continue
    out.add(`${m[1].padStart(2, '0')}:${m[2]}`)
  }
  return [...out].sort()
}

export function normalizeSchedule(s) {
  return {
    ...DEFAULT_SCHEDULE,
    ...(s || {}),
    times: normalizeTimes(s?.times),
  }
}

export function hasSchedule(s) {
  return !!s && Array.isArray(s.times) && s.times.length > 0
}

// «Каждые N часов с HH:MM» — быстрый способ заполнить график.
export function generateTimes(start, stepHours, count) {
  const m = TIME_RE.exec(start)
  if (!m || !(stepHours > 0) || !(count > 0)) return []
  const base = Number(m[1]) * 60 + Number(m[2])
  const out = []
  for (let i = 0; i < count; i += 1) {
    const total = Math.round(base + i * stepHours * 60) % 1440
    out.push(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`)
  }
  return normalizeTimes(out)
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Плановые моменты суток в мс. Через dayStart + часы, а не + N*HOUR:
// в день перевода часов сутки не равны 24 часам.
export function slotsForDay(times, dayMs) {
  const d0 = new Date(dayStart(dayMs))
  return normalizeTimes(times).map((hhmm) => {
    const d = new Date(d0)
    const mins = toMinutes(hhmm)
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
    return d.getTime()
  })
}

// Сопоставление плана с фактом за сутки.
// Каждому плановому кормлению принадлежит окно до середины перерыва с соседями
// (для крайних — с последним вчерашним и первым завтрашним). Первое кормление в
// окне — «то самое», остальные считаются дополнительными.
export function matchDay(schedule, events, dayMs, now = Date.now()) {
  const s = normalizeSchedule(schedule)
  if (!hasSchedule(s)) return { slots: [], extra: [] }
  const tol = s.toleranceMin * MINUTE

  const today = slotsForDay(s.times, dayMs)
  const prevDay = slotsForDay(s.times, dayStart(dayMs) - DAY / 2)
  const nextDay = slotsForDay(s.times, dayStart(dayMs) + DAY + DAY / 2)
  const prevSlot = prevDay[prevDay.length - 1]
  const nextSlot = nextDay[0]

  const feeds = events
    .filter((e) => e.type === 'feed' && !e.deleted)
    .sort((a, b) => a.started_at - b.started_at)

  const used = new Set()
  const slots = today.map((plan, i) => {
    const before = i > 0 ? today[i - 1] : prevSlot
    const after = i < today.length - 1 ? today[i + 1] : nextSlot
    const from = plan - (plan - before) / 2
    const to = plan + (after - plan) / 2
    const hit = feeds.find((e) => e.started_at >= from && e.started_at < to && !used.has(e.id))
    if (hit) used.add(hit.id)

    let status
    let deltaMs = null
    if (hit) {
      deltaMs = hit.started_at - plan
      status = Math.abs(deltaMs) <= tol ? 'ontime' : deltaMs > 0 ? 'late' : 'early'
    } else if (now < plan - tol) {
      status = 'upcoming'
    } else if (now <= plan + tol) {
      status = 'due'
    } else if (now < to) {
      status = 'overdue'
      deltaMs = now - plan
    } else {
      status = 'missed'
    }
    return { plan, from, to, actual: hit ? hit.started_at : null, event: hit || null, deltaMs, status }
  })

  const d0 = dayStart(dayMs)
  const extra = feeds.filter(
    (e) => e.started_at >= d0 && e.started_at < d0 + DAY && !used.has(e.id)
  )
  return { slots, extra }
}

// Ближайшее плановое кормление, которое ещё не закрыто фактом.
export function nextFeeding(schedule, events, now = Date.now()) {
  if (!hasSchedule(schedule)) return null
  for (const day of [now, dayStart(now) + DAY + DAY / 2]) {
    const { slots } = matchDay(schedule, events, day, now)
    const open = slots.find((x) => x.status === 'upcoming' || x.status === 'due' || x.status === 'overdue')
    if (open) return { ...open, inMs: open.plan - now }
  }
  return null
}

// Сводка соблюдения графика за последние N полных суток плюс сегодня.
// Сегодняшние слоты, время которых ещё не пришло, в счёт не идут. Сутки без
// единой записи кормления пропускаем: это дни до начала дневника или дни,
// когда его просто не вели, а не 8 пропущенных кормлений.
export function adherence(schedule, events, days = 7, now = Date.now()) {
  const out = { ontime: 0, late: 0, early: 0, missed: 0, total: 0, avgAbsDeltaMs: null }
  if (!hasSchedule(schedule)) return out
  let sumAbs = 0
  let withFact = 0
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = dayStart(now) - i * DAY + DAY / 2
    const d0 = dayStart(day)
    const anyFeed = events.some(
      (e) => e.type === 'feed' && !e.deleted && e.started_at >= d0 && e.started_at < d0 + DAY
    )
    if (!anyFeed) continue
    const { slots } = matchDay(schedule, events, day, now)
    for (const x of slots) {
      if (x.status === 'upcoming' || x.status === 'due' || x.status === 'overdue') continue
      out.total += 1
      out[x.status] += 1
      if (x.actual != null) {
        sumAbs += Math.abs(x.deltaMs)
        withFact += 1
      }
    }
  }
  out.avgAbsDeltaMs = withFact ? Math.round(sumAbs / withFact) : null
  return out
}

// Моменты напоминаний на ближайшие сутки — для веб-уведомлений, пока экран открыт.
export function reminderMoments(schedule, now = Date.now(), horizonMs = DAY) {
  const s = normalizeSchedule(schedule)
  if (!hasSchedule(s) || !(s.remindBeforeMin > 0)) return []
  const lead = s.remindBeforeMin * MINUTE
  const all = [
    ...slotsForDay(s.times, now),
    ...slotsForDay(s.times, dayStart(now) + DAY + DAY / 2),
  ]
  return all
    .map((plan) => ({ plan, at: plan - lead }))
    .filter((x) => x.at > now && x.at <= now + horizonMs)
}
