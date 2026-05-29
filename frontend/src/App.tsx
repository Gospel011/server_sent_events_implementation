import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, JSX } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "./api/apiClient";
import { useAuth } from "./context/AuthContext";
import { login, logout, signup } from "./services/authService";
import type { LoginPayload, SignupPayload } from "./services/authService";
import { createBid } from "./services/bidService";

const PRODUCT = {
  image:
    "https://picsum.photos/seed/obsidian-bloom-128/1200/1200",
  title: "Obsidian Bloom #128",
  description:
    "A one-of-one cinematic digital collectible from the Nocturne Relics auction series. Crafted with a high-contrast neon palette, layered 3D textures, and archival metadata.",
  creator: "Nocturne Studio",
  collection: "Nocturne Relics",
};

interface ApiErrorResponse {
  message?: string;
}

type ActivityType = "bid" | "join" | "system";

interface BidActivity {
  id: string;
  type: ActivityType;
  actor: string;
  message: string;
  bidAmount?: string;
  timestamp: number;
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

function buildAvatarUrl(seed: string) {
  return `https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

function parseSSEMessage(rawData: string) {
  try {
    const parsed = JSON.parse(rawData);
    if (typeof parsed === "string") return parsed;
    return JSON.stringify(parsed);
  } catch {
    return rawData;
  }
}

function parseActivityFromEvent(eventName: string, rawData: string): BidActivity {
  const message = parseSSEMessage(rawData);
  const bidMatch = message.match(/^(.*)\s+bid\s+(.+)$/i);
  if (bidMatch) {
    return {
      id: crypto.randomUUID(),
      type: "bid",
      actor: bidMatch[1].trim(),
      bidAmount: bidMatch[2].trim(),
      message,
      timestamp: Date.now(),
    };
  }

  const joinMatch = message.match(/^(.*)\s+joined$/i);
  if (joinMatch || eventName === "new-user") {
    return {
      id: crypto.randomUUID(),
      type: "join",
      actor: (joinMatch?.[1] ?? "A bidder").trim(),
      message,
      timestamp: Date.now(),
    };
  }

  return {
    id: crypto.randomUUID(),
    type: "system",
    actor: "Auction bot",
    message,
    timestamp: Date.now(),
  };
}

function getNumericBidValue(rawBid: string | undefined) {
  if (!rawBid) return null;
  const cleaned = rawBid.replace(/,/g, "").match(/\d+(\.\d+)?/g)?.[0];
  if (!cleaned) return null;

  const value = Number(cleaned);
  if (Number.isNaN(value)) return null;

  return value;
}

function formatActivityTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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
    <header className="top-nav-wrap">
      <nav className="top-nav">
        <div className="brand">Live Auction</div>
        <div className="search-shell">
          <input
            type="text"
            placeholder="Search items, collections, and accounts"
            aria-label="Search"
          />
        </div>

        <div className="nav-right">
          <a href="#">Explore</a>
          <a href="#">Activity</a>
          {isAuthenticated && user ? (
            <>
              <button
                type="button"
                className="ghost-button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </button>
              <div className="nav-profile">
                <img src={buildAvatarUrl(user.fullName)} alt={user.fullName} />
                <span>{user.fullName}</span>
              </div>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Signup</Link>
            </>
          )}
        </div>
      </nav>
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
  const { user } = useAuth();
  const [bidValue, setBidValue] = useState("");
  const [bidNotice, setBidNotice] = useState("");
  const [streamStatus, setStreamStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [activities, setActivities] = useState<BidActivity[]>([]);

  const bidMutation = useMutation({
    mutationFn: createBid,
    onSuccess: (data) => {
      setBidNotice(data.message || "Bid placed successfully.");
      setBidValue("");
    },
  });

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/events`, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      setStreamStatus("connected");
    };

    const activityListener = (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      const activity = parseActivityFromEvent(messageEvent.type, messageEvent.data);

      setActivities((previousActivities) => [
        activity,
        ...previousActivities.slice(0, 59),
      ]);
    };

    eventSource.addEventListener("new-bid", activityListener);
    eventSource.addEventListener("new-user", activityListener);

    eventSource.onerror = () => {
      setStreamStatus("disconnected");
    };

    return () => {
      eventSource.removeEventListener("new-bid", activityListener);
      eventSource.removeEventListener("new-user", activityListener);
      eventSource.close();
    };
  }, []);

  const bidError = bidMutation.isError
    ? getErrorMessage(bidMutation.error, "Could not place bid")
    : "";

  const bidEvents = useMemo(
    () => activities.filter((activity) => activity.type === "bid"),
    [activities],
  );

  const topBid = useMemo(() => {
    if (bidEvents.length === 0) return null;

    return bidEvents.reduce((highest, current) => {
      const highestValue = getNumericBidValue(highest.bidAmount) ?? -Infinity;
      const currentValue = getNumericBidValue(current.bidAmount) ?? -Infinity;
      return currentValue > highestValue ? current : highest;
    });
  }, [bidEvents]);

  const activeBidders = useMemo(() => {
    return new Set(
      activities
        .map((activity) => activity.actor)
        .filter((actor) => actor.trim().length > 0),
    ).size;
  }, [activities]);

  function handleBidSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBidNotice("");

    const normalizedBid = bidValue.trim();
    if (!normalizedBid) return;

    bidMutation.mutate({ bid: normalizedBid });
  }

  return (
    <section className="dashboard-shell">
      <article className="auction-stage">
        <div className="media-column">
          <img src={PRODUCT.image} alt={PRODUCT.title} className="product-image" />
          <div className="floating-note">
            <p>Top bid</p>
            <strong>{topBid ? topBid.bidAmount : "No bid yet"}</strong>
            <span>{topBid ? `by ${topBid.actor}` : "Place the first bid"}</span>
          </div>
        </div>

        <div className="detail-column">
          <div className="collection-row">
            <span className="pill">{PRODUCT.collection}</span>
            <span className={`status-chip ${streamStatus}`}>{streamStatus}</span>
          </div>

          <h1>{PRODUCT.title}</h1>
          <p className="subtitle product-copy">{PRODUCT.description}</p>

          <div className="meta-grid">
            <div>
              <p className="meta-label">Creator</p>
              <div className="meta-user">
                <img src={buildAvatarUrl(PRODUCT.creator)} alt={PRODUCT.creator} />
                <span>{PRODUCT.creator}</span>
              </div>
            </div>
            <div>
              <p className="meta-label">Current bidder</p>
              <div className="meta-user">
                <img
                  src={buildAvatarUrl(topBid?.actor ?? user?.fullName ?? "Guest")}
                  alt={topBid?.actor ?? user?.fullName ?? "Guest"}
                />
                <span>{topBid?.actor ?? "Waiting for bids"}</span>
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <p>Top bid</p>
              <strong>{topBid?.bidAmount ?? "-"}</strong>
            </div>
            <div className="stat-card">
              <p>Total bids</p>
              <strong>{bidEvents.length}</strong>
            </div>
            <div className="stat-card">
              <p>Active bidders</p>
              <strong>{activeBidders}</strong>
            </div>
          </div>

          <form onSubmit={handleBidSubmit} className="bid-form">
            <label htmlFor="bidAmount">Place your bid</label>
            <div className="bid-row">
              <input
                id="bidAmount"
                type="text"
                value={bidValue}
                onChange={(event) => setBidValue(event.target.value)}
                placeholder="e.g. 2.75 ETH"
                required
              />
              <button type="submit" disabled={bidMutation.isPending}>
                {bidMutation.isPending ? "Placing..." : "Place Bid"}
              </button>
            </div>
          </form>

          {bidError && <p className="feedback error">{bidError}</p>}
          {bidNotice && <p className="feedback success">{bidNotice}</p>}
        </div>
      </article>

      <section className="activity-panel">
        <div className="activity-head">
          <h2>Live Bidding Activity</h2>
          <span>{activities.length} events</span>
        </div>
        {activities.length === 0 ? (
          <p className="empty-activity">No activity yet. Connect another bidder to see events.</p>
        ) : (
          <ul className="activity-list">
            {activities.map((activity) => (
              <li key={activity.id} className={`activity-item ${activity.type}`}>
                <img src={buildAvatarUrl(activity.actor)} alt={activity.actor} />
                <div className="activity-body">
                  <p>
                    <strong>{activity.actor}</strong>{" "}
                    {activity.type === "bid"
                      ? `placed a bid ${activity.bidAmount ?? ""}`
                      : activity.type === "join"
                        ? "joined the auction"
                        : activity.message}
                  </p>
                  <span>{formatActivityTime(activity.timestamp)}</span>
                </div>
                {activity.type === "bid" && activity.bidAmount ? (
                  <em>{activity.bidAmount}</em>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
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
