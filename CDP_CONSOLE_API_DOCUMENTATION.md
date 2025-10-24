# CDP Console API Documentation

This document provides comprehensive API documentation for the CDP Console project, enabling SDK development to replicate the same functionality without access to the source code.

## Overview

The CDP Console is a Customer Data Platform console that provides APIs for managing clients, users, tenant configurations, user properties, data mappings, and channel priorities. The system acts as a proxy/middleware layer between the frontend and three backend services:

1. **Admin API** - Manages authentication, clients, and users
2. **SST API** - Manages tenant-specific data (user properties, mappings)
3. **Core API** - Manages offline data sources and provides OAuth2 authentication

## Base Configuration

### Environment Variables Required

- `ADMIN_API_URL` - Base URL for the Admin API backend service
- `CORE_API_URL` - Base URL for the Core API backend service

### Authentication Methods

The API uses three different authentication methods depending on the endpoint:

1. **Bearer Token Authentication** (Admin API endpoints)

   - Header: `Authorization: Bearer <token>`
   - Token obtained from login endpoint

2. **API Key Authentication** (SST API endpoints)

   - Headers: `x-api-key: <api_key>` and `x-api-endpoint: <api_endpoint>`
   - These are tenant-specific credentials

3. **OAuth2 Bearer Token Authentication** (Core API endpoints)
   - Header: `Authorization: Bearer <core_api_token>`
   - Token obtained from Core API OAuth2 endpoint

## API Endpoints

### 1. Authentication

#### POST `/api/auth/login`

Authenticates a user and returns a JWT token.

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
  "message": "string",
  "token": "string"
}
```

**Response (Error - 400/401/500):**

```json
{
  "error": "string"
}
```

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/userLogin`
- Method: POST
- Headers: `Content-Type: application/json`

**Notes:**

- Password must be SHA-256 encoded on the client side before sending
- Returns JWT token for subsequent API calls

---

### 2. Client Management

#### GET `/api/clients`

Retrieves the list of all clients/campaigns.

**Authentication:** Bearer Token Required

**Response (Success - 200):**

```json
[
  {
    "Name": "string",
    "id": "number",
    "Status": "string",
    "DisplayName": "string",
    "PassowrdexpiresInDays": "number|null"
  }
]
```

**Response (Error - 401/500):**

```json
{
  "error": "string",
  "details": "string",
  "status": "number"
}
```

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/getClientList`
- Method: GET
- Headers: `Authorization: Bearer ${token}`, `Content-Type: application/json`

---

### 3. User Management

#### GET `/api/users/[clientId]`

Retrieves all users for a specific client/campaign.

**Authentication:** Bearer Token Required

**Path Parameters:**

- `clientId` (string) - The client/campaign ID

**Response (Success - 200):**

```json
[
  {
    "id": "number",
    "Email": "string",
    "Firstname": "string",
    "Lastname": "string",
    "isActive": "number",
    "CreatedOn": "string",
    "UpdatedOn": "string|null",
    "LastPasswordReset": "string",
    "lastLogin": "string"
  }
]
```

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/fetchUserList/${clientId}`

#### POST `/api/users/[clientId]/create`

Creates a new user for a specific client/campaign.

**Authentication:** Bearer Token Required

**Path Parameters:**

- `clientId` (string) - The client/campaign ID

**Request:**

```json
{
  "userName": "string",
  "recipientEmail": "string"
}
```

**Response (Success - 200):**

```json
{
  // Response structure from backend API
}
```

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/createUser`
- Method: POST
- Content-Type: `multipart/form-data`
- Form fields:
  - `campaignId`: clientId
  - `userName`: userName from request
  - `recipientEmail`: recipientEmail from request
  - `userEmail`: "cdp-admin@hcl.software" (hardcoded)
  - `config`: "undefined" (hardcoded)
  - `userLevel`: "0" (hardcoded)

#### POST `/api/users/[clientId]/reset-password`

Initiates a password reset for a user.

**Authentication:** Bearer Token Required

**Path Parameters:**

- `clientId` (string) - The client/campaign ID

**Request:**

```json
{
  "username": "string",
  "emailAddress": "string"
}
```

**Response (Success - 200):**

```json
{
  "message": "Password reset email sent successfully",
  "data": {} // Backend response
}
```

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/resetPassword/${username}/${emailAddress}/cdp-admin@hcl.software`
- Method: GET
- Note: Uses GET method despite being a POST endpoint

#### PUT `/api/users/[clientId]/update-status`

Updates the active status of a user.

**Authentication:** Bearer Token Required

**Path Parameters:**

- `clientId` (string) - The client/campaign ID

**Request:**

```json
{
  "username": "string",
  "isActive": "boolean"
}
```

**Response (Success - 200):**

```json
{
  "message": "User activated/deactivated successfully",
  "data": {} // Backend response
}
```

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/updateUserStatus/${isActive}/${username}`
- Method: GET
- Note: Uses GET method despite being a PUT endpoint

#### PUT `/api/users/[clientId]/update-profile`

Updates user profile information.

**Authentication:** Bearer Token Required

**Path Parameters:**

- `clientId` (string) - The client/campaign ID

**Request:**

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "affectedRows": "number",
    "changedRows": "number"
  }
}
```

**Response (Error - 400):**

```json
{
  "error": "Update validation failed",
  "details": "Expected 1 row to be changed, got ${changedRows}",
  "data": {}
}
```

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/updateUserName/${firstName}/${lastName}/${email}/cdp-admin@hcl.software`
- Method: GET
- Validation: Expects exactly 1 row to be affected and changed

---

### 4. User Properties Management

#### GET `/api/user-properties/[tenantId]`

Retrieves all user properties for a specific tenant.

**Authentication:** API Key Required

**Path Parameters:**

- `tenantId` (string) - The tenant ID

**Headers Required:**

- `x-api-key` (string) - API key for the tenant
- `x-api-endpoint` (string) - API endpoint URL for the tenant

**Response (Success - 200):**

```json
[
  {
    "id": "number",
    "tenantId": "string",
    "userProperty": "string",
    "dmpDataPointCode": "string",
    "dataType": "string",
    "preference": "string",
    "priority": "number"
  }
]
```

**Backend Mapping:**

- Proxies to: `${apiEndpoint}/api/userProperties/tenantId/${tenantId}`
- Method: GET
- Headers: `authkey: ${apiKey}`, `Content-Type: application/json`

#### POST `/api/user-properties/[tenantId]`

Creates a new user property for a specific tenant.

**Authentication:** API Key Required

**Path Parameters:**

- `tenantId` (string) - The tenant ID

**Headers Required:**

- `x-api-key` (string) - API key for the tenant
- `x-api-endpoint` (string) - API endpoint URL for the tenant

**Request:**

```json
{
  // User property object structure
}
```

**Backend Mapping:**

- Proxies to: `${apiEndpoint}/api/userProperties`
- Method: POST
- Headers: `authkey: ${apiKey}`, `Content-Type: application/json`

#### GET `/api/user-properties/[tenantId]/[userProperty]`

Retrieves a specific user property for a tenant.

**Authentication:** API Key Required

**Path Parameters:**

- `tenantId` (string) - The tenant ID
- `userProperty` (string) - The user property name

**Headers Required:**

- `x-api-key` (string) - API key for the tenant
- `x-api-endpoint` (string) - API endpoint URL for the tenant

---

### 5. Data Mappings Management

#### GET `/api/mappings/[tenantId]/[dataSource]`

Retrieves all data mappings for a specific tenant and data source.

**Authentication:** API Key Required

**Path Parameters:**

- `tenantId` (string) - The tenant ID
- `dataSource` (string) - Data source name (e.g., "analyze_post", "dataingestionpi")

**Headers Required:**

- `x-api-key` (string) - API key for the tenant
- `x-api-endpoint` (string) - API endpoint URL for the tenant

**Response (Success - 200):**

```json
[
  {
    "TenantId": "string",
    "UserProperty": "string",
    "ProfileUpdateFunction": "string",
    "IsMandatory": "boolean",
    "DataSourceName": "string",
    "Preference": "string",
    "Priority": "number",
    "IsProfileField": "boolean",
    "Metadata": "string",
    "DataType": "string"
  }
]
```

**Backend Mapping:**

- Proxies to: `${apiEndpoint}/api/mapping/tenant/VIZVRM${tenantId}/dataSource/${dataSource}`
- Method: GET
- Headers: `authkey: ${apiKey}`, `Content-Type: application/json`
- Note: Tenant ID is prefixed with "VIZVRM" in the backend call

#### POST `/api/mappings/[tenantId]/[dataSource]`

Creates a new data mapping for a specific tenant and data source.

**Authentication:** API Key Required

**Path Parameters:**

- `tenantId` (string) - The tenant ID
- `dataSource` (string) - Data source name

**Headers Required:**

- `x-api-key` (string) - API key for the tenant
- `x-api-endpoint` (string) - API endpoint URL for the tenant

**Request:**

```json
{
  // Mapping object structure - TenantId and DataSourceName will be automatically added
}
```

**Backend Mapping:**

- Proxies to: `${apiEndpoint}/api/mapping`
- Method: POST
- Headers: `authkey: ${apiKey}`, `Content-Type: application/json`
- Request body is automatically enhanced with:
  - `TenantId`: tenantId from path
  - `DataSourceName`: dataSource from path

#### GET `/api/mappings/[tenantId]/[dataSource]/[userProperty]`

Retrieves a specific mapping for a tenant, data source, and user property.

**Authentication:** API Key Required

**Path Parameters:**

- `tenantId` (string) - The tenant ID
- `dataSource` (string) - Data source name
- `userProperty` (string) - User property name

#### DELETE `/api/mappings/[tenantId]/[dataSource]/[userProperty]/delete`

Deletes a specific data mapping.

**Authentication:** API Key Required

**Path Parameters:**

- `tenantId` (string) - The tenant ID
- `dataSource` (string) - Data source name
- `userProperty` (string) - User property name

**Headers Required:**

- `x-api-key` (string) - API key for the tenant
- `x-api-endpoint` (string) - API endpoint URL for the tenant

**Response (Success - 200):**

```json
{
  "success": true
}
```

**Backend Mapping:**

- Proxies to: `${apiEndpoint}/api/mapping/tenantId/${tenantId}/dataSource/${dataSource}/userProperty/${userProperty}`
- Method: DELETE
- Headers: `authkey: ${apiKey}`, `Content-Type: application/json`

---

### 6. Channel Priority Management

#### GET `/api/channel-priority/[tenantId]`

Retrieves channel priority configuration for a specific tenant.

**Authentication:** Bearer Token Required

**Path Parameters:**

- `tenantId` (string) - The tenant ID

**Response (Success - 200):**

```json
[
  {
    "KeyName": "string",
    "Priority": "number"
  }
]
```

**Response (Error - 401 with redirect):**

```json
{
  "error": "Authentication failed",
  "shouldRedirect": true
}
```

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/getChannelPriority/${tenantId}`
- Method: GET
- Headers: `Authorization: Bearer ${token}`, `Content-Type: application/json`

---

### 7. Core API - Offline Data Sources

#### POST `/api/core-auth/token`

Authenticates a user with the Core API using OAuth2 password grant flow.

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

**Backend Mapping:**

- Proxies to: `${CORE_API_URL}/oauth2/token`
- Method: POST
- Content-Type: `application/x-www-form-urlencoded`
- Form data: username, password (SHA-256), grant_type: "password", client_id: "client_id", client_secret: "client_secret"

**Notes:**

- Password must be SHA-256 encoded on the client side
- Client credentials are hardcoded in the backend
- Returns OAuth2 access token for Core API requests

#### GET `/api/offline-data-sources/[clientId]`

Retrieves all active offline data sources for a specific client.

**Authentication:** Core API Bearer Token Required

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

**Response (Error - 401 with re-auth):**

```json
{
  "error": "Authentication failed",
  "shouldReauth": true
}
```

**Backend Mapping:**

- Proxies to: `${CORE_API_URL}/-/v1/advertisers/${clientId}/cdpOfflineDataSource`
- Method: GET
- Headers: `Authorization: Bearer ${token}`, `Content-Type: application/json`

**Notes:**

- Only returns data sources where `isActive === 1`
- The `name` field is used for identification (not `id`)
- Special `shouldReauth` flag for 401 responses
  "error": "Authentication failed",
  "shouldRedirect": true
  }

````

**Backend Mapping:**

- Proxies to: `${ADMIN_API_URL}/api/getChannelPriority/${tenantId}`
- Method: GET
- Headers: `Authorization: Bearer ${token}`, `Content-Type: application/json`

---

## Data Types and Structures

### User Object

```typescript
interface User {
  id: number
  Email: string
  Firstname: string
  Lastname: string
  isActive: number
  CreatedOn: string
  UpdatedOn: string | null
  LastPasswordReset: string
  lastLogin: string
}
````

### Client Object

```typescript
interface Client {
  Name: string
  id: number
  Status: string
  DisplayName: string
  PassowrdexpiresInDays: number | null
}
```

### User Property Object

```typescript
interface UserProperty {
  id: number
  tenantId: string
  userProperty: string
  dmpDataPointCode: string
  dataType: string
  preference: string
  priority: number
}
```

### Data Mapping Object

```typescript
interface DataMapping {
  TenantId: string
  UserProperty: string
  ProfileUpdateFunction: string
  IsMandatory: boolean
  DataSourceName: string
  Preference: string
  Priority: number
  IsProfileField: boolean
  Metadata: string
  DataType: string
}
```

### Channel Priority Object

```typescript
interface ChannelPriority {
  KeyName: string
  Priority: number
}
```

### Core API Token Response Object

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

### Offline Data Source Object

```typescript
interface OfflineDataSource {
  id: number
  name: string
  createdOn: string
  isActive: number
  type: string
}
```

### Enhanced Tenant Object

```typescript
interface Tenant {
  id: string
  name: string
  displayName: string
  clientId: string
  apiKey: string
  apiEndpoint: string
  isFavorite?: boolean
  createdAt: string
  updatedAt: string
  // Core API credentials for offline data sources
  coreApiUsername?: string
  coreApiPassword?: string // SHA-256 encoded password
}
```

## Error Handling

### Common Error Response Format

```json
{
  "error": "string",
  "details": "string",
  "status": "number"
}
```

### HTTP Status Codes Used

- `200` - Success
- `400` - Bad Request (missing required fields, validation errors)
- `401` - Unauthorized (missing/invalid auth, expired token)
- `500` - Internal Server Error (backend API failures, configuration issues)

### Special Error Responses

#### Authentication Redirect Required

```json
{
  "error": "Authentication failed",
  "shouldRedirect": true
}
```

#### Validation Failure (User Profile Update)

```json
{
  "error": "Update validation failed",
  "details": "Expected 1 row to be changed, got ${changedRows}",
  "data": {}
}
```

## Implementation Notes

### Password Handling

- Passwords must be SHA-256 encoded on the client side before sending to `/api/auth/login`
- The API expects the password to already be hashed

### Tenant ID Formatting

- For mappings API calls, tenant IDs are automatically prefixed with "VIZVRM" when calling the backend
- Frontend should pass the raw tenant ID without the prefix

### Form Data vs JSON

- User creation endpoint uses `multipart/form-data` format
- All other endpoints use JSON format

### Authentication Context

- Admin API endpoints use JWT Bearer tokens
- SST API endpoints use API key authentication with tenant-specific credentials
- Some endpoints use GET method despite being destructive operations (password reset, user updates)

### URL Encoding

- Username and email parameters in path are URL-encoded automatically
- Special characters in usernames/emails are handled safely

## SDK Implementation Guidelines

### Core Classes Needed

1. **CDPClient** - Main client class
2. **AuthService** - Handle authentication and token management
3. **ClientService** - Client/campaign management
4. **UserService** - User management operations
5. **TenantService** - Tenant-specific operations (user properties, mappings)
6. **ChannelService** - Channel priority management
7. **CoreApiService** - Core API authentication and offline data source management

### Configuration Required

```typescript
interface CDPConfig {
  baseUrl: string // CDP Console API base URL
  adminApiUrl?: string // Optional: for direct backend calls
  coreApiUrl?: string // Optional: for direct Core API calls
}

interface CoreApiCredentials {
  username: string
  password: string // SHA-256 encoded password
}
```

interface TenantConfig {
apiKey: string // Tenant-specific API key
apiEndpoint: string // Tenant-specific API endpoint
}

```

### Authentication Flow

#### Standard Admin/SST Authentication
1. Call `/api/auth/login` with SHA-256 encoded password
2. Store returned JWT token
3. Include token in `Authorization: Bearer ${token}` header for admin operations
4. Use tenant-specific API key/endpoint for tenant operations

#### Core API Authentication
1. Prompt user for Core API credentials (username/password)
2. SHA-256 encode password on client side
3. Call `/api/core-auth/token` with encoded credentials
4. Store returned OAuth2 access token (in memory, not localStorage)
5. Include token in `Authorization: Bearer ${coreApiToken}` header for Core API operations
6. Handle 401 errors with automatic re-authentication (single retry)
7. Gracefully fallback if re-authentication fails

### Error Handling Strategy

- Check for `shouldRedirect: true` in 401 responses to handle session expiration
- Check for `shouldReauth: true` in Core API 401 responses for token refresh
- Validate affectedRows/changedRows for update operations
- Handle both JSON and text error responses from backend APIs
- Implement single retry logic for Core API authentication failures

### Core API Specific Considerations

- **Token Management**: Core API tokens stored in memory only (not localStorage)
- **Credential Storage**: Username and SHA-256 password stored per tenant in localStorage
- **Retry Logic**: Single automatic retry on 401, then graceful fallback
- **URL Encoding**: Data source names automatically URL-encoded in API calls
- **Active Filtering**: Only display data sources where `isActive === 1`

This documentation provides complete coverage of the CDP Console API functionality, including the new Core API integration for offline data sources, enabling full replication through an SDK without requiring access to the source code.
```
