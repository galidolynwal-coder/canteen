# Canteen POS and Inventory System

Responsive school canteen POS, inventory, and reporting system generated from `# MASTER PROMPT.md`.

## Features

- One shared login that routes users by role
- Role based navigation and protected in-app views
- Canteen officer role management for creating cashier accounts and assigning shifts
- Admin dashboard, users, categories, products, daily inventory, and sales report
- Cashier dashboard, POS cart, product search/barcode lookup, payment, change, and receipt print
- Product catalog with date filtering and stock monitoring
- CSV export and browser print support for reports
- PWA manifest and service worker for installable/offline behavior
- Supabase schema, policies, and seed files in `supabase/`

## Demo Login

- Admin: `Admin` / `Admin12345`

Cashier accounts created in Role Management are created in Supabase Auth and `profiles`. They can sign in from the same login screen and will open the Cashier Dashboard automatically.

## Run Locally

```bash
npm start
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql`.
3. Run `supabase/policies.sql`.
4. Run `supabase/seed.sql` to create the default admin account and sample data.
5. Fill `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The app reads and writes users, products, categories, sales, sale items, and stock changes through Supabase. It does not use local storage for system data.
