# AI_RULES.md

## 3D Landing Page Development Rules (Webflow-like with Modern 3D)

These rules define how to create a **modern 3D landing page** with Webflow-like aesthetics using **React, TypeScript, Tailwind CSS, and open-source 3D libraries** such as Three.js, React Three Fiber, and Spline alternatives.

- Before starting anything create a detailed development plan as development_plan.md in the app directory and write detailed development plan along with TODOs.

---

## Core Tech Stack

- **React + TypeScript** (strict mode).
- **React Three Fiber (r3f)** for Three.js integration.
- **@react-three/drei** for helpers, controls, and loaders.
- **Framer Motion** for UI/UX animations & transitions.
- **Tailwind CSS** for responsive layout and styling.
- **shadcn/ui** for UI components (navigation, buttons, forms).
- **Radix UI** primitives when needed.
- **react-query** for data fetching (if APIs are needed).
- **sonner** or **react-hot-toast** for notifications.

---

## File & Code Organization

- `src/pages/` → All main page layouts.
- `src/components/` → UI components (Hero, Navbar, Footer, CTA).
- `src/components/3d/` → 3D scene components (CanvasWrapper, HeroScene, Models).
- `src/assets/models/` → GLTF/GLB models and textures.
- `src/hooks/` → Custom hooks (e.g., useResponsive3D, useAnimations).
- `src/styles/` → Tailwind configurations and global styles.

---

## 3D & Animation Rules

1. Use **React Three Fiber** for all 3D rendering.
2. Use **drei helpers** (OrbitControls, Environment, Text, ContactShadows).
3. Optimize 3D models before adding (Blender, glTF compression).
4. Always wrap the 3D scene inside a `CanvasWrapper` with lazy loading + suspense.
5. Use **Framer Motion** for UI overlays and transitions.
6. Keep animations smooth (60fps target, GPU accelerated).
7. Favor **lightweight materials & baked lighting** for performance.
8. Use **responsive scaling** for 3D objects across devices.
9. Consider **scroll-based animations** using `react-scroll` or `framer-motion`.

---

## Modern Design Guidelines

- **Hero Section** → Fullscreen 3D canvas with a call-to-action overlay.
- **Navigation** → Sticky navbar with smooth scroll + animated underline.
- **Sections** → Use gradient backgrounds + glassmorphism cards.
- **Typography** → Modern sans-serif with Tailwind presets.
- **Animations** → Subtle parallax, hover effects, microinteractions.
- **Dark Mode** → Ensure 3D scenes + UI adapt to dark/light themes.
- **Responsiveness** → Test across mobile, tablet, and desktop.

---

## Performance Rules

1. Use **GLTF/GLB** optimized models only.
2. Use `useMemo` and `useFrame` wisely for animations.
3. Leverage `drei/PerformanceMonitor` for adaptive quality.
4. Enable **lazy loading** for 3D models & textures.
5. Compress assets (images → WebP/AVIF, models → Draco/Basis).
6. Run **Lighthouse CI** for performance audits.

---

## Deployment & Build

- Deploy via **Vercel/Netlify** with CDN asset hosting.
- Preload critical assets but lazy load non-essentials.
- Ensure PWA support (manifest.json, service worker).
- Add SEO meta tags and Open Graph tags.

---

## TL;DR Quick Setup

- `CanvasWrapper` + `HeroScene` in `src/components/3d/`.
- Navbar, Hero, Features, CTA, Footer inside `src/pages/Index.tsx`.
- Use **r3f + drei** for 3D, **Framer Motion** for UI, **Tailwind** for styling.
- Optimize models and test performance with Lighthouse.

---
