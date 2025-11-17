## Project setup

FeetFlight is organized as an Nx monorepo with the following structure:

- **`apps/`** - Deployable applications (API backend, web frontend)
- **`packages/`** - Shared libraries and utilities used across applications

## Getting Started

### Installation

Install all workspace dependencies:

```bash
bun install
```

### Running Tasks

Execute tasks using the Nx CLI:

```bash
# Run development server for a specific project
bunx nx dev <project-name>

# Build a specific project
bunx nx build <project-name>

# Run tests for a specific project
bunx nx test <project-name>

# Lint a specific project
bunx nx lint <project-name>
```

### Exploring the Workspace

List all projects in the workspace:

```bash
bunx nx show projects
```

View the project dependency graph:

```bash
bunx nx graph
```

View project details:

```bash
bunx nx show project <project-name>
```

## Workspace Structure

```
feetflight/
├── apps/                   # Application projects
│   ├── api/                # Elysia backend API
│   └── web/                # React frontend
├── packages/               # Shared libraries
│   ├── eslint-config/      # Shared ESLint & Prettier configuration
│   ├── shared-types/       # TypeBox schemas and TypeScript types
│   └── shared-utils/       # Utility functions
├── .husky/                 # Git hooks (pre-commit, pre-push)
├── nx.json                 # Nx workspace configuration
├── package.json            # Workspace root package.json
├── tsconfig.base.json      # Base TypeScript configuration
└── tsconfig.json           # Root TypeScript project references
```

### Path Aliases

Path aliases are configured in `tsconfig.base.json` for importing shared packages:

```typescript
// Import shared types and schemas
import { SignupSchema } from '@feetflight/shared-types';

// Import shared utilities
import { isEmpty } from '@feetflight/shared-utils';

// Import shared ESLint configuration
import baseConfig from '@feetflight/eslint-config';
import prettierConfig from '@feetflight/eslint-config/prettier';
```

## Available Commands

### Affected Commands

Run tasks only on projects affected by recent changes:

```bash
# Build all affected projects
bunx nx affected --target=build

# Test all affected projects
bunx nx affected --target=test

# Lint all affected projects
bunx nx affected --target=lint
```

### Run Many

Run a task across multiple projects:

```bash
# Build all projects
bunx nx run-many --target=build --all

# Test specific projects
bunx nx run-many --target=test --projects=api,web
```

### Cache Management

Nx caches task results for better performance:

```bash
# Clear the Nx cache
bunx nx reset
```

## Code Quality & Formatting

The project uses ESLint for linting and Prettier for code formatting, with Husky git hooks for automation.

### Linting

```bash
# Lint all projects
bun run lint

# Lint and auto-fix issues across all projects
bun run lint:fix

# Lint specific project
bun run lint:api
bun run lint:web
```

### Formatting

```bash
# Format all files with Prettier
bun run format

# Check formatting without making changes
bun run format:check
```

### Git Hooks

The project automatically enforces code quality through git hooks:

- **Pre-commit**: Automatically lints and formats staged files via `lint-staged`
- **Pre-push**: Runs full lint and format check before allowing push

To bypass hooks in special cases (not recommended):

```bash
# Skip pre-commit hook
git commit --no-verify -m "message"

# Skip pre-push hook
git push --no-verify
```

### ESLint Configuration

All projects share a common ESLint configuration from `@feetflight/eslint-config` package that includes:

- TypeScript support with type-aware linting
- Prettier integration for consistent formatting
- Relaxed rules for test files
- Modern ESLint flat config format

Each app can override rules in their `eslint.config.js` file as needed.

## Adding New Projects

### Adding an Application

Applications go in the `apps/` directory. Each application should have:

- `package.json` - Project-specific dependencies
- `project.json` - Nx project configuration
- `tsconfig.json` - TypeScript configuration (extends `tsconfig.base.json`)

### Adding a Shared Package

Shared packages go in the `packages/` directory. Each package should have:

- `package.json` - Package metadata and dependencies
- `project.json` - Nx project configuration
- `src/index.ts` - Main entry point
- `tsconfig.json` - TypeScript configuration (extends `tsconfig.base.json`)

Update the path mappings in `tsconfig.base.json` when adding new packages.
