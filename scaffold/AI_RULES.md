<!-- # Tech Stack
- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- The date-fns package is installed for date/time manipulation.
- The uuid package is installed for generating unique identifiers.
- The leaflet and react-leaflet packages are installed for interactive maps.
- The axios package is installed for HTTP requests.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them. -->

# Extended Tech & AI Development Rules

## TL;DR Quick Rules

- Before starting anything create a detailed development plan as development_plan.md in the app directory and write detailed development plan along with TODOs.
- Use **React + TypeScript**.
- Keep routes in `src/App.tsx`.
- Pages → `src/pages/`, Components → `src/components/`.
- Default page → `src/pages/Index.tsx`. Always update Index to show new components.
- Use **Tailwind CSS** for styling. Prefer gradients, glassmorphism, subtle animations.
<!-- - Default to **shadcn/ui** components. Use **Radix UI** primitives when needed. -->
- Default to **MUI** components. Use **shadcn/ui** or **Radix UI** primitives when needed.
- Use **Framer Motion** for animations & transitions.
- Use **react-query** for API calls. Prefer `react-hook-form + zod` for forms.
- Use **sonner** or **react-hot-toast** for notifications.
- Ensure **dark mode** and **responsiveness** for all components.
- Follow **strict TypeScript** and **atomic design principles**.
- Optimize with lazy loading and performance best practices.

---

## Core Tech Stack

- **React (TypeScript)** for building the application.
- **React Router** for routing. Keep routes defined in `src/App.tsx`.
- **File structure**:
  - Source code → `src/`
  - Pages → `src/pages/`
  - Components → `src/components/`
  - Main page (default page) → `src/pages/Index.tsx`
- **Update `Index.tsx`** whenever new components are created, otherwise they won't be visible.
- **Styling**:
  - Use **Tailwind CSS** for all styling.
  - Utilize **utility classes** for spacing, colors, layouts, gradients, transitions, and shadows.
  - Follow **modern design principles**: clean UI, white space, gradients, subtle glassmorphism, and motion.

---

## UI/UX Component Libraries

- **shadcn/ui** → primary component library.
- **Radix UI** → for low-level primitives (accessible modals, popovers, menus).
- **lucide-react** → for modern, lightweight icons.

---

## Additional Recommended Open-Source Libraries

- **Framer Motion** → animations & transitions (cards, modals, page transitions, staggered lists).
- **react-spring** → physics-based animations (optional alternative to Framer Motion).
- **tailwindcss-animate** → prebuilt animation utilities for Tailwind.
- **tailwind-variants** or **class-variance-authority (CVA)** → manage Tailwind component variants.
- **tailwind-gradient-mask-image** → gradient masking utilities.
- **tailwindcss-gradients / tailwind-gradient-generator** → gradient utilities for vibrant UI.
- **tailwindcss-fluid-type** → fluid typography scaling across breakpoints.
- **react-awesome-reveal** → reveal-on-scroll animations.
- **react-wrap-balancer** → better text wrapping for responsive layouts.
- **react-hot-toast** or **sonner** → modern, minimal toast notifications.

---

## Visualization & Data Display

- **Recharts** or **Nivo** → interactive and modern charts.
- **react-leaflet** → maps (already installed).
- **react-confetti** or **canvas-confetti** → celebratory UI moments (gamification touch).

---

## Forms & Validation

- **react-hook-form** → lightweight form handling.
- **zod** → schema validation, can be paired with react-hook-form.
- **@tanstack/react-query** → API data fetching, caching, optimistic updates.

---

## Animations & Effects (Modern SaaS Feel)

- Use **Framer Motion** for page transitions, modals, and list animations.
- Add **gradient backgrounds** (Tailwind + gradient utilities).
- Use **glassmorphism overlays** (blurred translucent cards).
- Add **micro-interactions** → hover states, animated icons, small feedback animations.
- Add **parallax effects** with `react-scroll-parallax` for modern landing pages.
- Implement **dark mode** using Tailwind's `dark:` utilities.

---

## AI Rules (Extended)

1. Always prioritize **accessibility** (ARIA roles, keyboard navigation).
2. Default to **shadcn/ui** components. Extend only with modern libraries when needed.
3. **Animations should be smooth & subtle**, not overwhelming (300–500ms duration).
4. Use **gradients & glass effects** sparingly for clean SaaS aesthetics.
5. Use **react-query** for API calls instead of raw axios unless custom logic is required.
6. **Forms**: Always use `react-hook-form` with `zod` for validation.
7. **Notifications**: Use `sonner` or `react-hot-toast` for toast alerts.
8. **Charts/Visuals**: Use **Recharts/Nivo** for analytics dashboards.
9. **Dark mode support** is required for every new component.
10. Place reusable utilities (hooks, helpers) under `src/lib/` or `src/hooks/`.
11. Write code in **strict TypeScript** (avoid `any`).
12. Follow **atomic design principles**: build small components, compose into pages.
13. Ensure **responsiveness** across mobile, tablet, desktop.
14. Use **lazy loading** (`React.lazy`) for heavy components (charts, maps).
15. Optimize for **performance**: prefer Tailwind classes, avoid unnecessary re-renders.

---
