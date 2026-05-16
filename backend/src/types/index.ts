// Auth related types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user?: {
    id: string;
    email: string;
  };
  session?: {
    access_token: string;
  };
  error?: string;
}

// Add more types as needed
