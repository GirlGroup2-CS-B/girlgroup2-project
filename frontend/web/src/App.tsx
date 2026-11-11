import { FormEvent, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import CampusApp from "./pages/CampusApp";
import type { AccountRole } from "./authTypes";
import { API_URL } from "./apiConfig";

type AuthResponse = {
  access_token?: string;
  role?: string;
  detail?: string | { msg: string }[];
  error?: string | { msg: string }[];
  message?: string;
};

function normalizeErrorValue(
  value: AuthResponse["detail"] | AuthResponse["error"] | undefined,
): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((error) =>
        typeof error === "string" ? error : error && typeof error.msg === "string" ? error.msg : "",
      )
      .filter(Boolean);

    return messages.length > 0 ? messages.join(". ") : null;
  }

  return null;
}

function getErrorMessage(
  detail: AuthResponse["detail"],
  error: AuthResponse["error"],
  status: number,
): string {
  const normalized =
    normalizeErrorValue(detail) ?? normalizeErrorValue(error) ??
    `The request failed (${status}). Please try again.`;

  return normalized;
}

export default function App() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [session, setSession] = useState<{
    email: string;
    token: string;
    role: AccountRole;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsError(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/${isRegistering ? "register" : "login"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            ...(isRegistering && {
              full_name: fullName.trim(),
              student_id: studentId.trim(),
            }),
          }),
        },
      );

      const result = (await response.json().catch(() => ({}))) as AuthResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result.detail, result.error, response.status),
        );
      }

      if (isRegistering) {
        setMessage("Account created successfully. You can now sign in.");
        setIsRegistering(false);
        setPassword("");
        setShowPassword(false);
      } else {
        if (!result.access_token) {
          throw new Error(
            "The login response did not include an access token.",
          );
        }
        const sessionRole = result.role === "admin"
          ? "admin"
          : result.role === "student"
            || result.role === "reviewer"
            || result.role === "user"
            ? "user"
            : null;
        if (!sessionRole) {
          throw new Error(
            "The login response did not include a valid account role.",
          );
        }

        setSession({
          email: email.trim().toLowerCase(),
          token: result.access_token,
          role: sessionRole,
        });

        setMessage("You are signed in.");
      }
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to reach the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setIsRegistering((current) => !current);
    setPassword("");
    setFullName("");
    setStudentId("");
    setShowPassword(false);
    setMessage("");
    setIsError(false);
  }

  if (session) {
    if (session.role === "admin") {
      return (
        <AdminDashboard
          email={session.email}
          token={session.token}
          onExit={() => {
            setSession(null);
            setPassword("");
            setMessage("");
            setIsError(false);
          }}
        />
      );
    }

    return (
      <CampusApp
        email={session.email}
        token={session.token}
        role={session.role}
        onSignOut={() => {
          setSession(null);
          setPassword("");
          setMessage("");
          setIsError(false);
        }}
      />
    );
  }

  return (
    <main className="campus-page">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="CampusFind home">
          <span className="brand-icon" aria-hidden="true">
            CF
          </span>
          <span className="brand-name">
            Campus<span>Find</span>
          </span>
        </a>

        <span className="campus-label">JRMSU Main Campus</span>
      </header>

      <div className="auth-layout">
        <section className="welcome-panel">
          <div className="welcome-content">
            <span className="welcome-badge">
              YOUR CAMPUS, CONNECTED
            </span>

            <h1>
              Lost something?
              <br />
              <span>Let's find it.</span>
            </h1>

            <p className="welcome-description">
              CampusFind helps the campus community report, discover, and
              reconnect with lost belongings.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon" aria-hidden="true">
                  ⌕
                </span>
                <div>
                  <strong>Find reported items</strong>
                  <p>Explore items reported by the campus community.</p>
                </div>
              </div>

              <div className="feature-item">
                <span className="feature-icon" aria-hidden="true">
                  ✓
                </span>
                <div>
                  <strong>Report lost or found items</strong>
                  <p>Help others reconnect with their belongings.</p>
                </div>
              </div>

              <div className="feature-item">
                <span className="feature-icon" aria-hidden="true">
                  ↗
                </span>
                <div>
                  <strong>Stay updated</strong>
                  <p>Keep track of your reports and possible matches.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="welcome-decoration" aria-hidden="true">
            <span className="decoration-circle circle-one" />
            <span className="decoration-circle circle-two" />
            <span className="decoration-circle circle-three" />
          </div>

          <div className="panel-footer">
            <span className="gold-dot" />
            A little help goes a long way.
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <div className="mobile-brand-mark" aria-hidden="true">
              CF
            </div>

            <p className="section-label">
              {isRegistering ? "JOIN THE COMMUNITY" : "WELCOME TO CAMPUSFIND"}
            </p>

            <h2>
              {isRegistering ? "Create your account" : "Welcome back!"}
            </h2>

            <p className="auth-description">
              {isRegistering
                ? "Create an account to get started."
                : "Sign in with your registered account. Admin accounts open the admin console."}
            </p>

            <form onSubmit={submit}>
              {isRegistering && (
                <>
                  <div className="form-field">
                    <label htmlFor="fullName">Full name</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      maxLength={100}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Juan Dela Cruz"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="studentId">Student ID</label>
                    <input
                      id="studentId"
                      name="studentId"
                      type="text"
                      maxLength={20}
                      value={studentId}
                      onChange={(event) => setStudentId(event.target.value)}
                      placeholder="2024-0001"
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>

                <div className="password-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isRegistering ? "new-password" : "current-password"
                    }
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      isRegistering
                        ? "At least 8 characters"
                        : "Enter your password"
                    }
                    required
                  />

                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {message && (
                <p
                  className={`message ${isError ? "error" : "success"}`}
                  role="status"
                >
                  {message}
                </p>
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Please wait..."
                  : isRegistering
                    ? "Create Account"
                    : "Sign In"}
                {!isSubmitting && <span aria-hidden="true"> →</span>}
              </button>
            </form>

            <div className="auth-switch">
              <span>
                {isRegistering
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </span>
              <button type="button" onClick={switchMode}>
                {isRegistering ? "Sign In" : "Create Account"}
              </button>
            </div>

            <div className="security-note">
              <span aria-hidden="true">●</span>
              CampusFind account access
            </div>
          </div>
        </section>
      </div>

      <footer className="page-footer">
        <span>CampusFind</span>
        <span>Lost and found, made easier.</span>
        <span>JRMSU Main Campus</span>
      </footer>

    </main>
  );
}
