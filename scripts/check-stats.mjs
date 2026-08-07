// Проверка расчётов на синтетических сутках. Запуск: node scripts/check-stats.mjs
// Статистика — единственное место, где ошибка не видна глазом: числа всегда
// выглядят правдоподобно. Поэтому считаем руками и сверяем.
import { summaryFor, dailySeries, predictNext, intervals, median, isNightSleep, streakDays } from '../src/lib/stats.js'
import { toCsv } from '../src/lib/export.js'
import { DAY, HOUR, MINUTE, dayStart } from '../src/lib/time.js'

let failed = 0
const eq = (name, got, want) => {
  const okay = JSON.stringify(got) === JSON.stringify(want)
  if (!okay) failed += 1
  console.log(`${okay ? 'ok  ' : 'FAIL'} ${name}${okay ? '' : `\n     получено ${JSON.stringify(got)}\n     ожидалось ${JSON.stringify(want)}`}`)
}

// Опорная точка: сегодня 12:00, чтобы день был наполовину прожит.
const today = dayStart(Date.now())
const noon = today + 12 * HOUR
const at = (h, m = 0) => today + h * HOUR + m * MINUTE

const ev = (o) => ({ id: Math.random().toString(36).slice(2), deleted: false, ...o })

const events = [
  ev({ type: 'feed', started_at: at(3), kind: 'breast', side: 'left' }),
  ev({ type: 'feed', started_at: at(6), kind: 'bottle', amount: 120 }),
  ev({ type: 'feed', started_at: at(9), kind: 'bottle', amount: 90 }),
  ev({ type: 'diaper', started_at: at(3, 10), kind: 'wet' }),
  ev({ type: 'diaper', started_at: at(7), kind: 'both' }),
  // ночной сон через полночь: 22:00 вчера -> 05:00 сегодня = 5 ч в этих сутках
  ev({ type: 'sleep', started_at: today - 2 * HOUR, ended_at: at(5) }),
  // дневной сон 10:00–11:30
  ev({ type: 'sleep', started_at: at(10), ended_at: at(11, 30) }),
]

const s = summaryFor(events, today, today + DAY, noon)

eq('кормлений за сутки', s.feeds.count, 3)
eq('из них бутылочек', s.feeds.bottle, 2)
eq('смеси, мл', s.feeds.ml, 210)
eq('подгузников', s.diapers.count, 2)
eq('мокрых (both считается мокрым)', s.diapers.wet, 2)
eq('по-большому', s.diapers.dirty, 1)
eq('сон всего, ч', s.sleep.totalMs / HOUR, 6.5)
eq('ночной сон обрезан полуночью, ч', s.sleep.nightMs / HOUR, 5)
eq('дневной сон, ч', s.sleep.dayMs / HOUR, 1.5)
eq('снов затронуло сутки', s.sleep.count, 2)
eq('самый долгий сон целиком, ч', s.sleep.longestMs / HOUR, 7)

// Идущий сейчас сон считается до текущего момента, а не до конца суток.
const running = [ev({ type: 'sleep', started_at: at(11), ended_at: null })]
eq(
  'незакрытый сон считается до "сейчас", ч',
  summaryFor(running, today, today + DAY, noon).sleep.totalMs / HOUR,
  1
)

// Ночь по границе 19:00–06:00
eq('03:00 — ночь', isNightSleep(at(3)), true)
eq('13:00 — день', isNightSleep(at(13)), false)
eq('20:00 — ночь', isNightSleep(at(20)), true)

// Ряд по дням: последний элемент — сегодня
const series = dailySeries(events, 7, noon)
eq('в ряду 7 дней', series.length, 7)
eq('последний день — сегодня', series[6].day, today)
eq('кормления попали в сегодня', series[6].feeds.count, 3)
eq('вчера пусто', series[5].feeds.count, 0)

// Прогноз: перерывы 3 ч, значит следующее кормление через 3 ч после последнего
const gaps = intervals(events, 'feed', 10)
eq('перерывов между кормлениями', gaps.length, 2)
eq('медиана перерывов, ч', median(gaps) / HOUR, 3)
const next = predictNext(
  [...events, ev({ type: 'feed', started_at: at(12), kind: 'breast' })],
  'feed',
  noon
)
eq('прогноз следующего кормления', next.at, at(15))

// Меньше трёх перерывов — прогноза быть не должно, иначе он врёт
eq(
  'без истории прогноза нет',
  predictNext([ev({ type: 'feed', started_at: at(9) })], 'feed', noon),
  null
)

// Серия дней подряд
eq(
  'серия — 3 дня',
  streakDays(
    [
      ev({ type: 'feed', started_at: today - 2 * DAY }),
      ev({ type: 'feed', started_at: today - DAY }),
      ev({ type: 'feed', started_at: noon }),
    ],
    noon
  ),
  3
)
eq(
  'вчерашний обрыв не ломает серию сегодня',
  streakDays([ev({ type: 'feed', started_at: today - DAY })], noon),
  1
)

// Удалённые записи не должны попадать в выгрузку
const csv = toCsv([...events, ev({ type: 'feed', started_at: at(4), deleted: true })])
eq('в CSV строк = шапка + 7 событий', csv.trim().split('\n').length, 8)
eq('в CSV есть объём', csv.includes('120'), true)
eq('точка с запятой как разделитель', csv.split('\n')[0].split(';').length, 7)

console.log(failed ? `\n${failed} проверок упало` : '\nвсе проверки прошли')
process.exit(failed ? 1 : 0)
