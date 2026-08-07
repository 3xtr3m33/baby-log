// Выгрузка дневника: CSV для врача и таблиц, JSON — полная копия на всякий случай.
import { kindLabel, sideLabel, TYPE_META } from './tokens.js'

const pad = (n) => String(n).padStart(2, '0')

function stamp(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}

function fileStamp(ms = Date.now()) {
  const d = new Date(ms)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

// Excel открывает CSV по-человечески только с BOM и точкой с запятой.
function cell(value) {
  const s = value == null ? '' : String(value)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(events) {
  const head = ['Дата и время', 'Событие', 'Вид', 'Окончание', 'Длительность, мин', 'Объём, мл', 'Кто']
  const rows = [...events]
    .filter((e) => !e.deleted)
    .sort((a, b) => a.started_at - b.started_at)
    .map((e) => [
      stamp(e.started_at),
      TYPE_META[e.type]?.title || e.type,
      kindLabel(e.type, e.kind) || (e.side ? sideLabel(e.side) : ''),
      e.ended_at == null ? '' : stamp(e.ended_at),
      e.ended_at == null ? '' : Math.round((e.ended_at - e.started_at) / 60000),
      e.amount ?? '',
      e.by_name || '',
    ])
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(';')).join('\n')
}

export function download(name, text, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCsv(events) {
  download(`dnevnik-${fileStamp()}.csv`, toCsv(events), 'text/csv')
}

export function exportJson(events) {
  const payload = { exportedAt: new Date().toISOString(), version: 1, events }
  download(`dnevnik-${fileStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json')
}

// Текст для мессенджера: врачу или второму родителю, когда файл слать некуда.
export function summaryText(summary, dayLabel) {
  const h = Math.floor(summary.sleep.totalMs / 3600000)
  const m = Math.round((summary.sleep.totalMs % 3600000) / 60000)
  const lines = [
    `${dayLabel}`,
    `Кормления: ${summary.feeds.count}${summary.feeds.ml ? ` (${summary.feeds.ml} мл)` : ''}`,
    `Подгузники: ${summary.diapers.count} (мокрых ${summary.diapers.wet}, по-большому ${summary.diapers.dirty})`,
    `Сон: ${h} ч ${m} мин за ${summary.sleep.count}`,
  ]
  return lines.join('\n')
}
