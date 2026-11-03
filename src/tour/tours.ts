import type { DriveStep } from 'driver.js'

export type TourView = 'dashboard' | 'project' | 'meal'

export const tours: Record<TourView, DriveStep[]> = {
  dashboard: [
    {
      popover: {
        title: 'Welcome to Feeding Five Thousand 👋',
        description:
          'Plan group meals together: create an event, add your guests, then build a menu for each meal. This quick tour takes about a minute.',
      },
    },
    {
      element: '[data-tour="dash-create-event"]',
      popover: {
        title: 'Start an event',
        description: 'Create an event for a trip, party or gathering. Each event has its own guests and meals.',
      },
    },
    {
      element: '.project-card',
      popover: {
        title: 'Open an event',
        description: 'Click any event tile to manage its guests and meals.',
      },
    },
    {
      element: '.project-card .event-card-footer',
      popover: {
        title: 'Event at a glance',
        description: 'See how many guests are coming and how many meals are upcoming or already past.',
      },
    },
  ],
  project: [
    {
      element: '[data-tour="event-header"]',
      popover: {
        title: 'Your event summary',
        description: 'Upcoming and past meals plus the guest count, broken down by adults, kids and toddlers.',
      },
    },
    {
      element: '[data-tour="event-attendees-toggle"]',
      popover: {
        title: 'Manage the guest list',
        description: 'Everyone invited to the event lives here. Meals pick their guests from this list.',
      },
    },
    {
      element: '[data-tour="event-new-attendee"]',
      popover: {
        title: 'Add a guest',
        description:
          'Click "+ New guest", then fill in first name, last name, age group and dietary requests (pick "none" if there are none). Press Enter to save or Esc to cancel. Edit any guest by clicking into their row.',
      },
    },
    {
      element: '[data-tour="event-add-meal"]',
      popover: {
        title: 'Add a meal',
        description: 'Give it a name, date and time, then choose which guests will attend or pick "Select all guests".',
      },
    },
    {
      element: '[data-tour="event-meal-tile"]',
      popover: {
        title: 'Open a meal',
        description: 'Click a meal to build its menu and manage its guests.',
      },
    },
    {
      element: '[data-tour="nav-back"]',
      popover: {
        title: 'Getting around',
        description: 'Use the back button to return to your events. You can replay this tour any time with "Take the tour".',
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
      element: '[data-tour="meal-items-table"] thead th:nth-child(4)',
      popover: {
        title: 'Who is bringing it?',
        description: "Pick anyone from the event. If they aren't attending this meal yet, they're added to its guest list automatically.",
      },
    },
    {
      element: '[data-tour="meal-add-guest"]',
      popover: {
        title: 'Update attending guests',
        description:
          'Open this dropdown to tick one or more event guests, choose "Select all guests", or add a brand-new guest, then confirm with the blue button.',
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
      element: '[data-tour="nav-back"]',
      popover: {
        title: 'Back to the event',
        description: 'Return to the event to manage all guests and other meals.',
      },
    },
  ],
}
