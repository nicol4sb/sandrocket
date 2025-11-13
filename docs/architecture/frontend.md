# Frontend Architecture

## Composition Strategy

- **Feature slices**: Organize code by domain (`projects`, `epics`, `tasks`, `activity`, `auth`). Each slice exports a public API (`index.ts`) containing components, hooks, and state helpers.
- **Headless services**: Business logic lives in reusable hooks (`useTasksService`, `useProjectHub`) that call shared clients. Components consume these hooks, keeping rendering decoupled from data-fetching.
- **Routing shell**: A thin shell manages global layout, route registration, and feature flag checks. Each slice lazily registers its routes for faster initial paint.

## State Management

- Use React Query (or an equivalent data layer) to sync server state and cache project/task data.
- Local UI state remains inside components or the slice store (Zustand/Context) for transient values like modal visibility.
- Real-time updates flow through a shared `RealtimeClient` hook that listens to domain events and invalidates caches.

## Design System

- Maintain base tokens in `styles/tokens.css` (spacing, typography, colors).
- Reusable primitives (`Button`, `Card`, `Modal`, `TaskCard`) live in `components/design-system/` and ship with Storybook stories.
- Accessibility first: provide keyboard focus styles, aria attributes, and ensure drag-and-drop interactions expose screen-reader announcements.

## Responsive UX

- Breakpoints: desktop ≥ 1024px, tablet 768–1023px, mobile ≤ 767px.
- Layout adapts using CSS Grid for epics; tasks stack vertically on mobile with horizontal scroll suppressed.
- Completed tasks and activity panels collapse behind toggles on small screens.

## Drag-and-Drop Experience

- Powered by a headless DnD engine (e.g., `@dnd-kit/core`) with custom sensors for mouse + touch.
- While dragging, placeholders animate resizing to show the final drop location; neighbor tasks slide aside with spring easing.
- Ghost preview matches the task card with slight tilt and shadow; drop confirmation triggers optimistic reordering.

## Theming & Rewrites

- Theme variables can be swapped via CSS variables, enabling quick reskins without touching components.
- Because slices expose headless services, future rewrites (e.g., switching to native or different web framework) only need to re-implement the view layer.
