// Напоминания о кормлении по графику.
// В приложении из магазина (Capacitor) — системные локальные уведомления:
// ставятся один раз на каждое плановое время, повторяются каждый день и
// приходят, даже если приложение закрыто и нет интернета.
// В браузере — уведомление, пока вкладка жива (это предел веба без сервера).
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { normalizeSchedule, hasSchedule, reminderMoments } from './schedule.js'
import { fmtClock } from './time.js'

const CHANNEL = 'feeding'
const ID_BASE = 7000 // id напоминаний: 7000 + номер слота

export const isNative = () => Capacitor.isNativePlatform()

export function supported() {
  if (isNative()) return true
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function permission() {
  if (isNative()) {
    const { display } = await LocalNotifications.checkPermissions()
    return display // 'granted' | 'denied' | 'prompt'
  }
  if (!('Notification' in window)) return 'denied'
  return Notification.permission === 'default' ? 'prompt' : Notification.permission
}

export async function requestPermission() {
  if (isNative()) {
    const { display } = await LocalNotifications.requestPermissions()
    return display
  }
  if (!('Notification' in window)) return 'denied'
  const res = await Notification.requestPermission()
  return res === 'default' ? 'prompt' : res
}

function bodyFor(hhmm, before) {
  return before > 0 ? `Через ${before} мин кормление по графику (${hhmm})` : `Кормление по графику (${hhmm})`
}

// ── нативно ────────────────────────────────────────────────────────────────
async function nativeReschedule(schedule) {
  const pending = await LocalNotifications.getPending()
  const ours = pending.notifications.filter((n) => n.id >= ID_BASE && n.id < ID_BASE + 100)
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) })

  const s = normalizeSchedule(schedule)
  if (!hasSchedule(s) || !(s.remindBeforeMin > 0)) return
  if ((await permission()) !== 'granted') return

  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: 'Кормления по графику',
      importance: 5,
      vibration: true,
    })
  }

  const notifications = s.times.map((hhmm, i) => {
    const [h, m] = hhmm.split(':').map(Number)
    const total = (h * 60 + m - s.remindBeforeMin + 1440) % 1440
    return {
      id: ID_BASE + i,
      title: 'Скоро кормление',
      body: bodyFor(hhmm, s.remindBeforeMin),
      channelId: CHANNEL,
      schedule: { on: { hour: Math.floor(total / 60), minute: total % 60 }, allowWhileIdle: true },
    }
  })
  await LocalNotifications.schedule({ notifications })
}

// ── браузер ────────────────────────────────────────────────────────────────
let timers = []

async function show(title, body) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, tag: 'feeding', renotify: true })
      return
    }
  } catch {
    /* без service worker — обычным уведомлением */
  }
  new Notification(title, { body, tag: 'feeding' })
}

function webReschedule(schedule) {
  timers.forEach(clearTimeout)
  timers = []
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const s = normalizeSchedule(schedule)
  for (const { plan, at } of reminderMoments(s)) {
    const wait = at - Date.now()
    // Таймеры дольше ~24 дней браузер не держит; горизонт и так сутки.
    timers.push(setTimeout(() => show('Скоро кормление', bodyFor(fmtClock(plan), s.remindBeforeMin)), wait))
  }
}

export async function reschedule(schedule) {
  try {
    if (isNative()) await nativeReschedule(schedule)
    else webReschedule(schedule)
  } catch {
    /* напоминание — помощь, а не обязанность: ошибка не должна ронять экран */
  }
}
