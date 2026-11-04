import type { DriveStep } from 'driver.js'

export type TourView = 'project' | 'meal'

export const tours: Record<TourView, DriveStep[]> = {
  project: [
    {
      element: '[data-tour="event-header"]',
      popover: {
        title: 'Your event',
        description: 'The event name with its upcoming and past meals and the guest count, broken down by adults and kids.',
      },
    },
    {
      element: '[data-tour="event-meal-tile"]',
      popover: {
        title: 'Open a planned meal',
        description: 'Click a meal to build its menu and manage who is attending.',
      },
    },
    {
      element: '[data-tour="event-add-meal"]',
      popover: {
        title: 'Plan a new meal',
        description: 'Give it a name, date and time, then choose which guests will attend or pick "Select all guests".',
      },
    },
    {
      element: '[data-tour="event-guests"]',
      popover: {
        title: 'Manage the guest list',
        description: 'Everyone invited to the event lives here. Add or edit guests, and meals pick their attendees from this list.',
      },
    },
    {
      element: '[data-tour="event-share"]',
      popover: {
        title: 'Share the event',
        description: 'Send a link to this event by email or text message, or copy it.',
        side: 'bottom',
        align: 'end',
      },
    },
  ],
  meal: [
    {
      element: '[data-tour="meal-header"]',
      popover: {
        title: 'Meal details',
        description: 'The date, time and how many guests are attending this meal.',
      },
    },
    {
      element: '[data-tour="meal-new-item"]',
      popover: {
        title: 'Add a menu item',
        description:
          'Click "+ New item", type a name, choose a category, and pick who is bringing it. Press Enter to save. The row stays open so you can add several items quickly. Esc cancels.',
      },
    },
    {
      element: '[data-tour="meal-items-table"]',
      popover: {
        title: 'Your menu',
        description:
          'Items are grouped into Starters, Mains, Sides and Desserts. Click any cell to edit it in place. Changing the category moves the item to the right group.',
      },
    },
    {
      element: '[data-tour="meal-attending-table"]',
      popover: {
        title: 'Change or remove guests',
        description:
          'Swap a guest for another with the dropdown, or use the trash icon to remove them from this meal. Removing a guest also unassigns their items.',
      },
    },
    {
      element: '[data-tour="meal-share"]',
      popover: {
        title: 'Share the meal',
        description: 'Send a link to this meal by email or text message, or copy it.',
        side: 'bottom',
        align: 'end',
      },
    },
  ],
}
