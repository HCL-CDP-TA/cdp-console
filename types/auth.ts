export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  message: string
  token: string
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

export interface AuthState {
  isAuthenticated: boolean
  token: string | null
  coreToken: string | null
  username: string | null
}
