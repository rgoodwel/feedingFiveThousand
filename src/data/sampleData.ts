export type VisibilityMode = 'public' | 'public-password' | 'private-password';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner';
export type FoodCategory = 'drink' | 'app' | 'salad' | 'main' | 'side' | 'dessert';

export type AgeGroup = 'toddler' | 'kid' | 'adult';

export interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  ageGroup: AgeGroup;
  dietaryRestrictions: string[];
}

export interface MealItem {
  id: string;
  name: string;
  description: string;
  category: FoodCategory;
  /** Attendee id of the guest bringing the item; empty when unassigned. */
  personResponsible: string;
}

export interface Meal {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  category: MealCategory;
  attendeeCount: number;
  dietarySummary: string;
  assignedAttendeeIds: string[];
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
      { id: 'att-1', firstName: 'Avery', lastName: 'Lindqvist', ageGroup: 'adult', dietaryRestrictions: ['vegetarian'] },
      { id: 'att-2', firstName: 'Ben', lastName: 'Okafor', ageGroup: 'adult', dietaryRestrictions: ['gluten-free'] },
      { id: 'att-3', firstName: 'Casey', lastName: 'Moreno', ageGroup: 'kid', dietaryRestrictions: ['nut-free', 'dairy-free'] },
      { id: 'att-4', firstName: 'Drew', lastName: 'Patel', ageGroup: 'toddler', dietaryRestrictions: ['none'] },
      { id: 'att-8', firstName: 'Elena', lastName: 'Lindqvist', ageGroup: 'adult', dietaryRestrictions: ['none'] },
      { id: 'att-9', firstName: 'Marcus', lastName: 'Okafor', ageGroup: 'adult', dietaryRestrictions: ['none'] },
      { id: 'att-10', firstName: 'Sofia', lastName: 'Moreno', ageGroup: 'adult', dietaryRestrictions: ['dairy-free'] },
      { id: 'att-11', firstName: 'Leo', lastName: 'Moreno', ageGroup: 'kid', dietaryRestrictions: ['none'] },
      { id: 'att-12', firstName: 'Nina', lastName: 'Patel', ageGroup: 'adult', dietaryRestrictions: ['vegetarian'] },
      { id: 'att-13', firstName: 'Omar', lastName: 'Patel', ageGroup: 'kid', dietaryRestrictions: ['nut-free'] },
      { id: 'att-14', firstName: 'Ruby', lastName: 'Okafor', ageGroup: 'kid', dietaryRestrictions: ['none'] },
      { id: 'att-15', firstName: 'Theo', lastName: 'Lindqvist', ageGroup: 'toddler', dietaryRestrictions: ['dairy-free'] },
      { id: 'att-16', firstName: 'Hannah', lastName: 'Brooks', ageGroup: 'adult', dietaryRestrictions: ['gluten-free'] },
      { id: 'att-17', firstName: 'Jonah', lastName: 'Brooks', ageGroup: 'adult', dietaryRestrictions: ['none'] },
    ],
    meals: [
      {
        id: 'meal-1',
        title: 'Saturday Breakfast',
        date: '2026-11-07',
        startTime: '08:00',
        location: '',
        category: 'breakfast',
        attendeeCount: 12,
        dietarySummary: 'Vegetarian and gluten-free options required.',
        assignedAttendeeIds: ['att-1', 'att-2', 'att-3', 'att-4', 'att-8', 'att-9', 'att-10', 'att-11', 'att-12', 'att-13', 'att-14', 'att-15'],
        items: [
          {
            id: 'item-1',
            name: 'Fruit Parfait',
            description: 'Yogurt, granola, berries, and chia seed.',
            category: 'app',
            personResponsible: 'att-1',
          },
          {
            id: 'item-2',
            name: 'Orange Juice',
            description: 'Fresh orange juice with sparkling water option.',
            category: 'drink',
            personResponsible: 'att-2',
          },
          {
            id: 'item-5',
            name: 'Coffee & Tea Bar',
            description: 'Drip coffee, decaf, and herbal teas.',
            category: 'drink',
            personResponsible: 'att-2',
          },
          {
            id: 'item-6',
            name: 'Fresh Fruit Platter',
            description: 'Melon, pineapple, and berries.',
            category: 'app',
            personResponsible: 'att-4',
          },
          {
            id: 'item-7',
            name: 'Veggie Scramble',
            description: 'Eggs with peppers, spinach, and cheddar.',
            category: 'main',
            personResponsible: 'att-1',
          },
          {
            id: 'item-8',
            name: 'Gluten-Free Pancakes',
            description: 'Served with maple syrup and butter.',
            category: 'main',
            personResponsible: 'att-2',
          },
          {
            id: 'item-9',
            name: 'Roasted Breakfast Potatoes',
            description: 'Crispy with rosemary and garlic.',
            category: 'side',
            personResponsible: 'att-3',
          },
          {
            id: 'item-10',
            name: 'Green Smoothie Shooters',
            description: 'Spinach, banana, and mango.',
            category: 'salad',
            personResponsible: 'att-1',
          },
          {
            id: 'item-11',
            name: 'Blueberry Muffins',
            description: 'Nut-free, baked fresh.',
            category: 'dessert',
            personResponsible: 'att-3',
          },
        ],
      },
      {
        id: 'meal-2',
        title: 'Saturday Dinner',
        date: '2026-11-07',
        startTime: '18:30',
        location: '',
        category: 'dinner',
        attendeeCount: 14,
        dietarySummary: 'One vegan guest and one nut-free guest.',
        assignedAttendeeIds: ['att-1', 'att-2', 'att-3', 'att-4', 'att-8', 'att-9', 'att-10', 'att-11', 'att-12', 'att-13', 'att-14', 'att-15', 'att-16', 'att-17'],
        items: [
          {
            id: 'item-3',
            name: 'Pasta Salad',
            description: 'Rotini with tomatoes, basil, and lemon vinaigrette.',
            category: 'salad',
            personResponsible: 'att-3',
          },
          {
            id: 'item-12',
            name: 'Sparkling Lemonade',
            description: 'Mint and lemon, with a non-sweet option.',
            category: 'drink',
            personResponsible: 'att-4',
          },
          {
            id: 'item-13',
            name: 'Bruschetta',
            description: 'Tomato, basil, and balsamic on toasted baguette.',
            category: 'app',
            personResponsible: 'att-1',
          },
          {
            id: 'item-14',
            name: 'Stuffed Mushrooms',
            description: 'Vegetarian, herb and breadcrumb filling.',
            category: 'app',
            personResponsible: 'att-3',
          },
          {
            id: 'item-15',
            name: 'Grilled Chicken Thighs',
            description: 'Lemon-garlic marinade.',
            category: 'main',
            personResponsible: 'att-2',
          },
          {
            id: 'item-16',
            name: 'Mushroom Risotto',
            description: 'Vegetarian main, gluten-free.',
            category: 'main',
            personResponsible: 'att-1',
          },
          {
            id: 'item-17',
            name: 'Garlic Green Beans',
            description: 'Sauteed with garlic and lemon (nut-free).',
            category: 'side',
            personResponsible: 'att-3',
          },
          {
            id: 'item-18',
            name: 'Caesar Salad',
            description: 'Dressing served on the side.',
            category: 'salad',
            personResponsible: 'att-2',
          },
          {
            id: 'item-19',
            name: 'Apple Crumble',
            description: 'Warm, with vanilla ice cream.',
            category: 'dessert',
            personResponsible: 'att-1',
          },
          {
            id: 'item-20',
            name: 'Dairy-Free Chocolate Mousse',
            description: 'Coconut cream based.',
            category: 'dessert',
            personResponsible: 'att-3',
          },
        ],
      },
      {
        id: 'meal-4',
        title: 'Friday Welcome Dinner',
        date: '2026-10-23',
        startTime: '18:00',
        location: '',
        category: 'dinner',
        attendeeCount: 10,
        dietarySummary: 'Vegetarian and gluten-free options provided.',
        assignedAttendeeIds: ['att-1', 'att-2', 'att-3', 'att-4', 'att-8', 'att-9', 'att-10', 'att-11', 'att-12', 'att-13'],
        items: [
          {
            id: 'item-101',
            name: 'Lemonade Pitcher',
            description: 'Fresh-squeezed with mint.',
            category: 'drink',
            personResponsible: 'att-4',
          },
          {
            id: 'item-102',
            name: 'Chips & Guacamole',
            description: 'Homemade guacamole.',
            category: 'app',
            personResponsible: 'att-8',
          },
          {
            id: 'item-103',
            name: 'Veggie Chili',
            description: 'Vegetarian, medium spice.',
            category: 'main',
            personResponsible: 'att-1',
          },
          {
            id: 'item-104',
            name: 'Pulled Pork Sliders',
            description: 'Slow-cooked with slaw.',
            category: 'main',
            personResponsible: 'att-9',
          },
          {
            id: 'item-105',
            name: 'Corn on the Cob',
            description: 'Grilled with lime butter.',
            category: 'side',
            personResponsible: 'att-3',
          },
          {
            id: 'item-106',
            name: 'Campfire Smores',
            description: 'Classic with gluten-free grahams.',
            category: 'dessert',
            personResponsible: 'att-2',
          },
        ],
      },
      {
        id: 'meal-5',
        title: 'Sunday Brunch',
        date: '2026-10-25',
        startTime: '10:30',
        location: '',
        category: 'lunch',
        attendeeCount: 12,
        dietarySummary: 'One dairy-free guest.',
        assignedAttendeeIds: ['att-1', 'att-2', 'att-3', 'att-4', 'att-8', 'att-9', 'att-10', 'att-11', 'att-12', 'att-13', 'att-14', 'att-15'],
        items: [
          {
            id: 'item-107',
            name: 'Mimosa Bar',
            description: 'Orange juice and sparkling water options.',
            category: 'drink',
            personResponsible: 'att-10',
          },
          {
            id: 'item-108',
            name: 'Yogurt Cups',
            description: 'Granola and berries.',
            category: 'app',
            personResponsible: 'att-12',
          },
          {
            id: 'item-109',
            name: 'Egg Bake',
            description: 'Spinach and feta.',
            category: 'main',
            personResponsible: 'att-1',
          },
          {
            id: 'item-110',
            name: 'French Toast Casserole',
            description: 'Make-ahead with maple syrup.',
            category: 'main',
            personResponsible: 'att-9',
          },
          {
            id: 'item-111',
            name: 'Fruit Salad',
            description: 'Seasonal mix.',
            category: 'salad',
            personResponsible: 'att-3',
          },
          {
            id: 'item-112',
            name: 'Cinnamon Rolls',
            description: 'Warm with icing on the side.',
            category: 'dessert',
            personResponsible: 'att-8',
          },
        ],
      },
    ],
  },
  {
    id: 'project-2',
    name: 'Neighborhood Potluck',
    description: 'A shared neighborhood dinner event with open planning and a reusable guest list.',
    visibility: 'public',
    attendees: [
      { id: 'att-5', firstName: 'Jordan', lastName: 'Reyes', ageGroup: 'adult', dietaryRestrictions: ['vegan'] },
      { id: 'att-6', firstName: 'Morgan', lastName: 'Chen', ageGroup: 'adult', dietaryRestrictions: ['none'] },
      { id: 'att-7', firstName: 'Pat', lastName: 'Sullivan', ageGroup: 'kid', dietaryRestrictions: ['none'] },
      { id: 'att-18', firstName: 'Priya', lastName: 'Nair', ageGroup: 'adult', dietaryRestrictions: ['vegetarian'] },
      { id: 'att-19', firstName: 'Tom', lastName: 'Nair', ageGroup: 'adult', dietaryRestrictions: ['none'] },
      { id: 'att-20', firstName: 'Ivy', lastName: 'Nair', ageGroup: 'kid', dietaryRestrictions: ['none'] },
      { id: 'att-21', firstName: 'Carlos', lastName: 'Mendez', ageGroup: 'adult', dietaryRestrictions: ['none'] },
      { id: 'att-22', firstName: 'Lucia', lastName: 'Mendez', ageGroup: 'adult', dietaryRestrictions: ['vegan'] },
      { id: 'att-23', firstName: 'Mateo', lastName: 'Mendez', ageGroup: 'toddler', dietaryRestrictions: ['none'] },
      { id: 'att-24', firstName: 'Grace', lastName: 'Kim', ageGroup: 'adult', dietaryRestrictions: ['none'] },
      { id: 'att-25', firstName: 'Eli', lastName: 'Kim', ageGroup: 'kid', dietaryRestrictions: ['nut-free'] },
    ],
    meals: [
      {
        id: 'meal-3',
        title: 'Thursday Dinner',
        date: '2026-11-12',
        startTime: '19:00',
        location: '',
        category: 'dinner',
        attendeeCount: 9,
        dietarySummary: 'Two vegetarian guests.',
        assignedAttendeeIds: ['att-5', 'att-6', 'att-7', 'att-18', 'att-19', 'att-20', 'att-21', 'att-22', 'att-23'],
        items: [
          {
            id: 'item-4',
            name: 'Lemon Herb Rice',
            description: 'Citrus rice served warm.',
            category: 'side',
            personResponsible: 'att-6',
          },
          {
            id: 'item-21',
            name: 'Sparkling Cider',
            description: 'Non-alcoholic.',
            category: 'drink',
            personResponsible: 'att-5',
          },
          {
            id: 'item-22',
            name: 'Hummus & Pita',
            description: 'With cucumber and carrot sticks.',
            category: 'app',
            personResponsible: 'att-5',
          },
          {
            id: 'item-23',
            name: 'Vegan Chili',
            description: 'Three-bean, medium spice.',
            category: 'main',
            personResponsible: 'att-6',
          },
          {
            id: 'item-24',
            name: 'Baked Mac & Cheese',
            description: 'Crowd-pleaser.',
            category: 'main',
            personResponsible: 'att-7',
          },
          {
            id: 'item-25',
            name: 'Cornbread',
            description: 'Honey butter on the side.',
            category: 'side',
            personResponsible: 'att-6',
          },
          {
            id: 'item-26',
            name: 'Garden Salad',
            description: 'Mixed greens with vinaigrette.',
            category: 'salad',
            personResponsible: 'att-5',
          },
          {
            id: 'item-27',
            name: 'Fruit Tart',
            description: 'Seasonal fruit.',
            category: 'dessert',
            personResponsible: 'att-7',
          },
        ],
      },
      {
        id: 'meal-6',
        title: 'Wednesday Soup Night',
        date: '2026-10-21',
        startTime: '18:30',
        location: '',
        category: 'dinner',
        attendeeCount: 8,
        dietarySummary: 'One vegan guest.',
        assignedAttendeeIds: ['att-5', 'att-6', 'att-7', 'att-18', 'att-19', 'att-20', 'att-21', 'att-22'],
        items: [
          {
            id: 'item-113',
            name: 'Hot Apple Cider',
            description: 'Spiced and non-alcoholic.',
            category: 'drink',
            personResponsible: 'att-18',
          },
          {
            id: 'item-114',
            name: 'Stuffed Dates',
            description: 'Goat cheese and walnut.',
            category: 'app',
            personResponsible: 'att-19',
          },
          {
            id: 'item-115',
            name: 'Tomato Basil Soup',
            description: 'Vegan, dairy-free.',
            category: 'main',
            personResponsible: 'att-22',
          },
          {
            id: 'item-116',
            name: 'Butternut Squash Soup',
            description: 'Creamy with coconut milk.',
            category: 'main',
            personResponsible: 'att-5',
          },
          {
            id: 'item-117',
            name: 'Crusty Bread',
            description: 'Served with olive oil.',
            category: 'side',
            personResponsible: 'att-6',
          },
          {
            id: 'item-118',
            name: 'Pear Crisp',
            description: 'Oat topping.',
            category: 'dessert',
            personResponsible: 'att-21',
          },
        ],
      },
    ],
  },
];
