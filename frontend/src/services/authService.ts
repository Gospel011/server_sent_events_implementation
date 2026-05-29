import apiClient from "../api/apiClient";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
}

interface AuthApiResponse {
  status: "success" | "fail";
  message: string;
  data?: {
    user: AuthUser;
  };
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function signup(payload: SignupPayload) {
  const response = await apiClient.post<AuthApiResponse>("/auth/signup", payload);
  return response.data;
}

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<AuthApiResponse>("/auth/login", payload);
  return response.data;
}

export async function logout() {
  const response = await apiClient.post<AuthApiResponse>("/auth/logout");
  return response.data;
}
