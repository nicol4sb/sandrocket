# UX Interaction Notes

## Drag-and-Drop Timeline

1. **Idle** – Task cards rest with subtle elevation; drop zones hidden.
2. **Grab** – On pointer down, the card lifts with 4px shadow, slight 2° tilt, and haptic feedback (if available).
3. **Transit** – Neighboring tasks animate apart using cubic-bezier easing, revealing a placeholder that matches the card size.
4. **Preview** – Placeholder pulses gently to show the projected drop slot; epic headers highlight if the card will change columns.
5. **Drop** – On release, card snaps into place; surrounding tasks settle with spring easing and the board confirms via a checkmark toast.
6. **Sync** – Socket.io broadcast updates peers; their UIs replay steps 3–5 using the same animation timings (120ms slide, 180ms spring).

## Task Editing Flow

- Single click focuses the inline editor; double click selects all text.
- Autosave triggers on blur or `Cmd/Ctrl + Enter`; failures show inline error badges.

## Activity & Completed Panels

- Panels slide in from the right with 200ms ease; they auto-collapse on mobile once actions complete.
- Notification badges show new events since last view; clicking the badge scrolls to the latest entry.
- Real-time toasts surface actor context: a pill containing the collaborator's name initials and avatar color fades in for 3 seconds whenever they edit tasks, reorder items, or change project settings.

## Accessibility

- Keyboard drag mode activated via `Space`; arrows move the ghost placeholder, `Enter` drops the task.
- Screen readers announce: "Moving task: Call runway vendor. Current position 2 of 5 in Epic Launch Prep."
- Focus outlines use high-contrast 2px borders adhering to WCAG AA.
