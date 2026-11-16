import type { Meal } from '../data/sampleData'

type MealTime = Pick<Meal, 'date' | 'startTime'>

function mealStart(meal: MealTime): number {
  return new Date(`${meal.date}T${meal.startTime || '00:00'}:00`).getTime()
}

export function isPastMeal(meal: MealTime, now = Date.now()): boolean {
  return Boolean(meal.date) && mealStart(meal) < now
}

export function sortEventsByUpcomingMeal<T extends { meals: MealTime[] }>(events: T[], now = Date.now()): T[] {
  return events
    .map((event) => {
      let nextMeal = Infinity
      for (const meal of event.meals) {
        const start = mealStart(meal)
        if (Number.isFinite(start) && start >= now && start < nextMeal) nextMeal = start
      }
      return { event, nextMeal }
    })
    .sort((a, b) => a.nextMeal - b.nextMeal || 0)
    .map(({ event }) => event)
}
