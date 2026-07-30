// Палитра и типографика. Единственный источник цветов в приложении.

export const ACCENT = {
  feed: '#F5A524',
  diaper: '#2FBF9B',
  sleep: '#6E7BFF',
}

const dark = {
  name: 'dark',
  bg: '#10131A',
  bgSoft: '#141821',
  card: '#171B24',
  cardAlt: '#1E232E',
  line: '#262C38',
  text: '#EEF1F6',
  dim: '#8A93A6',
  dimmer: '#5C6478',
  danger: '#FF6B6B',
  overlay: 'rgba(6, 8, 12, 0.72)',
  shadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
  accent: ACCENT,
}

const light = {
  name: 'light',
  bg: '#F4F6FA',
  bgSoft: '#EDF0F6',
  card: '#FFFFFF',
  cardAlt: '#F1F3F8',
  line: '#E1E5EE',
  text: '#10131A',
  dim: '#6B7385',
  dimmer: '#98A0B2',
  danger: '#D64545',
  overlay: 'rgba(16, 19, 26, 0.45)',
  shadow: '0 18px 40px rgba(16, 19, 26, 0.12)',
  accent: {
    feed: '#C97F0B',
    diaper: '#149377',
    sleep: '#4A57E0',
  },
}

export const THEMES = { dark, light }

export const FONT = {
  head: "'Onest', system-ui, -apple-system, 'Segoe UI', sans-serif",
  body: "'Golos Text', system-ui, -apple-system, 'Segoe UI', sans-serif",
}

export const TYPE = {
  h1: { fontFamily: FONT.head, fontSize: 26, fontWeight: 700, letterSpacing: -0.4 },
  h2: { fontFamily: FONT.head, fontSize: 19, fontWeight: 600, letterSpacing: -0.2 },
  big: { fontFamily: FONT.head, fontSize: 34, fontWeight: 700, letterSpacing: -0.8 },
  body: { fontFamily: FONT.body, fontSize: 15, fontWeight: 400 },
  label: { fontFamily: FONT.body, fontSize: 13, fontWeight: 500 },
  caption: { fontFamily: FONT.body, fontSize: 12, fontWeight: 400 },
}

export const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 }
export const SPACE = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 }

// Подписи типов событий — в одном месте, чтобы не расходились по экранам.
export const TYPE_META = {
  feed: { title: 'Кормление', action: 'Покормили', color: 'feed', since: 'С кормления' },
  diaper: { title: 'Подгузник', action: 'Подгузник', color: 'diaper', since: 'С подгузника' },
  sleep: { title: 'Сон', action: 'Уснул', color: 'sleep', since: 'С пробуждения' },
}

export const KINDS = {
  feed: [
    { value: 'breast', label: 'Грудь' },
    { value: 'bottle', label: 'Бутылочка' },
    { value: 'food', label: 'Прикорм' },
  ],
  diaper: [
    { value: 'wet', label: 'Мокрый' },
    { value: 'dirty', label: 'По-большому' },
    { value: 'both', label: 'Оба' },
  ],
  sleep: [],
}

// Общие стили полей и кнопок экранов входа и семьи.
export const field = (t) => ({
  appearance: 'none',
  width: '100%',
  background: t.card,
  border: `1px solid ${t.line}`,
  borderRadius: 16,
  color: t.text,
  padding: '16px 16px',
  fontSize: 17,
  outline: 'none',
})

export const primary = (t, busy) => ({
  appearance: 'none',
  width: '100%',
  border: 'none',
  borderRadius: 16,
  background: t.text,
  color: t.bg,
  padding: '16px 16px',
  fontSize: 16,
  fontWeight: 600,
  cursor: busy ? 'default' : 'pointer',
  opacity: busy ? 0.6 : 1,
})

export const link = (t) => ({
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: t.dim,
  fontSize: 14,
  cursor: 'pointer',
  padding: 6,
})

export function kindLabel(type, kind) {
  const found = (KINDS[type] || []).find((k) => k.value === kind)
  return found ? found.label : ''
}
