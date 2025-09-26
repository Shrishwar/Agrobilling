# Frontend UI Redesign TODO

## Step 1: Theme & Global Styles ✅
- [x] Update `frontend/tailwind.config.js`: Add agro colors (primary green #10B981, secondary #F59E0B, etc.), fonts (Inter), borderRadius.
- [x] Update `frontend/src/index.css`: Import Inter font, set global font-family, add CSS variables for theme.

## Step 2: Layout Components ✅
- [x] Create `frontend/src/components/layout/Sidebar.jsx`: Collapsible sidebar with Lucide icons, role-based menu, Framer Motion animations, responsive.
- [x] Create `frontend/src/components/layout/Topbar.jsx`: Search, notifications, profile dropdown with icons.
- [x] Create `frontend/src/components/layout/Layout.jsx`: Wrapper for Sidebar + Topbar + content area.

## Step 3: Reusable UI Components ✅
- [x] Create `frontend/src/components/ui/StatCard.jsx`: Metric cards with icon, value, trend, hover animations.
- [x] Create `frontend/src/components/ui/DataTable.jsx`: Table with pagination, search, sorting, responsive.
- [x] Create `frontend/src/components/ui/Dialog.jsx`: Modal with Framer Motion, overlay, close button.
- [x] Create `frontend/src/components/ui/Skeleton.jsx`: Loading placeholders.
- [x] Create `frontend/src/components/ui/EmptyState.jsx`: No-data illustrations/messages.
- [x] Update `frontend/src/components/ui/Button.jsx` & `Input.jsx`: Add variants, loading states, transitions.
- [x] Create `frontend/src/components/ui/Form.jsx`: Wrapper for react-hook-form + zod validation.

## Step 4: Page Refactors
- [x] Refactor `frontend/src/pages/Login.jsx`: Gradient background, centered card, form with validation.
- [x] Refactor `frontend/src/pages/Signup.jsx`: Similar to Login, with role select.
- [x] Refactor `frontend/src/pages/AdminDashboard.jsx`: Wrap in Layout, add StatCards, Recharts (Line/Bar), DataTable for invoices.
- [x] Refactor `frontend/src/pages/StaffDashboard.jsx`: Wrap in Layout, enhance POS with modals, forms.
- [x] Refactor `frontend/src/pages/CustomerDashboard.jsx`: Wrap in Layout, StatCard for balance, DataTable for invoices.

## Step 5: App & Integrations
- [x] Update `frontend/src/App.jsx`: Wrap protected routes in Layout, add Toaster.
- [x] Add Toaster component for notifications.
- [x] Ensure all components use Lucide icons, Framer Motion animations, accessibility attributes.

## Step 6: Testing & Polish ✅
- [x] Run `npm run dev`, test all routes/roles, responsiveness (mobile/tablet).
- [x] Verify charts load, forms validate, modals animate, exports trigger.
- [x] Accessibility check (aria-labels, keyboard nav).
- [x] Final build: `npm run build`, ensure no errors.
