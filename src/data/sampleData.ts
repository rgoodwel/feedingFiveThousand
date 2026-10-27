export type VisibilityMode = 'public' | 'public-password' | 'private-password';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner';
export type FoodCategory = 'drink' | 'app' | 'salad' | 'main' | 'side' | 'dessert';

export interface Attendee {
  id: string;
  name: string;
  dietaryRestrictions: string[];
}

export interface MealItem {
  id: string;
  name: string;
  description: string;
  category: FoodCategory;
  personResponsible: string;
}

export interface Meal {
  id: string;
  title: string;
  date: string;
  startTime: string;
  category: MealCategory;
  attendeeCount: number;
  dietarySummary: string;
  status: 'planned' | 'needs-volunteers' | 'confirmed' | 'complete';
  items: MealItem[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  visibility: VisibilityMode;
  password?: string;
  attendees: Attendee[];
  meals: Meal[];
}

export const emptyProjectDraft = {
  name: '',
  description: '',
  visibility: 'public' as VisibilityMode,
  password: '',
};

export const sampleProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Weekend Campout',
    description: 'Shared camping meal plan for breakfast, lunch, and dinner across the long weekend.',
    visibility: 'public',
    attendees: [
      { id: 'att-1', name: 'Avery', dietaryRestrictions: ['vegetarian'] },
      { id: 'att-2', name: 'Ben', dietaryRestrictions: ['gluten-free'] },
      { id: 'att-3', name: 'Casey', dietaryRestrictions: ['nut-free', 'dairy-free'] },
      { id: 'att-4', name: 'Drew', dietaryRestrictions: ['none'] },
    ],
    meals: [
      {
        id: 'meal-1',
        title: 'Saturday Breakfast',
        date: '2026-11-07',
        startTime: '08:00',
        category: 'breakfast',
        attendeeCount: 4,
        dietarySummary: 'Vegetarian and gluten-free options required.',
        status: 'confirmed',
        items: [
          {
            id: 'item-1',
            name: 'Fruit Parfait',
            description: 'Yogurt, granola, berries, and chia seed.',
            category: 'app',
            personResponsible: 'Avery',
          },
          {
            id: 'item-2',
            name: 'Orange Juice',
            description: 'Fresh orange juice with sparkling water option.',
            category: 'drink',
            personResponsible: 'Ben',
          },
        ],
      },
      {
        id: 'meal-2',
        title: 'Saturday Dinner',
        date: '2026-11-07',
        startTime: '18:30',
        category: 'dinner',
        attendeeCount: 5,
        dietarySummary: 'One vegan guest and one nut-free guest.',
        status: 'needs-volunteers',
        items: [
          {
            id: 'item-3',
            name: 'Pasta Salad',
            description: 'Rotini with tomatoes, basil, and lemon vinaigrette.',
            category: 'salad',
            personResponsible: 'Casey',
          },
        ],
      },
    ],
  },
  {
    id: 'project-2',
    name: 'Neighborhood Potluck',
    description: 'A shared neighborhood dinner event with password-protected planning and reusable attendee list.',
    visibility: 'private-password',
    password: 'potluck123',
    attendees: [
      { id: 'att-5', name: 'Jordan', dietaryRestrictions: ['vegan'] },
      { id: 'att-6', name: 'Morgan', dietaryRestrictions: ['none'] },
      { id: 'att-7', name: 'Pat', dietaryRestrictions: ['shellfish-free'] },
    ],
    meals: [
      {
        id: 'meal-3',
        title: 'Thursday Dinner',
        date: '2026-11-12',
        startTime: '19:00',
        category: 'dinner',
        attendeeCount: 3,
        dietarySummary: 'Two vegetarian guests and one shellfish-free guest.',
        status: 'planned',
        items: [
          {
            id: 'item-4',
            name: 'Lemon Herb Rice',
            description: 'Citrus rice served warm.',
            category: 'side',
            personResponsible: 'Morgan',
          },
        ],
      },
    ],
  },
];
