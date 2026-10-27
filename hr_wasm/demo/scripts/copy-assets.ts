// Copies the wasm build and the demo fonts into public/. Run `scripts/build-wasm` first.
import { copyFileSync, mkdirSync } from 'node:fs'

const root = new URL('../../../', import.meta.url)
const fonts = new URL('test-data/harfrust/harfrust/benches/fonts/', root)
const output = new URL('../public/', import.meta.url)

mkdirSync(new URL('fonts/', output), { recursive: true })
copyFileSync(
  new URL('hr_wasm/js/dist/harfrust.wasm', root),
  new URL('harfrust.wasm', output),
)
for (const name of [
  'Roboto-Regular.ttf',
  'SourceSerifVariable-Roman.ttf',
  'Amiri-Regular.ttf',
  'NotoNastaliqUrdu-Regular.ttf',
  'NotoSansDevanagari-Regular.ttf',
]) {
  copyFileSync(new URL(name, fonts), new URL(`fonts/${name}`, output))
}
