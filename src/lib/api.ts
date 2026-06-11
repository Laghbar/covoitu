import { Platform } from 'react-native';

export const API_BASE = Platform.select({
  android: 'http://10.0.2.2:3001',
  default: 'http://localhost:3001',
});

export type Role = 'passenger' | 'driver';

export type AuthResponse = {
  token: string;
  user: { id: number; name: string; email: string; role: Role };
};

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed.');
  return json as T;
}

export const api = {
  register: (name: string, email: string, password: string, role: Role) =>
    post<AuthResponse>('/auth/register', { name, email, password, role }),

  login: (email: string, password: string) =>
    post<AuthResponse>('/auth/login', { email, password }),
};
