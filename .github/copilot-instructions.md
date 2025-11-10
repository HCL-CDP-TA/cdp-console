# CDP Console - AI Coding Agent Instructions

## Project Overview

This is a Next.js 15 Customer Data Platform (CDP) Console application that acts as a middleware/proxy layer between a React frontend and three backend services (Admin API, SST API, Core API). It manages user properties, data mappings, tenants, users, and offline data sources with multi-tenant architecture and dual authentication systems.

**Tech Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Radix UI, @dnd-kit, Google Analytics

## Architecture Patterns

### Multi-Backend Proxy Structure

The application proxies requests to three distinct backend services:

1. **Admin API** (`ADMIN_API_URL`) - Authentication, clients, users, channel priority
2. **SST API** (tenant-specific) - User properties and data mappings (requires `x-api-key` + `x-api-endpoint` headers)
3. **Core API** (`CORE_API_URL`) - OAuth2 authentication and offline data sources

API routes in `app/api/` follow this pattern:

- Admin API endpoints use Bearer tokens: `Authorization: Bearer ${token}`
- SST API endpoints use custom headers: `x-api-key` and `x-api-endpoint`
- Core API uses OAuth2 bearer tokens with automatic retry on 401

### Authentication System

**Dual authentication approach** - stored in localStorage via `lib/auth.ts`:

- `auth-token`: JWT for Admin API endpoints
- `auth-core-token`: OAuth2 token for Core API endpoints (in-memory only in components)
- `auth-username`: Currently authenticated user

**Password handling**: All passwords MUST be SHA-256 encoded client-side before transmission using `hashPassword()` from `lib/auth.ts`. Never send plaintext passwords.

**Token validation**: Use `validateAuthState()` before protected operations. Handle 401 responses by clearing auth state and redirecting to `/login`.

### Tenant Management

Tenants are stored per-user in localStorage with this pattern:

```typescript
// Global settings
localStorage.setItem('cdp-tenant-settings', JSON.stringify({
  apiKey: string,
  apiEndpoint: string,
  favoriteTenants: string[] // client IDs
}))

// Per-tenant data
localStorage.setItem(`tenant-${tenantId}`, JSON.stringify({
  id, name, displayName, clientId, apiKey, apiEndpoint,
  coreApiUsername, coreApiPassword // SHA-256 encoded
}))
```

Selected tenant is stored in `selectedTenantId` and loaded on app initialization.

## Key Development Patterns

### API Route Structure

All API routes use Next.js 15 async params pattern:

```typescript
export const GET = async (request: NextRequest, { params }: { params: Promise<{ paramName: string }> }) => {
  const { paramName } = await params
  // ... implementation
}
```

**Error handling**: Return JSON with proper status codes. For 401 errors from backend, include `shouldRedirect: true` (Admin API) or `shouldReauth: true` (Core API).

### Component Patterns

**Use "use client" directive** for all interactive components (required for hooks, state, event handlers).

**State management**: React hooks only - no external state libraries. Use `useCallback` for event handlers that are passed as props or used in `useEffect` dependencies.

**Analytics tracking**: Import from `lib/analytics.ts` and track:

- `trackNavigation(section)` - Route changes
- `trackAPICall(endpoint, method, success)` - API calls
- `trackDetailedUserAction(action, context, details)` - User interactions
- `trackError(type, message, location)` - Error events

### Data Fetching Pattern

Standard pattern in components:

```typescript
const [data, setData] = useState<Type[]>([])
const [loading, setLoading] = useState(false)

const fetchData = useCallback(async () => {
  setLoading(true)
  try {
    const authState = getAuthState()
    const response = await fetch("/api/endpoint", {
      headers: {
        Authorization: `Bearer ${authState.token}`,
        "x-api-key": tenant.apiKey, // if SST API
        "x-api-endpoint": tenant.apiEndpoint, // if SST API
      },
    })

    if (response.ok) {
      const data = await response.json()
      setData(data)
      trackAPICall("/api/endpoint", "GET", true)
    } else if (response.status === 401) {
      clearAuthState()
      onAuthExpired() // Redirect to login
      trackAPICall("/api/endpoint", "GET", false)
    }
  } catch (error) {
    trackError("network_error", error.message, "component_name")
  } finally {
    setLoading(false)
  }
}, [dependencies])
```

### shadcn/ui Components

Uses shadcn/ui components from `components/ui/`. Configuration in `components.json`:

- Path alias: `@/` for imports
- Tailwind with CSS variables for theming
- RSC-compatible components where possible

When adding new UI components: `npx shadcn-ui@latest add <component-name>`

### Drag-and-Drop Implementation

Uses `@dnd-kit` for sortable lists (see `customer-one-view-manager.tsx`):

```typescript
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable"

// In sortable item component:
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

// Handle drag end:
const handleDragEnd = event => {
  const { active, over } = event
  if (active.id !== over.id) {
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)
  }
}
```

## Development Workflow

**Local development**:

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
npm run clean        # Remove .next directory
```

**Environment variables** required (`.env.local`):

- `ADMIN_API_URL` - Admin backend service
- `CORE_API_URL` - Core API service
- `NEXT_PUBLIC_GA_ID` - Google Analytics tracking ID (optional)
- `NEXT_PUBLIC_DEFAULT_API_ENDPOINT` - Default SST endpoint (optional)
- `NEXT_PUBLIC_DEFAULT_API_KEY` - Default API key (optional)

**Docker deployment**: See `DEPLOYMENT.md`. Uses multi-stage builds with standalone output mode. Deploy with `./deploy.sh` or `./deploy-compose.sh`.

**Netlify deployment**: Configured via `netlify.toml` with `@netlify/plugin-nextjs`. Builds only on production/release contexts.

## File Organization

- `app/` - Next.js App Router pages and API routes
  - `api/` - Backend proxy endpoints (auth, clients, users, mappings, etc.)
  - Route pages: `user-properties/`, `mappings/`, `users/`, `data-sources/`, etc.
- `components/` - React components (managers, forms, layouts)
- `lib/` - Utilities (auth, analytics, utils)
- `types/` - TypeScript type definitions
- `hooks/` - Custom React hooks
- `docs/` - Additional documentation

## Common Gotchas

1. **Tenant ID prefixing**: SST mappings API automatically prefixes tenant IDs with "VIZVRM" - don't add it manually
2. **Password encoding**: Always use `hashPassword()` from `lib/auth.ts` - never send plain passwords
3. **Core API tokens**: Store in component state only, NOT localStorage (security concern)
4. **Params in API routes**: Always `await params` in Next.js 15 route handlers
5. **Auth expiration**: Handle 401 by clearing localStorage and redirecting - don't retry indefinitely
6. **Form data vs JSON**: User creation endpoint uses multipart/form-data; all others use JSON
7. **Data source names**: URL-encode data source names for API calls (spaces, special chars)

## Testing Locally

Use `scripts/LOCAL_TESTING.md` for GitHub Actions testing with `act`. For Netlify:

```bash
netlify build        # Test build locally
netlify deploy       # Deploy to preview
netlify dev          # Local dev with functions
```

## Documentation References

- `CDP_CONSOLE_API_DOCUMENTATION.md` - Complete API endpoint documentation
- `CORE_API_DOCUMENTATION.md` - Core API integration details
- `DEPLOYMENT.md` - Docker deployment guide
- `docs/google-analytics.md` - Analytics tracking implementation
- `docs/analytics-tracking.md` - Event tracking patterns
