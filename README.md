# CDP Console

A Next.js Customer Data Platform administration interface that acts as a middleware/proxy layer between a React frontend and three backend services (Admin API, SST API, Core API). It manages user properties, data mappings, tenants, users, and data sources with multi-tenant architecture and dual authentication.

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI
- **Forms**: react-hook-form + zod validation
- **Drag & Drop**: @dnd-kit
- **Charts**: recharts
- **Real-time**: socket.io-client
- **Notifications**: sonner
- **Theming**: next-themes

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your backend URLs and API keys

# Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_API_URL` | Yes | Admin API backend URL |
| `CORE_API_URL` | Yes | Core API backend URL |
| `CORE_API_TENANT_<id>_USERNAME` | No | Service account username for tenant `<id>` (enables Core API features) |
| `CORE_API_TENANT_<id>_PASSWORD` | No | Service account password for tenant `<id>` (plaintext, hashed server-side) |
| `NEXT_PUBLIC_DEFAULT_API_ENDPOINT` | No | Default SST API endpoint (overridable in UI) |
| `NEXT_PUBLIC_DEFAULT_API_KEY` | No | Default SST API key (overridable in UI) |
| `NEXT_PUBLIC_GA_ID` | No | Google Analytics measurement ID |

## Scripts

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
npm run clean    # Remove .next directory
```

## Architecture

### Backend Proxy

All external API calls are proxied through Next.js API routes (`app/api/`) to three backend services:

| Service | Auth Method | Manages |
|---------|-------------|---------|
| **Admin API** | JWT Bearer token | Authentication, clients, users, channel priority |
| **SST API** | `x-api-key` + `x-api-endpoint` headers | User properties, data mappings (tenant-specific) |
| **Core API** | OAuth2 Bearer token | OAuth tokens, offline data sources, customer profiles |

### Authentication

Dual authentication system:

- **Admin JWT** - stored as `auth-token` in localStorage, used for platform operations
- **Core OAuth2** - managed server-side in `lib/core-api-token.ts`; one cached token per tenant using service accounts configured in env vars. Tenants without a configured service account have Core API features (Data Sources, Customer One View, offline Data Mappings) gracefully disabled.

All passwords are SHA-256 hashed before transmission.

### Multi-Tenant

User flow: Login &rarr; Tenant Manager &rarr; Select Tenant &rarr; Feature Pages. All data operations require tenant context. Tenant credentials and selection are persisted in localStorage.

## Project Structure

```
app/
  api/              # Backend proxy routes (auth, clients, users, mappings, etc.)
  login/            # Login page
  tenants/          # Tenant management
  users/            # User management
  user-properties/  # User properties management
  mappings/         # Data mappings
  data-sources/     # Data source management
  customer-one-view/# Customer profile view
components/
  ui/               # 49 shadcn/ui components
  *-manager.tsx     # Self-contained manager components (fetching, state, CRUD)
lib/
  auth.ts               # Authentication utilities and password hashing
  core-api-token.ts     # Server-side Core API token cache (per-tenant service accounts)
  analytics.ts          # Google Analytics event tracking
  utils.ts              # Shared utilities
types/              # TypeScript type definitions
hooks/              # Custom React hooks
```

## Deployment

### Docker

```bash
# Standalone deployment
./deploy.sh [version] [environment]

# Docker Compose deployment
./deploy-compose.sh [version] [environment]

# Local build deployment
./deploy.sh local development --local
```

The Docker image uses a multi-stage build with `node:20-alpine`, runs as a non-root user, and exposes port 3000 internally (mapped to 3100 by default in docker-compose).

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full deployment guide.

### Netlify

```bash
netlify build    # Test build locally
netlify deploy   # Deploy to preview URL
netlify dev      # Local dev with Netlify functions
```

## Release Management

This project uses [release-please](https://github.com/googleapis/release-please) for automated versioning. All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
feat(mappings): add drag-and-drop sorting    # Minor version bump
fix(auth): handle expired JWT tokens         # Patch version bump
feat(api)!: change response structure        # Major version bump
```

See [CLAUDE.md](CLAUDE.md) for the full commit type reference and development guidelines.

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Docker deployment guide with health checks and troubleshooting
- [CLAUDE.md](CLAUDE.md) - Development patterns, API structures, and contributor guide
- [docs/analytics-tracking.md](docs/analytics-tracking.md) - Google Analytics event tracking patterns
- [docs/google-analytics.md](docs/google-analytics.md) - Analytics implementation details

## License

Proprietary - HCL Software
