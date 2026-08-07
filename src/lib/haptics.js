// Короткая вибрация на подтверждение действия. Ночью в темноте это
// единственный способ понять, что нажатие засчиталось, не вглядываясь в экран.
// На iOS Vibration API нет — там просто ничего не произойдёт, и это нормально.
export function tap(pattern = 12) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* вибрация — приятный бонус, её отсутствие не ошибка */
  }
}

export const ok = () => tap(12)
export const done = () => tap([10, 40, 18])
export const warn = () => tap([24, 60, 24])
