import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isPastMeal, sortEventsByUpcomingMeal } from '../src/lib/mealOrder.ts'

test('orders events by their earliest upcoming meal without changing their saved order', () => {
  const now = new Date(2026, 10, 16, 12).getTime()
  const meal = (date, startTime) => ({ date, startTime })
  const events = [
    { name: 'No meals', meals: [] },
    { name: 'Later', meals: [meal('2026-11-18', '09:00'), meal('2026-11-15', '10:00')] },
    { name: 'Soon', meals: [meal('2026-11-17', '18:00'), meal('2026-11-16', '14:00')] },
    { name: 'Earlier today', meals: [meal('2026-11-16', '12:30')] },
    { name: 'Past only', meals: [meal('2026-11-16', '11:59')] },
    { name: 'Same time', meals: [meal('2026-11-16', '14:00')] },
    { name: 'Invalid date', meals: [meal('', '')] },
  ]

  assert.deepEqual(sortEventsByUpcomingMeal(events, now).map((event) => event.name), [
    'Earlier today', 'Soon', 'Same time', 'Later', 'No meals', 'Past only', 'Invalid date',
  ])
  assert.equal(events[0].name, 'No meals')
  assert.equal(events[2].meals[0].date, '2026-11-17')
})

test('uses the meal start time boundary and defaults an empty time to midnight', () => {
  const now = new Date(2026, 10, 16, 12).getTime()
  assert.equal(isPastMeal({ date: '2026-11-16', startTime: '11:59' }, now), true)
  assert.equal(isPastMeal({ date: '2026-11-16', startTime: '12:00' }, now), false)
  assert.equal(isPastMeal({ date: '2026-11-16', startTime: '' }, now), true)
  assert.equal(isPastMeal({ date: '', startTime: '' }, now), false)
  const events = [
    { name: 'Afternoon', meals: [{ date: '2026-11-17', startTime: '12:00' }] },
    { name: 'Midnight', meals: [{ date: '2026-11-17', startTime: '' }] },
  ]
  assert.deepEqual(sortEventsByUpcomingMeal(events, now).map((event) => event.name), ['Midnight', 'Afternoon'])
})
