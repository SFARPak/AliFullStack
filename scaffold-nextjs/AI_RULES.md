# Tech Stack
- Before starting anything create a detailed development plan as development_plan.md in the app directory and write detailed development plan along with TODOs.
- You are building a Next.js application.
- Use TypeScript.
- Use Next.js App Router (app directory).
- Always put source code in the appropriate directories.
- Put pages into app/ directory (using App Router)
- Put components into components/ directory
- Put reusable UI components into components/ui/ directory
- Put custom hooks into src/hooks/ directory
- Put utility functions into src/utils/ or lib/ directory
- The main page is app/page.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

## Project Structure
- `app/`: Next.js App Router directory
  - `layout.tsx`: Root layout component
  - `page.tsx`: Home page component
  - `globals.css`: Global styles and Tailwind directives
- `components/`: React components
- `lib/`: Utility functions and configurations
- `package.json`: Dependencies and scripts
- `next.config.js`: Next.js configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `components.json`: shadcn/ui configuration

## Development Guidelines
- Use Next.js App Router for routing and layouts
- Implement proper TypeScript types throughout the codebase
- Use Server Components when possible, Client Components when needed
- Follow Next.js best practices for performance and SEO
- Use Tailwind CSS for styling with shadcn/ui components
- Implement proper error boundaries and loading states
- Use Next.js Image component for optimized images
- Follow REST API conventions or GraphQL for data fetching

## Available packages and libraries
- The lucide-react package is installed for icons
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.
- @tanstack/react-query is available for data fetching and caching

## Next.js Specific Guidelines
- Use `app/` directory for App Router (not `pages/`)
- Create route groups with parentheses: `(group-name)`
- Use `loading.tsx` for loading states
- Use `error.tsx` for error boundaries
- Use `not-found.tsx` for 404 pages
- Use `layout.tsx` for shared layouts
- Use Server Actions for form submissions when appropriate
- Use `next/font` for optimized font loading
- Use `next/image` for optimized image loading
- Use `next/link` for client-side navigation

## Best Practices
- Use TypeScript interfaces for API responses and component props
- Implement proper error handling with try-catch blocks
- Use React hooks appropriately (useState, useEffect, useContext, etc.)
- Follow component composition patterns
- Implement proper accessibility (ARIA attributes, semantic HTML)
- Use environment variables for configuration
- Implement proper security measures
- Write clean, readable, and maintainable code
- Use meaningful variable and function names
- Add comments for complex logic
- Follow the principle of single responsibility for components and functions