import { useCallback, useEffect, useRef } from 'react'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { tours, type TourView } from './tours'

const STORAGE_KEY = 'ff-tour-seen'

function readSeen(): Partial<Record<TourView, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function markSeen(view: TourView) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSeen(), [view]: true }))
  } catch {
    // storage unavailable; the tour will simply run again next visit
  }
}

export function useTour(view: TourView, enabled: boolean) {
  const driverRef = useRef<Driver | null>(null)

  const destroy = useCallback(() => {
    driverRef.current?.destroy()
    driverRef.current = null
  }, [])

  const startTour = useCallback(() => {
    destroy()
    const steps = tours[view].filter((step) => !step.element || document.querySelector(step.element as string))
    if (steps.length === 0) return
    const instance = driver({
      steps,
      showProgress: true,
      allowClose: true,
      smoothScroll: false,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: 'ff-tour-popover',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      // The popover is measured while the page is still scrolling; re-position once it settles
      onHighlighted: () => {
        window.setTimeout(() => driverRef.current?.refresh(), 150)
      },
      onDestroyed: () => {
        markSeen(view)
        driverRef.current = null
      },
    })
    driverRef.current = instance
    instance.drive()
  }, [destroy, view])

  useEffect(() => {
    if (!enabled || readSeen()[view]) return
    const timer = window.setTimeout(startTour, 600)
    return () => {
      window.clearTimeout(timer)
      destroy()
    }
  }, [enabled, view, startTour, destroy])

  return { startTour }
}
