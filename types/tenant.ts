export interface Tenant {
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

export interface TenantSettings {
  apiKey: string
  apiEndpoint: string
  selectedTenantId?: string
  favoriteTenants: string[]
}

export interface UserProperty {
  id: number
  tenantId: string
  userProperty: string
  dmpDataPointCode: string
  dataType: string
  preference: string
  priority: number
}

export interface DataMapping {
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

export type DataSource = "analyze_post" | "dataingestionpi"

export interface OfflineDataSource {
  id: number
  name: string
  createdOn: string
  isActive: number
  type: string
}

export interface ChannelPriority {
  KeyName: string
  Priority: number
}

export interface User {
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

export interface Client {
  Name: string
  id: number
  Status: string
  DisplayName: string
  PassowrdexpiresInDays: number | null
}
