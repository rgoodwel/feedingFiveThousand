create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  visibility text not null default 'public' check (visibility in ('public', 'public-password', 'private-password')),
  password_hash text,
  admin_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attendees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  dietary_restrictions text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  date date not null,
  start_time time not null,
  category text not null check (category in ('breakfast', 'lunch', 'dinner')),
  attendee_count integer not null default 0,
  dietary_summary text not null default '',
  status text not null default 'planned' check (status in ('planned', 'needs-volunteers', 'confirmed', 'complete')),
  assigned_attendee_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null check (category in ('drink', 'app', 'salad', 'main', 'side', 'dessert')),
  person_responsible text not null default 'TBD',
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_visibility on projects(visibility);
create index if not exists idx_attendees_project_id on attendees(project_id);
create index if not exists idx_meals_project_id on meals(project_id);
create index if not exists idx_meal_items_meal_id on meal_items(meal_id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_projects_updated_at
before update on projects
for each row execute procedure update_updated_at_column();

create trigger set_meals_updated_at
before update on meals
for each row execute procedure update_updated_at_column();
