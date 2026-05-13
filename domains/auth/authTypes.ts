// domains/auth/authTypes.ts
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  phoneNumber: string
  idNumber: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken?: string
}

export interface TokenPayload {
  userId: string
  email: string
  iat: number
  exp: number
}