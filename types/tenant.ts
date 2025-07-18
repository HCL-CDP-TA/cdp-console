export interface Tenant {
  id: string
  name: string
  apiKey: string
  clientId: string
  apiEndpoint: string
  createdAt: string
  updatedAt: string
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
