```markdown
# app-v7m Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill introduces the core development patterns and conventions used in the `app-v7m` TypeScript codebase. It covers file naming, import/export styles, commit message standards, and testing patterns, providing practical examples and recommended commands for efficient development.

## Coding Conventions

### File Naming
- Use **camelCase** for all filenames.
  - Example: `userProfile.ts`, `dataService.ts`

### Import Style
- Use **alias imports** to reference modules.
  - Example:
    ```typescript
    import { fetchData } from '@utils/network';
    ```

### Export Style
- Both **named** and **default exports** are used.
  - Named export:
    ```typescript
    export function calculateSum(a: number, b: number): number {
      return a + b;
    }
    ```
  - Default export:
    ```typescript
    const config = { apiUrl: '/api' };
    export default config;
    ```

### Commit Messages
- Follow **Conventional Commits** with the `feat` prefix for new features.
  - Example:
    ```
    feat: add user authentication flow
    ```

## Workflows

_No automated workflows detected in this repository._

## Testing Patterns

- Test files follow the pattern: `*.test.*`
  - Example: `userService.test.ts`
- Testing framework is **unknown**; check individual test files for specifics.
- Typical test file structure:
  ```typescript
  describe('userService', () => {
    it('should fetch user data', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command | Purpose |
|---------|---------|
| /test   | Run all test files matching `*.test.*` |
| /commit | Create a commit using the conventional `feat` prefix |
```