# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CDP Console is a Next.js 15 Customer Data Platform administration interface that acts as a middleware/proxy layer between a React frontend and three backend services: Admin API, SST API, and Core API. It manages user properties, data mappings, tenants, users, and data sources with multi-tenant architecture and dual authentication systems.

**Tech Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Radix UI, @dnd-kit, Socket.io, Google Analytics

## Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run clean        # Remove .next directory

# Testing
netlify build        # Test Netlify build locally
netlify deploy       # Deploy to preview URL
netlify dev          # Local dev with Netlify functions

# Testing GitHub Actions locally (requires `act`)
act release --secret-file .secrets
```

## Version Control & Release Management

This project uses **release-please** for automated versioning and changelog generation. All commits MUST follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Conventional Commits Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Required Elements**:
- `type`: The kind of change (see types below)
- `description`: Short summary in present tense (lowercase, no period)

**Optional Elements**:
- `scope`: Component/module affected (e.g., `auth`, `mappings`, `api`)
- `body`: Detailed explanation of changes
- `footer`: Breaking changes, issue references

### Commit Types

| Type | Description | Version Impact | Example |
|------|-------------|----------------|---------|
| `feat` | New feature | Minor (0.x.0) | `feat(mappings): add drag-and-drop sorting` |
| `fix` | Bug fix | Patch (0.0.x) | `fix(auth): handle expired JWT tokens correctly` |
| `docs` | Documentation only | None | `docs: update API endpoint documentation` |
| `style` | Code style/formatting | None | `style: fix indentation in UserManager` |
| `refactor` | Code restructuring | None | `refactor(api): simplify tenant validation logic` |
| `perf` | Performance improvement | Patch (0.0.x) | `perf(data-sources): optimize fetch with caching` |
| `test` | Adding/updating tests | None | `test: add unit tests for hashPassword` |
| `build` | Build system changes | None | `build: update Next.js to 15.1.0` |
| `ci` | CI/CD changes | None | `ci: add Docker build workflow` |
| `chore` | Maintenance tasks | None | `chore: update dependencies` |
| `revert` | Revert previous commit | Depends | `revert: feat(mappings): add drag-and-drop` |

### Breaking Changes

Breaking changes trigger a **major version bump** (x.0.0). Indicate breaking changes with:

1. `!` after type/scope: `feat!:` or `feat(api)!:`
2. Footer with `BREAKING CHANGE:` followed by description

```bash
# Example 1: Using !
feat(auth)!: require SHA-256 password hashing

All authentication endpoints now require client-side password hashing.
Update client code to use hashPassword() from lib/auth.ts.

# Example 2: Using footer
feat(api): change tenant API response structure

BREAKING CHANGE: Tenant API now returns `displayName` instead of `name`.
Update all components that reference tenant.name to use tenant.displayName.
```

### Scopes

Common scopes in this project:
- `auth` - Authentication and authorization
- `api` - API routes and backend proxy
- `mappings` - Data mappings functionality
- `user-properties` - User properties management
- `data-sources` - Data source management
- `tenants` - Tenant management
- `ui` - UI components
- `analytics` - Analytics tracking
- `deployment` - Deployment configuration

### Examples

**Feature additions**:
```bash
feat(customer-one-view): add customer profile export
feat(ui): add dark mode toggle to settings
feat: integrate Socket.io for real-time updates
```

**Bug fixes**:
```bash
fix(auth): clear localStorage on 401 responses
fix(api): handle URL-encoded data source names
fix(mappings): prevent duplicate tenant ID prefix
```

**Documentation**:
```bash
docs: add deployment troubleshooting guide
docs(api): document SST API authentication headers
```

**Chores**:
```bash
chore: update shadcn/ui components to latest
chore(deps): bump lucide-react to 0.400.0
chore: clean up unused imports
```

**Multiple changes in one commit** (avoid if possible):
```bash
feat(data-sources): add filtering and pagination

- Add search input for data source names
- Implement pagination with page size selector
- Add loading states and error handling
```

### Version Impact

release-please automatically determines version bumps:
- `feat` → Minor version (0.x.0)
- `fix`, `perf` → Patch version (0.0.x)
- `BREAKING CHANGE` or `!` → Major version (x.0.0)
- Other types → No version change (included in next release)

### Best Practices

1. **One logical change per commit** - Don't mix features, fixes, and refactoring
2. **Write clear descriptions** - Future developers should understand the change without reading code
3. **Use scopes consistently** - Helps with changelog organization and filtering
4. **Reference issues** - Include issue numbers in footer: `Fixes #123` or `Closes #456`
5. **Keep commits atomic** - Each commit should leave the codebase in a working state
6. **Don't skip the type** - Every commit needs a type, even for "quick fixes"

### Release Process

1. Make changes following conventional commits
2. Push to main branch (or merge PR)
3. release-please bot automatically:
   - Creates/updates a release PR with changelog
   - Bumps version in `package.json`
   - Generates GitHub release notes
4. Merge the release PR to trigger deployment

**Common Mistake**: Using non-standard types like `update`, `add`, `change`. Always use the standard types listed above.

## Architecture

### Multi-Backend Proxy Structure

All external API calls are proxied through Next.js API routes (`app/api/`) to three distinct backend services:

1. **Admin API** - Authentication, clients, users, channel priority
   - Auth: `Authorization: Bearer {JWT_token}`
   - Endpoints: `/api/auth/login`, `/api/clients`, `/api/users/*`

2. **SST API** (tenant-specific) - User properties and data mappings
   - Auth: Custom headers `x-api-key` and `x-api-endpoint`
   - Tenant-specific credentials stored in localStorage
   - Endpoints: `/api/user-properties/*`, `/api/mappings/*`

3. **Core API** - OAuth2 authentication and offline data sources
   - Auth: `Authorization: Bearer {access_token}` (OAuth2)
   - Endpoints: `/api/core-auth/token`, `/api/offline-data-sources/*`

**API Route Pattern (Next.js 15)**:
```typescript
export const GET = async (request: NextRequest, { params }: { params: Promise<{ paramName: string }> }) => {
  const { paramName } = await params  // Always await params in Next.js 15
  // 1. Extract credentials from headers
  // 2. Validate authorization
  // 3. Construct backend URL with tenant params
  // 4. Proxy request to backend
  // 5. Handle response with proper error codes
}
```

### Authentication Architecture

**Dual Authentication System** managed via `lib/auth.ts`:

1. **Admin API JWT Token**
   - Stored in localStorage as `auth-token`
   - Used for platform operations (clients, users)
   - Validation: `validateAuthState()` checks JWT expiration

2. **Core API OAuth2 Token**
   - Stored in localStorage as `auth-core-token`
   - Used for data access (offline sources, Core API)
   - Hardcoded client credentials in `/api/core-auth/token`

**Password Security**: All passwords must be SHA-256 hashed client-side before transmission using `hashPassword()` from `lib/auth.ts`. Uses Web Crypto API (HTTPS/localhost) with crypto-js fallback.

**Auth Validation Flow**:
- Check token existence in localStorage
- Decode JWT and verify expiration (exp claim)
- If expired: `clearAuthState()` and redirect to `/login`
- Handle 401 responses with `shouldRedirect: true` or `shouldReauth: true`

### Tenant Management

Multi-tenant architecture with dynamic tenant selection:

```typescript
// Global tenant settings
localStorage: 'cdp-tenant-settings' → {
  apiKey: string,
  apiEndpoint: string,
  favoriteTenants: string[]
}

// Per-tenant data
localStorage: `tenant-${tenantId}` → {
  id, name, displayName, clientId,
  apiKey, apiEndpoint,
  coreApiUsername, coreApiPassword  // SHA-256 encoded
}

// Current selection
localStorage: 'selectedTenantId' → tenantId
```

**Tenant-Centric Flow**: Login → Tenant Manager → Select Tenant → Feature Pages. All data operations require tenant context.

### State Management

**No external state libraries** (Redux/Zustand/Context API). Uses lightweight component-local state:

```typescript
// Standard component pattern
const [data, setData] = useState<Type[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// Data fetching with useCallback
const fetchData = useCallback(async () => {
  setLoading(true)
  try {
    const response = await fetch("/api/endpoint", {
      headers: {
        Authorization: `Bearer ${authState.token}`,
        "x-api-key": tenant.apiKey,  // for SST API
        "x-api-endpoint": tenant.apiEndpoint
      }
    })
    // Handle response
    trackAPICall("/api/endpoint", "GET", true)
  } catch (error) {
    trackError("network_error", error.message, "component_name")
  } finally {
    setLoading(false)
  }
}, [dependencies])
```

**localStorage as Persistent State**: Auth tokens, tenant selection, API credentials, theme preferences.

### Component Architecture

**Manager Pattern**: Large, self-contained manager components handle their own fetching, state, filtering, searching, and CRUD operations. Examples:
- `UserPropertiesManager` - Manages user properties with pagination
- `DataMappingsManager` - Handles data source mapping with drag-and-drop
- `CustomerOneViewManager` - Customer profile management

**Pages as Thin Wrappers**: Route pages load tenant from localStorage and pass to manager components with callbacks for auth expiration and navigation.

## Key Libraries

- **UI Framework**: shadcn/ui components (`components/ui/`) built on Radix UI primitives
- **Styling**: Tailwind CSS with `tailwind-merge`, `clsx`, `class-variance-authority`
- **Forms**: `react-hook-form` with `zod` validation via `@hookform/resolvers`
- **Drag & Drop**: `@dnd-kit` for accessible sortable lists
- **Icons**: `lucide-react` (466+ icons)
- **Charts**: `recharts` for data visualization
- **Real-time**: `socket.io-client` for WebSocket communication
- **Notifications**: `sonner` toast library
- **Crypto**: `crypto-js` for SHA-256 hashing fallback
- **Date Utilities**: `date-fns`
- **Theming**: `next-themes`

## Development Patterns

### Client-Side Components

Use `"use client"` directive for all interactive components (hooks, state, event handlers required).

### Analytics Tracking

Import from `lib/analytics.ts` and track key events:
```typescript
trackNavigation(section)  // Route changes
trackAPICall(endpoint, method, success)  // API calls
trackDetailedUserAction(action, context, details)  // User interactions
trackError(type, message, location)  // Errors
```

### Adding shadcn/ui Components

```bash
npx shadcn-ui@latest add <component-name>
```

Configuration in `components.json`:
- Path alias: `@/` for imports
- Tailwind with CSS variables
- RSC-compatible where possible

### Drag-and-Drop Pattern

Used for channel priority ordering and data source management:
```typescript
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable"

const { attributes, listeners, setNodeRef, transform, transition } =
  useSortable({ id: item.id })

const handleDragEnd = (event) => {
  const { active, over } = event
  if (active.id !== over.id) {
    setItems(arrayMove(items, oldIndex, newIndex))
  }
}
```

### TypeScript Configuration

- Path alias: `@/*` maps to root directory
- Strict mode enabled
- Module resolution: bundler (Next.js 15)
- Target: ES5 for broad compatibility

## Common Gotchas

1. **Tenant ID Prefixing**: SST mappings API automatically prefixes tenant IDs with "VIZVRM" - don't add manually
2. **Password Encoding**: Always use `hashPassword()` from `lib/auth.ts` - never send plaintext
3. **Core API Tokens**: Store in localStorage (not component state like previous docs suggested)
4. **Next.js 15 Params**: Always `await params` in API route handlers
5. **Auth Expiration**: Handle 401 by clearing localStorage and redirecting - don't retry indefinitely
6. **Form Data vs JSON**: User creation uses multipart/form-data; all other endpoints use JSON
7. **Data Source Names**: URL-encode data source names in API calls (handle spaces, special chars)
8. **Component State**: Use `useCallback` for functions passed as props or used in `useEffect` dependencies

## Environment Variables

Required in `.env.local`:
```bash
ADMIN_API_URL=https://adminbackend.dev.hxcd.now.hclsoftware.cloud
CORE_API_URL=https://coreapi.dev.hxcd.now.hclsoftware.cloud

# Optional - users can override in UI
NEXT_PUBLIC_DEFAULT_API_ENDPOINT=https://dmp-sst-api.dev.hxcd.now.hclsoftware.cloud
NEXT_PUBLIC_DEFAULT_API_KEY=
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## Deployment

**Docker**:
```bash
./deploy.sh [version] [environment]  # Standalone deployment
./deploy-compose.sh [version] [environment]  # Docker Compose deployment
```

**Netlify**: Configured via `netlify.toml` with `@netlify/plugin-nextjs`. Builds only on production/release contexts.

**Build Configuration**:
- Output: Standalone (Next.js optimization)
- Images: Unoptimized (for compatibility)

See `DEPLOYMENT.md` for full deployment guide.

## Testing

**Local GitHub Actions Testing**: Use `act` (see `scripts/LOCAL_TESTING.md`)
```bash
act release --secret-file .secrets
```

**Netlify Testing**:
```bash
netlify build        # Test build
netlify deploy       # Preview deployment
netlify dev          # Local functions
```

## File Structure

- `app/` - Next.js App Router pages and API routes
  - `api/` - 19 backend proxy endpoints
  - Feature pages: `user-properties/`, `mappings/`, `users/`, `data-sources/`, `customer-one-view/`, etc.
- `components/` - React components (manager components, forms, layouts)
- `components/ui/` - 49 shadcn/ui components
- `lib/` - Utilities (`auth.ts`, `analytics.ts`, `utils.ts`)
- `types/` - TypeScript definitions (`tenant.ts`, `auth.ts`)
- `hooks/` - Custom hooks (`use-toast.ts`, `use-google-analytics.ts`)
- `docs/` - Additional documentation

## Additional Documentation

- `.github/copilot-instructions.md` - Detailed development patterns and API structures
- `DEPLOYMENT.md` - Docker deployment guide with health checks and troubleshooting
- `docs/analytics-tracking.md` - Google Analytics event tracking patterns
- `docs/google-analytics.md` - Analytics implementation details
- `scripts/LOCAL_TESTING.md` - GitHub Actions local testing with `act`
- `.env.example` - Environment variable template
