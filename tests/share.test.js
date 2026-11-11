import assert from 'node:assert/strict'
import { test } from 'node:test'
import handler from '../api/share.js'

test('shared event and meal previews retain their titles without an image', async () => {
  const previousUrl = process.env.VITE_SUPABASE_URL
  const previousKey = process.env.VITE_SUPABASE_ANON_KEY
  const originalFetch = globalThis.fetch
  process.env.VITE_SUPABASE_URL = 'https://example.invalid'
  process.env.VITE_SUPABASE_ANON_KEY = 'test-key'
  globalThis.fetch = async (url) => ({
    ok: true,
    json: async () => url.includes('/projects?')
      ? [{ name: 'Family & Friends', description: 'Our event' }]
      : [{ title: 'Dinner', date: '2026-11-12', start_time: '18:30', location: 'Home' }],
  })

  try {
    const headers = {}
    let html = ''
    const res = {
      setHeader: (name, value) => { headers[name] = value },
      status: (code) => {
        assert.equal(code, 200)
        return { send: (body) => { html = body } }
      },
    }
    const eventId = 'a136f6f3-734c-451b-a94d-f03deb4cc519'
    const mealId = '90cd94c2-a0c2-466b-a0f8-3dd86e8b13b0'
    await handler({ url: `/s?event=${eventId}&meal=${mealId}`, headers: { host: 'meals.example.com' } }, res)
    assert.equal(headers['Content-Type'], 'text/html; charset=utf-8')
    assert.match(html, /Dinner - Family &amp; Friends/)
    assert.match(html, /property="og:title" content="Dinner - Family &amp; Friends"/)
    assert.match(html, /name="twitter:title" content="Dinner - Family &amp; Friends"/)
    assert.doesNotMatch(html, /http-equiv="refresh"/i)
    assert.ok(html.includes(`location.replace("/?event=${eventId}&meal=${mealId}")`))
    assert.doesNotMatch(html, /(?:og|twitter):image/i)
    assert.match(html, /name="twitter:card" content="summary"/)
    assert.ok(html.includes(`/?event=${eventId}&amp;meal=${mealId}`))
    await handler({ url: `/s?event=${eventId}`, headers: { host: 'meals.example.com' } }, res)
    assert.match(html, /property="og:title" content="Family &amp; Friends"/)
    assert.match(html, /name="twitter:title" content="Family &amp; Friends"/)
    assert.doesNotMatch(html, /(?:og|twitter):image/i)
    assert.match(html, /name="twitter:card" content="summary"/)
  } finally {
    globalThis.fetch = originalFetch
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL
    else process.env.VITE_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY
    else process.env.VITE_SUPABASE_ANON_KEY = previousKey
  }
})
