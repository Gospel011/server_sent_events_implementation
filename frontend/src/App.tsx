import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useState } from "react";
import type { FormEvent, JSX } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { login, logout, signup } from "./services/authService";
import type { LoginPayload, SignupPayload } from "./services/authService";

interface ApiErrorResponse {
  message?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return (error.response?.data as ApiErrorResponse | undefined)?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function NavBar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuth();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      navigate("/login", { replace: true });
    },
  });

  return (
    <header className="top-nav">
      <div className="brand">Live Auction</div>
      <div className="nav-right">
        {isAuthenticated && user ? (
          <>
            <span className="user-pill">{user.fullName}</span>
            <button
              type="button"
              className="logout-button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        )}
      </div>
    </header>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const [form, setForm] = useState<LoginPayload>({ email: "", password: "" });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (data.data?.user) {
        setAuthenticatedUser(data.data.user);
      }
      navigate("/", { replace: true });
    },
  });

  const errorMessage = loginMutation.isError
    ? getErrorMessage(loginMutation.error, "Login failed")
    : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate(form);
  }

  return (
    <section className="auth-card">
      <h1>Welcome back</h1>
      <p className="subtitle">Sign in to continue to Live Auction.</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="loginEmail">Email</label>
        <input
          id="loginEmail"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, email: event.target.value }))
          }
          placeholder="you@example.com"
          required
        />

        <label htmlFor="loginPassword">Password</label>
        <input
          id="loginPassword"
          type="password"
          value={form.password}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, password: event.target.value }))
          }
          required
        />

        <button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {errorMessage && <p className="feedback error">{errorMessage}</p>}
      <p className="auth-link-line">
        No account yet? <Link to="/signup">Create one</Link>
      </p>
    </section>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<SignupPayload>({
    fullName: "",
    email: "",
    password: "",
  });

  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      setNotice(data.message || "Signup successful.");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 700);
    },
  });

  const errorMessage = signupMutation.isError
    ? getErrorMessage(signupMutation.error, "Signup failed")
    : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    signupMutation.mutate(form);
  }

  return (
    <section className="auth-card">
      <h1>Create account</h1>
      <p className="subtitle">Join Live Auction in a few seconds.</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          type="text"
          value={form.fullName}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, fullName: event.target.value }))
          }
          placeholder="Ada Lovelace"
          required
        />

        <label htmlFor="signupEmail">Email</label>
        <input
          id="signupEmail"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, email: event.target.value }))
          }
          placeholder="you@example.com"
          required
        />

        <label htmlFor="signupPassword">Password</label>
        <input
          id="signupPassword"
          type="password"
          value={form.password}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, password: event.target.value }))
          }
          minLength={6}
          required
        />

        <button type="submit" disabled={signupMutation.isPending}>
          {signupMutation.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>
      {errorMessage && <p className="feedback error">{errorMessage}</p>}
      {notice && <p className="feedback success">{notice}</p>}
      <p className="auth-link-line">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}

function HomePage() {
  return (
    <section className="home-card">
      <h1>Live Auction</h1>
      <p>Welcome to your auction dashboard.</p>
    </section>
  );
}

export default function App() {
  return (
    <main className="app-shell">
      <NavBar />
      <div className="page-content">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </main>
  );
}
