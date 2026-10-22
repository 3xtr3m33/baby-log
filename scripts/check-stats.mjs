// Проверка расчётов на синтетических сутках. Запуск: node scripts/check-stats.mjs
// Статистика — единственное место, где ошибка не видна глазом: числа всегда
// выглядят правдоподобно. Поэтому считаем руками и сверяем.
import { summaryFor, dailySeries, predictNext, intervals, median, isNightSleep, streakDays } from '../src/lib/stats.js'
import { toCsv } from '../src/lib/export.js'
import { matchDay, nextFeeding, adherence, generateTimes, normalizeTimes } from '../src/lib/schedule.js'
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
// ── график: план против факта ──────────────────────────────────────────────
eq('нормализация времён', normalizeTimes(['9:00', '06:00', 'мусор', '06:00', '23:59']), ['06:00', '09:00', '23:59'])
eq('каждые 3 ч с 06:00 ×4', generateTimes('06:00', 3, 4), ['06:00', '09:00', '12:00', '15:00'])
eq('через полночь', generateTimes('21:00', 3, 3), ['00:00', '03:00', '21:00'])

const sched = { times: ['03:00', '06:00', '09:00', '12:00', '15:00'], toleranceMin: 15 }
const feedsDay = [
  ev({ type: 'feed', started_at: at(3, 5) }), // вовремя (+5)
  ev({ type: 'feed', started_at: at(6, 40) }), // позже (+40)
  ev({ type: 'feed', started_at: at(8, 20) }), // раньше (−40), окно 9:00 начинается с 7:30
  ev({ type: 'feed', started_at: at(8, 50) }), // второе в окне 9:00 — вне графика
]
const m = matchDay(sched, feedsDay, noon, at(12, 30))
eq('статусы слотов', m.slots.map((x) => x.status), ['ontime', 'late', 'early', 'overdue', 'upcoming'])
eq('отклонения, мин', m.slots.slice(0, 3).map((x) => x.deltaMs / MINUTE), [5, 40, -40])
eq('вне графика', m.extra.length, 1)

const m2 = matchDay(sched, feedsDay, noon, at(14, 0))
eq('12:00 без факта после окна = пропущено', m2.slots[3].status, 'missed')

const nf = nextFeeding(sched, feedsDay, at(12, 30))
eq('следующее — опаздывающее 12:00', nf && nf.plan, at(12))

const a = adherence(sched, feedsDay, 1, at(16, 0))
// 15:00 в 16:00 ещё в своём окне (до 21:00) — в итог не идёт
eq('соблюдение за сутки', [a.ontime, a.late, a.early, a.missed, a.total], [1, 1, 1, 1, 4])
const a7 = adherence(sched, feedsDay, 7, at(16, 0))
eq('пустые дни до дневника не считаются пропусками', a7.total, 4)

// график из заметки: 07:50 на 07:00 — позже, 09:53 на 09:30 — позже, 17:07 на 17:00 — вовремя
const liam = { times: ['00:00', '03:30', '07:00', '09:30', '12:00', '14:30', '17:00', '20:00'], toleranceMin: 15 }
const liamFeeds = [ev({ type: 'feed', started_at: at(7, 50) }), ev({ type: 'feed', started_at: at(9, 53) }), ev({ type: 'feed', started_at: at(12) }), ev({ type: 'feed', started_at: at(14, 59) }), ev({ type: 'feed', started_at: at(17, 7) })]
const lm = matchDay(liam, liamFeeds, noon, at(19, 15))
eq('заметка: статусы', lm.slots.map((x) => x.status), ['missed', 'missed', 'late', 'late', 'ontime', 'late', 'ontime', 'upcoming'])


