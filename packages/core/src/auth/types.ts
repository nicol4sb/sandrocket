export interface User {
  id: number;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
}

export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  userId: number;
  email: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

