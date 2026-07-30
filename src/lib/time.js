// Работа со временем. Внутри приложения время всегда число (мс).

const pad = (n) => String(n).padStart(2, '0')

export function plural(n, forms) {
  const abs = Math.abs(n) % 100
  const tail = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (tail > 1 && tail < 5) return forms[1]
  if (tail === 1) return forms[0]
  return forms[2]
}

// 1712345678901 -> "14:35"
export function fmtClock(ms) {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Длительность в человеческом виде: "2 ч 15 мин", "45 мин", "1 д 3 ч"
export function fmtDur(diff) {
  if (diff == null || Number.isNaN(diff)) return '—'
  const total = Math.max(0, Math.round(diff / 60000))
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const mins = total % 60
  if (days > 0) return hours > 0 ? `${days} д ${hours} ч` : `${days} д`
  if (hours > 0) return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
  return `${mins} мин`
}

// Короткая форма для крупных счётчиков: "2:15" / "45 мин"
export function fmtDurShort(diff) {
  if (diff == null || Number.isNaN(diff)) return '—'
  const total = Math.max(0, Math.round(diff / 60000))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours > 0) return `${hours}:${pad(mins)}`
  return `${mins} мин`
}

// мс -> строка для <input type="datetime-local">
export function toInput(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}

// строка из <input type="datetime-local"> -> мс
export function fromInput(value) {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function dayStart(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function isSameDay(a, b) {
  return dayStart(a) === dayStart(b)
}

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

// "Сегодня" / "Вчера" / "12 марта"
export function fmtDayTitle(ms, now = Date.now()) {
  const start = dayStart(ms)
  const today = dayStart(now)
  if (start === today) return 'Сегодня'
  if (start === today - 86400000) return 'Вчера'
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export const MINUTE = 60000
export const HOUR = 3600000
export const DAY = 86400000
