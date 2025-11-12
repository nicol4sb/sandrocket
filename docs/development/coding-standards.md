# Coding Standards

## Language & Style

- Prefer modern JavaScript/TypeScript syntax (modules, async/await, optional chaining).
- Keep files focused; extract helpers once they exceed ~150 lines or mix concerns.
- Use ESLint and Prettier defaults supplied in the repository.

## Naming

- Domain concepts use ubiquitous language (`Task`, `Epic`, `Invite`).
- Interfaces end with `Service`, `Repository`, or `Gateway` to clarify intent.
- Event names follow `EntityAction` (e.g. `TaskCompleted`).

## Testing

- Unit tests live alongside the module under `__tests__/`.
- Use in-memory adapters for domain tests; integration tests can instantiate real adapters under `tests/integration/`.
- Aim for deterministic tests—avoid relying on wall-clock time where possible.

## Git Hygiene

- Keep commits scoped to a single concern.
- Reference issues or tasks in commit messages when applicable.
- Avoid committing build artifacts or local environment files.

