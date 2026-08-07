// Прогон экранов через серверный рендер: ловит опечатки в пропсах и обращения
// к несуществующим полям, которые сборка пропускает, а телефон показывает
// белым экраном. Запуск: node scripts/check-render.mjs
import { build } from 'esbuild'
import { writeFileSync, unlinkSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const entry = new URL('./_render-entry.jsx', import.meta.url)
const out = new URL('./_render-out.mjs', import.meta.url)

writeFileSync(
  entry,
  `
import { renderToStaticMarkup } from 'react-dom/server'
import StatsScreen from '../src/screens/StatsScreen.jsx'
import HistoryScreen from '../src/screens/HistoryScreen.jsx'
import TimeSheet from '../src/components/TimeSheet.jsx'
import TabBar from '../src/components/TabBar.jsx'
import Toast from '../src/components/Toast.jsx'
import Ribbon from '../src/components/Ribbon.jsx'
import SummaryCard from '../src/components/SummaryCard.jsx'
import { THEMES } from '../src/lib/tokens.js'

const t = THEMES.dark
const now = Date.now()
const HOUR = 3600000
const ev = (o) => ({ id: String(Math.random()), deleted: false, ...o })
const events = [
  ev({ type: 'feed', started_at: now - 2 * HOUR, kind: 'bottle', amount: 120, note: 'срыгнул' }),
  ev({ type: 'feed', started_at: now - 5 * HOUR, kind: 'breast', side: 'left' }),
  ev({ type: 'diaper', started_at: now - 3 * HOUR, kind: 'both' }),
  ev({ type: 'sleep', started_at: now - 9 * HOUR, ended_at: now - 6 * HOUR }),
  ev({ type: 'sleep', started_at: now - HOUR, ended_at: null }),
]

export const cases = {
  StatsScreen: () => renderToStaticMarkup(<StatsScreen t={t} events={events} now={now} />),
  'StatsScreen (пусто)': () => renderToStaticMarkup(<StatsScreen t={t} events={[]} now={now} />),
  HistoryScreen: () =>
    renderToStaticMarkup(<HistoryScreen t={t} events={events} now={now} onEdit={() => {}} />),
  'HistoryScreen (пусто)': () =>
    renderToStaticMarkup(<HistoryScreen t={t} events={[]} now={now} onEdit={() => {}} />),
  'TimeSheet (кормление)': () =>
    renderToStaticMarkup(
      <TimeSheet t={t} open type="feed" draft={{ started_at: now, kind: 'bottle', amount: 90 }} title="Тест" onSave={() => {}} onClose={() => {}} />
    ),
  'TimeSheet (сон)': () =>
    renderToStaticMarkup(
      <TimeSheet t={t} open type="sleep" draft={{ started_at: now, ended_at: null }} title="Тест" onSave={() => {}} onClose={() => {}} onDelete={() => {}} />
    ),
  TabBar: () => renderToStaticMarkup(<TabBar t={t} value="today" onChange={() => {}} />),
  Toast: () =>
    renderToStaticMarkup(<Toast t={t} toast={{ text: 'Записано', undo: () => {} }} onClose={() => {}} />),
  Ribbon: () => renderToStaticMarkup(<Ribbon t={t} events={events} now={now} />),
  SummaryCard: () =>
    renderToStaticMarkup(<SummaryCard t={t} color={t.accent.feed} label="Кормлений" value={4} hint="240 мл" />),
}
`
)

await build({
  entryPoints: [entry.pathname.replace(/^\//, '')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  outfile: out.pathname.replace(/^\//, ''),
  external: ['react', 'react-dom', 'react-dom/server'],
  logLevel: 'error',
})

const { cases } = await import(pathToFileURL(out.pathname.replace(/^\//, '')).href)

let failed = 0
for (const [name, run] of Object.entries(cases)) {
  try {
    const html = run()
    if (!html || html.length < 20) throw new Error('пустая разметка')
    console.log(`ok   ${name} (${html.length} символов)`)
  } catch (err) {
    failed += 1
    console.log(`FAIL ${name}\n     ${err.message}`)
  }
}

unlinkSync(entry)
unlinkSync(out)

console.log(failed ? `\n${failed} экранов упало` : '\nвсе экраны рендерятся')
process.exit(failed ? 1 : 0)
