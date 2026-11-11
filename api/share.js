// Serves link-preview (Open Graph) metadata for shared event/meal links, then sends people to the app.
const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const UUID = /^[0-9a-f-]{36}$/i

const formatDate = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  return m ? `${m[2]}/${m[3]}/${m[1].slice(2)}` : ''
}

const formatTime = (value) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? '')
  if (!m) return ''
  const h = Number(m[1])
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}

async function query(base, key, path) {
  const res = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`Share preview data request failed with status ${res.status}`)
  const rows = await res.json()
  return rows[0] ?? null
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`)
  const eventId = url.searchParams.get('event') ?? ''
  const mealId = url.searchParams.get('meal') ?? ''
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  let title = 'Feeding Five Thousand'
  let description = 'Plan group meals, guests and who is bringing what.'

  if (base && key && UUID.test(eventId)) {
    try {
      const project = await query(base, key, `projects?id=eq.${eventId}&select=name,description`)
      if (project) {
        title = project.name
        description = project.description || 'Group meal plan'
        if (UUID.test(mealId)) {
          const meal = await query(base, key, `meals?id=eq.${mealId}&project_id=eq.${eventId}&select=title,date,start_time,location`)
          if (meal) {
            title = `${meal.title} - ${project.name}`
            description = [formatDate(meal.date), formatTime(meal.start_time), meal.location].filter(Boolean).join(' • ') || description
          }
        }
      }
    } catch (error) {
      console.error('Unable to load share preview details:', error)
    }
  }

  const params = new URLSearchParams()
  if (UUID.test(eventId)) params.set('event', eventId)
  if (UUID.test(mealId)) params.set('meal', mealId)
  const target = `/?${params.toString()}`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Feeding Five Thousand" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
</head>
<body>
<script>location.replace(${JSON.stringify(target)})</script>
<a href="${esc(target)}">Open ${esc(title)}</a>
</body>
</html>`)
}
