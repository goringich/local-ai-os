import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const required = [
  '49 900 ₽',
  '9 900 ₽',
  '5 рабочих дней',
  'до 3 проектов',
  'https://t.me/a1gorithms',
  'actingsv@gmail.com',
  'Не обещаем полную автономию',
  'Restore dry-run',
]

for (const value of required) {
  if (!app.includes(value)) throw new Error(`Missing offer invariant: ${value}`)
}

const forbidden = ['my-cv', 'портфолио', 'Frontend Developer', 'резюме']
for (const value of forbidden) {
  if (`${app}\n${html}`.toLowerCase().includes(value.toLowerCase())) {
    throw new Error(`Portfolio coupling detected: ${value}`)
  }
}

console.log(`Offer contract OK: ${required.length} invariants, no portfolio coupling`)
