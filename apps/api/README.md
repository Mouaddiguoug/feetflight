### Development

From the workspace root:

```bash
nx dev api
```

### Build Binary (Cluster Mode)

```bash
# From workspace root
nx build api

# Or from apps/api directory
bun run build
```

### Build Options

```bash
# Cluster mode (default) - uses all CPU cores
bun run build
# or
bun run build:cluster

# Single process mode - no clustering
bun run build:single

# JavaScript bundle - instead of binary
bun run build:js
```

### Run Production Binary

```bash
# From workspace root
nx start api

# Or from apps/api directory
bun run start

# Or run the binary directly
NODE_ENV=production ./dist/server
```

## Testing

```bash
# From workspace root
nx test api

# Or from apps/api directory
bun run test
```

### Quick Docker Build

```bash
docker build -t feetflight-api .
docker run -p 3000:3000 -e NODE_ENV=production feetflight-api
```

## Project Structure

```
apps/api/
├── src/
│   ├── controllers/     # Request handlers and business logic
│   ├── services/        # Service layer for business operations
│   ├── routes/          # API route definitions
│   ├── models/          # Data models
│   ├── plugins/         # Elysia plugins (auth, logger, error handling)
│   ├── middlewares/     # Custom middlewares (validation, auth, etc.)
│   ├── interfaces/      # TypeScript interfaces
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration files
│   ├── emails/          # React email templates
│   ├── tests/           # Jest test files
│   ├── app.ts           # Elysia app configuration
│   ├── server.ts        # Server setup with port configuration
│   └── index.ts         # Cluster mode entry point (production)
├── dist/                # Build output directory
│   └── server           # Compiled production binary
├── public/              # Static assets (email templates, success pages)
├── Dockerfile           # Multi-stage production Dockerfile
├── .dockerignore        # Docker ignore patterns
├── project.json         # Nx project configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Package manifest
└── README.md            # This file
```
