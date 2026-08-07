// Подсчёты для сводки и статистики. Чистые функции над массивом событий:
// экран ничего не считает сам, чтобы одни и те же числа не разъезжались.
import { DAY, dayStart } from './time.js'

// Ночным считаем сон, начатый с 19:00 до 06:00 — по этой границе родители и
// делят «уложили на ночь» и «дневной сон».
export function isNightSleep(ms) {
  const h = new Date(ms).getHours()
  return h >= 19 || h < 6
}

// Длительность сна внутри окна [from, to). Сон, идущий через полночь,
// делится между сутками — иначе итог за день врёт на несколько часов.
function sleepMsInWindow(e, from, to, now) {
  const start = e.started_at
  const end = e.ended_at == null ? now : e.ended_at
  const a = Math.max(start, from)
  const b = Math.min(end, to)
  return b > a ? b - a : 0
}

export function summaryFor(events, from, to, now = Date.now()) {
  const inWindow = (ms) => ms >= from && ms < to

  const feeds = events.filter((e) => e.type === 'feed' && inWindow(e.started_at))
  const diapers = events.filter((e) => e.type === 'diaper' && inWindow(e.started_at))
  const sleeps = events.filter((e) => e.type === 'sleep' && sleepMsInWindow(e, from, to, now) > 0)

  let sleepMs = 0
  let nightMs = 0
  let longest = 0
  for (const s of sleeps) {
    const ms = sleepMsInWindow(s, from, to, now)
    sleepMs += ms
    if (isNightSleep(s.started_at)) nightMs += ms
    const full = (s.ended_at == null ? now : s.ended_at) - s.started_at
    if (full > longest) longest = full
  }

  const bottleMl = feeds.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  return {
    feeds: {
      count: feeds.length,
      breast: feeds.filter((e) => e.kind === 'breast').length,
      bottle: feeds.filter((e) => e.kind === 'bottle').length,
      food: feeds.filter((e) => e.kind === 'food').length,
      ml: bottleMl,
      list: feeds,
    },
    diapers: {
      count: diapers.length,
      wet: diapers.filter((e) => e.kind === 'wet' || e.kind === 'both').length,
      dirty: diapers.filter((e) => e.kind === 'dirty' || e.kind === 'both').length,
    },
    sleep: {
      totalMs: sleepMs,
      nightMs,
      dayMs: sleepMs - nightMs,
      count: sleeps.length,
      longestMs: longest,
    },
  }
}

export function todaySummary(events, now = Date.now()) {
  const from = dayStart(now)
  return summaryFor(events, from, from + DAY, now)
}

// Ряд по дням, свежий день последний — так его удобно рисовать столбиками.
export function dailySeries(events, days = 7, now = Date.now()) {
  const today = dayStart(now)
  const out = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const from = today - i * DAY
    out.push({ day: from, ...summaryFor(events, from, from + DAY, now) })
  }
  return out
}

// Промежутки между началами событий одного типа, свежие первыми.
export function intervals(events, type, limit = 12) {
  const list = events
    .filter((e) => e.type === type)
    .sort((a, b) => b.started_at - a.started_at)
    .slice(0, limit + 1)
  const out = []
  for (let i = 0; i < list.length - 1; i += 1) {
    const diff = list[i].started_at - list[i + 1].started_at
    if (diff > 0 && diff < DAY) out.push(diff)
  }
  return out
}

export function median(list) {
  if (!list.length) return null
  const sorted = [...list].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

// Когда примерно ждать следующее кормление. Медиана, а не среднее: одна ночная
// пауза в шесть часов иначе перекашивает прогноз на весь день.
export function predictNext(events, type, now = Date.now()) {
  const gaps = intervals(events, type, 10)
  if (gaps.length < 3) return null
  const step = median(gaps)
  const last = events
    .filter((e) => e.type === type)
    .sort((a, b) => b.started_at - a.started_at)[0]
  if (!last || !step) return null
  return { at: last.started_at + step, step, from: last.started_at, now }
}

// Сколько дней подряд есть хоть одна запись — маленькая, но честная метрика
// того, что дневник действительно ведут.
export function streakDays(events, now = Date.now()) {
  if (!events.length) return 0
  const days = new Set(events.map((e) => dayStart(e.started_at)))
  let streak = 0
  let cursor = dayStart(now)
  // Сегодня может быть ещё пустым — это не обрыв серии.
  if (!days.has(cursor)) cursor -= DAY
  while (days.has(cursor)) {
    streak += 1
    cursor -= DAY
  }
  return streak
}
