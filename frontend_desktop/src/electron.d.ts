type Credentials = {
  email: string;
  password: string;
};

type AuthResult = {
  access_token?: string;
  role?: "user" | "admin";
  id?: number;
  email?: string;
};

interface Window {
  girlgroup2?: {
    register: (credentials: Credentials) => Promise<AuthResult>;
    login: (credentials: Credentials) => Promise<AuthResult>;
    getApiUrl: () => Promise<string>;
  };
}
