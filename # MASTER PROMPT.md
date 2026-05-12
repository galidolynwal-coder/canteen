# MASTER PROMPT — CANTEEN POS & INVENTORY SYSTEM

You are an expert full-stack software engineer and UI/UX architect.

Create a COMPLETE modern web-based Canteen POS & Inventory Management System using the following technologies:

## TECH STACK
- Frontend: React + Vite
- Styling: Tailwind CSS
- Backend/Database: Supabase
- Authentication: Supabase Auth
- State Management: React Context API or Zustand
- Icons: Lucide React
- Charts: Recharts
- Tables: TanStack Table
- Routing: React Router DOM
- Forms: React Hook Form
- Validation: Zod
- Notifications: Sonner or React Hot Toast
- PWA Support: Vite PWA Plugin
- Deployment Ready: Vercel or Netlify

---

# SYSTEM OVERVIEW

The system is for a school canteen.

There are TWO USER TYPES:

1. CANTEEN OFFICER (ADMIN)
2. CASHIER

The system must be:
- Mobile Responsive
- Tablet Responsive
- Desktop Responsive
- Progressive Web App (PWA)
- Fast and modern UI
- Clean dashboard layout
- Sidebar navigation
- Protected routes
- Role-based access

---

# LOGIN PAGE

Design inspiration:
- Similar to SSS portal login layout

## Layout:
- Split screen design
- Left side:
  - School/Canteen logo
  - About Us button at top-left corner
  - Two login panels/cards:
    1. Canteen Officer Login
    2. Cashier Login

Each login form contains:
- User ID
- Password
- Login Button

## Right Side:
- Hero section
- Welcome text
- Illustration related to canteen/POS
- Responsive modern design

---

# MAIN SYSTEM STRUCTURE

After login:

## SIDEBAR MENU

### ADMIN SIDE (CANTEEN OFFICER)
- Dashboard
- Back Office
  - Users
  - Categories
  - Products
  - Daily Inventory
  - Sales Report
- Logout

### CASHIER SIDE
- Dashboard
- Front Office
  - Point of Sale (POS)
  - Product Catalog
- Logout

---

# DASHBOARD

## ADMIN DASHBOARD
Display:
- Total Sales
- Total Products
- Total Categories
- Total Users
- Low Stock Alerts
- Today's Sales
- Sales Per Shift Chart
- Recent Transactions

## CASHIER DASHBOARD
Display:
- Current Shift
- Today's Sales
- Products Sold
- Active POS Session
- Quick POS Access

---

# BACK OFFICE MODULES

# 1. USERS

Create a complete CRUD management page.

## TABLE COLUMNS
- Name
- Username
- Email
- Role
  - Admin
  - Cashier
- Shift
- Actions
  - Edit Icon
  - Delete Icon

## FEATURES
- Add User Modal
- Edit User Modal
- Delete Confirmation
- Search User
- Pagination
- Role-based filtering

---

# 2. CATEGORIES

## TABLE COLUMNS
- Category Name
- Product List
- Quantity
- Actions
  - Edit
  - Delete

## FEATURES
- Add Category
- Edit Category
- Delete Category
- Search Category

---

# 3. PRODUCTS

## TABLE COLUMNS
- Product Name
- Category
- Selling Price
- In Stock
- Actions

## FEATURES
- Add Product
- Edit Product
- Delete Product
- Product Image Upload
- Barcode Support
- Search Product
- Filter by Category

---

# 4. DAILY INVENTORY

## TABLE COLUMNS
- Items
- Beginning Inventory
- Add Purchase
- Total Available
- Sold
- Ending Inventory
- Selling Price
- Sales

## FEATURES
- Auto Compute Totals
- Export PDF
- Export Excel
- Date Filter
- Inventory Summary
- Overall Total

## FORMULA
Total Available = Beginning Inventory + Add Purchase

Ending Inventory = Total Available - Sold

Sales = Sold × Selling Price

---

# 5. SALES REPORT

## TABLE COLUMNS
- Shift
- Items Sold
- Total Amount

## FEATURES
- Overall Total
- Daily Reports
- Weekly Reports
- Monthly Reports
- Export PDF
- Export Excel
- Sales Graphs

---

# FRONT OFFICE MODULES

(CASHIER ONLY ACCESS)

# 1. POINT OF SALE (POS)

## HEADER SECTION
- Month Selector
  - October
  - November
  - December
- Add Date Button

## POS TABLE
Columns:
- Items
- Qty
- Unit Price
- Total

## FEATURES
- Barcode Scanning
- Product Search
- Add to Cart
- Remove Item
- Quantity Controls
- Auto Total
- Subtotal Per Shift

## SHIFTS
There are FIVE SHIFTS:
- SHIFT A
- SHIFT B
- SHIFT C
- SHIFT D
- SHIFT E

Each shift should:
- Have separate transactions
- Separate subtotal
- Separate sales report

## PAYMENT
- Cash Payment
- Change Calculation
- Print Receipt
- Save Transaction

---

# 2. PRODUCT CATALOG

## TABLE COLUMNS
- Date
- Items
- Price
- Stock In
- Sold
- Available

## FEATURES
Available = Remaining Products

- Search Products
- Filter by Date
- Stock Monitoring
- Low Stock Alerts

---

# ABOUT US PAGE

Place "About Us" at the upper-left side of the login page.

## CONTENT
- School Name
- Canteen Mission
- Developer Information
- Contact Information
- System Version

Use a clean card-based responsive design.

---

# UI/UX REQUIREMENTS

## DESIGN STYLE
- Modern Admin Dashboard
- Minimalist
- Professional
- Clean spacing
- Rounded cards
- Smooth animations
- Soft shadows

## COLORS
Primary:
- Orange
- White
- Dark Gray

Secondary:
- Light Gray
- Green for success
- Red for alerts

## RESPONSIVENESS
Must work perfectly on:
- Mobile phones
- Tablets
- Desktop
- Large screens

Use:
- Responsive sidebar
- Mobile hamburger menu
- Responsive tables
- Card layouts on small devices

---

# PWA REQUIREMENTS

Configure as Progressive Web App.

## FEATURES
- Installable App
- Offline Support
- App Icons
- Splash Screen
- Cached Assets
- Mobile Home Screen Support

Create:
- manifest.json
- service worker

---

# AUTHENTICATION & SECURITY

Use Supabase Authentication.

## FEATURES
- Login
- Logout
- Protected Routes
- Session Persistence
- Role-based access control
- Admin-only pages
- Cashier-only pages

---

# DATABASE REQUIREMENTS

Use PostgreSQL via Supabase.

Create proper:
- Foreign Keys
- Indexes
- Constraints
- Triggers
- Timestamps

---

# REQUIRED DATABASE TABLES

## profiles
- id
- name
- username
- email
- role
- shift
- created_at

## categories
- id
- name
- created_at

## products
- id
- category_id
- name
- price
- stock
- barcode
- image_url
- created_at

## inventory_logs
- id
- product_id
- beginning_inventory
- added_purchase
- total_available
- sold
- ending_inventory
- selling_price
- sales
- date_created

## sales
- id
- cashier_id
- shift
- total_amount
- payment
- change
- created_at

## sale_items
- id
- sale_id
- product_id
- quantity
- unit_price
- total

---

# PROJECT STRUCTURE

Create the following structure:

/project-root
│
├── /public
├── /src
│   ├── /components
│   ├── /pages
│   ├── /layouts
│   ├── /hooks
│   ├── /contexts
│   ├── /services
│   ├── /utils
│   ├── /types
│   ├── /routes
│   ├── /assets
│   └── main.jsx
│
├── /supabase
│   ├── schema.sql
│   ├── seed.sql
│   └── policies.sql
│
├── .env
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md

---

# .ENV REQUIREMENTS

Create:

VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=

---

# SUPABASE SQL REQUIREMENTS

Create complete:
- schema.sql
- Row Level Security Policies
- Seed Data

Include:
- Admin account
- Sample cashier account
- Sample products
- Sample categories

---

# ADDITIONAL FEATURES

## REPORTING
- Print Reports
- Download CSV
- Export PDF

## NOTIFICATIONS
- Success Toast
- Error Toast
- Stock Alerts

## SEARCH & FILTER
- Global Search
- Category Filter
- Date Filter

## LOADING STATES
- Skeleton loaders
- Spinners

## ERROR HANDLING
- Friendly error pages
- Empty states

---

# CODE QUALITY

Generate:
- Clean architecture
- Reusable components
- Modular structure
- Type-safe patterns
- Best practices
- Commented code
- Maintainable folder structure

---

# FINAL OUTPUT REQUIREMENTS

Generate:
1. Complete React frontend
2. Tailwind styling
3. Responsive layouts
4. Supabase integration
5. SQL schema
6. Authentication flow
7. CRUD operations
8. PWA setup
9. Dashboard charts
10. POS system logic
11. Role-based permissions
12. Mobile responsive design

The final system must be production-ready and visually professional.
