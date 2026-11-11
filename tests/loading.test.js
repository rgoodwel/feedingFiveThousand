import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('the initial page provides an accessible skeleton before JavaScript loads', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/loading.css', import.meta.url), 'utf8')

  assert.match(html, /<main class="loading-shell" role="status" aria-label="Loading meal planner" aria-busy="true">/)
  assert.equal((html.match(/class="loading-line loading-row"/g) ?? []).length, 4)
  assert.match(html, /href="\/src\/loading\.css"/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
