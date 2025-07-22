# Analytics Tracking Implementation

## Overview

Comprehensive Google Analytics tracking has been implemented for the CDP Console single-page application to monitor user interactions, navigation patterns, and feature usage.

## Navigation Tracking

### Virtual Page Views

Since the application is a SPA with a single URL ("/"), virtual page views are tracked when users navigate between different sections:

- **Dashboard** - `/dashboard`
- **Tenant Management** - `/tenants`
- **User Properties** - `/properties`
- **Data Mappings** - `/mappings`
- **User Management** - `/users`
- **Channel Priority** - `/channel-priority`

### Tenant Selection

- Tracks when users select different tenants
- Includes tenant ID and name for segmentation

## User Interaction Tracking

### Form Interactions

1. **Add User Property**

   - Form open/close
   - Form submission
   - Form cancellation
   - Form errors

2. **Edit User Property**

   - Edit button click
   - Form open/close
   - Form submission
   - Form errors

3. **Delete User Property**
   - Delete confirmation dialog
   - Successful deletion
   - Deletion errors

### Search and Filtering

- Search queries in user properties
- Pagination changes (page number, page size)
- Filter applications

### Data Management Actions

- Create operations with resource details
- Update operations with change context
- Delete operations with confirmation tracking
- Bulk operations (when implemented)

### System Actions

- Refresh data button clicks
- API call success/failure rates
- Authentication events (login/logout)
- Error occurrences with context

## Event Categories

### 1. Navigation

- **Action**: `navigate`
- **Label**: Section name (dashboard, properties, etc.)
- **Context**: Tenant selection status

### 2. User Actions

- **Actions**: `add_user_properties`, `edit_user_properties`, `delete_user_properties`, `refresh_user_properties`
- **Context**: Resource type and operation details

### 3. Form Interactions

- **Actions**: `form_open`, `form_submit`, `form_cancel`, `form_error`
- **Label**: Form type and resource (e.g., `add_user_property`)

### 4. Search/Filter

- **Actions**: `search`, `filter`, `sort`, `paginate`
- **Context**: Search terms and filter criteria

### 5. Data Management

- **Actions**: `create`, `update`, `delete`
- **Resource Types**: `user_property`, `data_mapping`, `user`, `channel_priority`

### 6. API Monitoring

- **Action**: `api_call`
- **Context**: Endpoint, method, success status

### 7. Error Tracking

- **Types**: `network_error`, `api_error`, `form_error`, `auth_error`
- **Context**: Error location and message

## Analytics Functions Used

### Page Tracking

```typescript
trackVirtualPageView(pageName: string, title?: string)
trackNavigation(section: string, tenantId?: string)
```

### User Actions

```typescript
trackDetailedUserAction(action, context, details)
trackFormInteraction(formType, resourceType, action)
trackSearchFilter(searchType, context, query)
```

### Data Operations

```typescript
trackDataManagement(action, resourceType, details)
trackTenantSelection(tenantId, tenantName)
```

### System Monitoring

```typescript
trackAPICall(endpoint, method, success)
trackError(errorType, message, location)
trackAuthentication(action)
```

## Benefits

### User Experience Insights

- Most used features and navigation patterns
- Drop-off points in user workflows
- Feature adoption rates
- Error frequency and types

### Performance Monitoring

- API endpoint success rates
- Response time patterns (via timing events)
- Error patterns and troubleshooting data

### Product Analytics

- Feature usage statistics
- User journey mapping
- Conversion funnel analysis
- A/B testing capabilities (future)

## Privacy Compliance

### Data Collection

- No personally identifiable information (PII)
- Only interaction patterns and feature usage
- Error messages sanitized of sensitive data
- Tenant names/IDs only (no customer data)

### Opt-out Capability

- Google Analytics respects Do Not Track headers
- Can be disabled via environment variables
- GDPR compliant data collection

## Implementation Details

### Files Modified

- `lib/analytics.ts` - Core analytics functions
- `app/page.tsx` - Navigation tracking
- `components/user-properties-manager.tsx` - Detailed interaction tracking
- `components/login-form.tsx` - Authentication tracking
- `app/layout.tsx` - Google Analytics integration

### Environment Setup

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Testing

- Real-time analytics in Google Analytics dashboard
- Network tab monitoring for gtag requests
- Google Analytics Debugger browser extension
- DebugView in Google Analytics for immediate feedback
