# Core API Documentation for CDP Console

This document provides comprehensive API documentation for the Core API integration within the CDP Console project. The Core API provides access to offline data sources and uses OAuth2 authentication.

## Overview

The Core API integration enables the CDP Console to:

1. Authenticate users via OAuth2 password grant flow
2. Fetch offline/batch data sources for dynamic tab generation
3. Manage authentication tokens with automatic refresh on 401 errors

## Environment Configuration

### Required Environment Variables

- `CORE_API_URL` - Base URL for the Core API service (e.g., `https://coreapi.dev.hxcd.now.hclsoftware.cloud`)

## Authentication Flow

### OAuth2 Password Grant

The Core API uses OAuth2 password grant flow with hardcoded client credentials for simplicity.

**Hardcoded Client Credentials:**

- `client_id`: "client_id"
- `client_secret`: "client_secret"

**User Credentials:**

- Stored in localStorage per tenant
- Password is SHA-256 encoded before storage and transmission

## API Endpoints

### 1. Core API Token Authentication

#### POST `/api/core-auth/token`

Authenticates a user with the Core API and returns an OAuth2 access token.

**Request:**

```json
{
  "username": "string",
  "password": "string" // SHA-256 encoded password
}
```

**Response (Success - 200):**

```json
{
  "access_token": "string",
  "token_type": "bearer",
  "expires_in": "string",
  "refresh_token": "string",
  "uid": "number",
  "isFirstTime": "number",
  "isTFAEnabled": "number",
  "passwordExpired": "number",
  "isTFARequired": "number"
}
```

**Response (Error - 401):**

```json
{
  "error": "Authentication failed"
}
```

**Response (Error - 400/500):**

```json
{
  "error": "string"
}
```

**Backend Implementation:**

- Proxies to: `${CORE_API_URL}/oauth2/token`
- Method: POST
- Content-Type: `application/x-www-form-urlencoded`
- Form data:
  - `username`: User's username
  - `password`: SHA-256 encoded password
  - `grant_type`: "password" (hardcoded)
  - `client_id`: "client_id" (hardcoded)
  - `client_secret`: "client_secret" (hardcoded)

**Notes:**

- Password must be SHA-256 encoded on the client side before sending
- Client credentials are hardcoded in the backend for security
- Returns OAuth2 access token for subsequent API calls

---

### 2. Offline Data Sources

#### GET `/api/offline-data-sources/[clientId]`

Retrieves all active offline data sources for a specific client.

**Authentication:** Bearer Token Required (Core API token)

**Path Parameters:**

- `clientId` (string) - The client/campaign ID

**Headers Required:**

- `Authorization: Bearer <core_api_token>`

**Response (Success - 200):**

```json
{
  "data": [
    {
      "id": "number",
      "name": "string",
      "createdOn": "string",
      "isActive": "number",
      "type": "string"
    }
  ]
}
```

**Response (Error - 401 with re-auth indication):**

```json
{
  "error": "Authentication failed",
  "shouldReauth": true
}
```

**Response (Error - 400/500):**

```json
{
  "error": "string",
  "details": "string",
  "status": "number"
}
```

**Backend Implementation:**

- Proxies to: `${CORE_API_URL}/-/v1/advertisers/${clientId}/cdpOfflineDataSource`
- Method: GET
- Headers: `Authorization: Bearer ${token}`, `Content-Type: application/json`

**Notes:**

- Only returns data sources where `isActive === 1`
- The `name` field is used for data source identification (not the `id`)
- Special error handling for 401 responses to trigger re-authentication

---

## Data Structures

### Core API Token Response

```typescript
interface CoreApiTokenResponse {
  access_token: string
  token_type: string
  expires_in: string
  refresh_token: string
  uid: number
  isFirstTime: number
  isTFAEnabled: number
  passwordExpired: number
  isTFARequired: number
}
```

### Offline Data Source

```typescript
interface OfflineDataSource {
  id: number
  name: string
  createdOn: string
  isActive: number
  type: string
}
```

### Tenant with Core API Credentials

```typescript
interface Tenant {
  // ... existing fields
  coreApiUsername?: string
  coreApiPassword?: string // SHA-256 encoded password
}
```

## Frontend Integration

### Authentication Flow

1. **Initial Load**: Check localStorage for stored Core API credentials per tenant
2. **Authentication**: If credentials exist, attempt authentication
3. **Token Storage**: Store access token in component state (not localStorage for security)
4. **Data Fetching**: Use token to fetch offline data sources
5. **Error Handling**: On 401 errors, attempt re-authentication once
6. **Graceful Fallback**: If re-authentication fails, hide offline data source tabs

### localStorage Structure

Credentials are stored per tenant in localStorage:

```javascript
const tenantKey = `tenant-${tenant.id}`
const storedTenant = {
  // ... existing tenant fields
  coreApiUsername: "username",
  coreApiPassword: "sha256_encoded_password",
}
localStorage.setItem(tenantKey, JSON.stringify(storedTenant))
```

### UI Behavior

#### Tab Display

- **Standard Data Sources**: Always visible (Web SDK, Data Ingestion API)
- **Offline Data Sources**: Dynamically loaded and displayed with HardDrive icon
- **Loading State**: Shows "Loading offline sources..." during fetch
- **Error State**: Gracefully hides offline tabs on authentication failure

#### Credential Prompting

- Triggered when clicking on offline data source tab without authentication
- Modal dialog prompts for username and password
- Credentials are validated immediately upon submission
- Failed authentication shows alert message

#### Token Management

- Access tokens stored in component state only
- Automatic retry on 401 errors with single attempt limit
- No refresh token implementation (re-authenticate on expiry)

## Error Handling

### Authentication Errors

#### Invalid Credentials

- **Trigger**: Wrong username/password combination
- **Response**: 401 from Core API
- **Behavior**: Show alert message, prompt for credentials again

#### Token Expiry

- **Trigger**: API calls with expired access token
- **Response**: 401 with `shouldReauth: true`
- **Behavior**: Attempt automatic re-authentication using stored credentials

#### Network Errors

- **Trigger**: Network connectivity issues
- **Response**: 500 or network timeout
- **Behavior**: Console error log, graceful fallback to hide offline tabs

### Data Source Errors

#### Missing Client ID

- **Trigger**: Invalid or missing client ID in URL path
- **Response**: 400 from Core API
- **Behavior**: Console error, empty data source list

#### Permission Denied

- **Trigger**: User lacks access to specific client's data sources
- **Response**: 403 from Core API
- **Behavior**: Console error, empty data source list

## Security Considerations

### Password Handling

- Passwords are SHA-256 encoded before storage and transmission
- No plain text passwords stored in localStorage or transmitted
- Client-side encoding provides basic security (not cryptographic security)

### Token Management

- Access tokens stored in memory only (component state)
- Tokens not persisted to localStorage for security
- Short-lived tokens require re-authentication on expiry

### Client Credentials

- Hardcoded in backend for simplicity
- Not exposed to frontend JavaScript
- Environment-specific configuration possible

## Implementation Notes

### URL Encoding

- Data source names automatically URL-encoded when used in API calls
- Special characters in data source names handled safely

### Retry Logic

- Single retry attempt on 401 errors
- No infinite retry loops
- Graceful fallback on repeated failures

### Performance Considerations

- Offline data sources loaded once per component mount
- Authentication state cached during component lifecycle
- Minimal API calls through intelligent caching

### Browser Compatibility

- Uses modern fetch API
- Requires ES6+ for async/await support
- LocalStorage dependency for credential persistence

## Development Testing

### Mock Data Example

```json
{
  "data": [
    {
      "id": 2120,
      "name": "telco_data",
      "createdOn": "2025-10-24T00:00:00.000Z",
      "isActive": 1,
      "type": "CDPOfflineDataSource"
    },
    {
      "id": 2119,
      "name": "Telco Data",
      "createdOn": "2025-10-23T00:00:00.000Z",
      "isActive": 1,
      "type": "CDPOfflineDataSource"
    }
  ]
}
```

### Test Credentials

- Development environment specific
- Provided by Core API team
- Client credentials hardcoded in backend configuration

This documentation enables complete integration of the Core API authentication and offline data source functionality within the CDP Console application.
