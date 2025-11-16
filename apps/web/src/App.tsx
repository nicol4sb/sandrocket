import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AuthSuccessResponse,
  ErrorResponse,
  LoginRequest,
  RegisterRequest
} from '@sandrocket/contracts';
import './styles.css';

type Mode = 'login' | 'register';

const DEFAULT_BASE_URL = '/api';

function App() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [result, setResult] = useState<AuthSuccessResponse | null>(null);

  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL,
    []
  );

  const refreshIntervalRef = useRef<number | null>(null);
  const isRefreshSetupRef = useRef<string | null>(null);

  // Set up periodic token refresh
  useEffect(() => {
    // Refresh token function - doesn't update result to avoid triggering effect
    const refreshToken = async () => {
      try {
        const response = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });

        if (!response.ok) {
          // Token is invalid/expired, clear result to show login form
          if (response.status === 401) {
            setResult(null);
            setError('Session expired. Please log in again.');
            // Clear the setup flag so we can re-setup if user logs in again
            isRefreshSetupRef.current = null;
            if (refreshIntervalRef.current !== null) {
              clearInterval(refreshIntervalRef.current);
              refreshIntervalRef.current = null;
            }
          }
          return;
        }

        const data = await response.json() as AuthSuccessResponse;
        // Update result with new token, but use functional update to avoid
        // triggering this effect again (since we only depend on user.id)
        setResult((prev) => {
          if (prev && prev.user.id === data.user.id) {
            // Same user, just update token
            return { ...prev, token: data.token };
          }
          // New user or first time, return full data
          return data;
        });
        setError(null);
      } catch (err) {
        console.error('Token refresh error:', err);
        // Don't show error to user for background refresh failures
        // Only clear result if we're sure the session is invalid
      }
    };

    // Only set up refresh if user is authenticated and we haven't set it up for this user yet
    if (result) {
      const userId = result.user.id;
      
      // Only set up interval once per user
      if (isRefreshSetupRef.current !== userId) {
        // Clear any existing interval first
        if (refreshIntervalRef.current !== null) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }

        // Mark as set up for this user
        isRefreshSetupRef.current = userId;

        // Refresh immediately on mount/authentication
        refreshToken();

        // Then refresh every 10 seconds (for testing)
        refreshIntervalRef.current = window.setInterval(() => {
          refreshToken();
        }, 10 * 1000); // 10 seconds

        return () => {
          if (refreshIntervalRef.current !== null) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
          }
          isRefreshSetupRef.current = null;
        };
      }
    } else {
      // User logged out, clear setup
      if (refreshIntervalRef.current !== null) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      isRefreshSetupRef.current = null;
    }

    // Return undefined cleanup function if not authenticated
    return undefined;
  }, [result?.user.id, baseUrl]);

  const validateEmail = (emailValue: string): string | null => {
    if (!emailValue.trim()) {
      return 'Email is required';
    }
    // Use the same email validation pattern as Zod
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    // Clear email error when user starts typing
    if (emailError) {
      setEmailError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Frontend validation
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }
    
    setLoading(true);
    setError(null);
    setEmailError(null);

    try {
      const endpoint =
        mode === 'login' ? `${baseUrl}/auth/login` : `${baseUrl}/auth/register`;

      const payload: LoginRequest | RegisterRequest =
        mode === 'login'
          ? { email, password }
          : {
              email,
              password,
              displayName: displayName.trim()
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        // If response is not JSON, use status text
        data = null;
      }

      if (!response.ok) {
        const errorData = data as ErrorResponse | null;
        const errorMessage = errorData?.message ?? `Request failed with status ${response.status}`;
        
        setError(errorMessage);
        setResult(null);
        setLoading(false);
        return;
      }

      setResult(data as AuthSuccessResponse);
      setError(null);
    } catch (err) {
      console.error('Request error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unexpected error occurred. Please try again.');
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError(null);
    setEmailError(null);
    setResult(null);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear state regardless of API call success
      setResult(null);
      setError(null);
      setEmail('');
      setPassword('');
      setDisplayName('');
    }
  };

  return (
    <main>
      <section className="auth-card">
        <header>
          <h1>Sand Rocket</h1>
          <p>{mode === 'login' ? 'Welcome back' : 'Create an account'}</p>
        </header>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={handleEmailChange}
              onBlur={() => {
                const validationError = validateEmail(email);
                setEmailError(validationError);
              }}
            />
            {emailError ? <span className="field-error">{emailError}</span> : null}
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPassword(event.target.value)
              }
            />
          </label>

          {mode === 'register' ? (
            <label>
              <span>Display name</span>
              <input
                type="text"
                placeholder="Your name"
                required
                value={displayName}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDisplayName(event.target.value)
                }
              />
            </label>
          ) : null}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Working...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <footer>
          <button type="button" className="link" onClick={toggleMode}>
            {mode === 'login'
              ? "Need an account? Let's register"
              : 'Already registered? Sign in'}
          </button>
        </footer>

        {error ? <p className="error">{error}</p> : null}

        {result ? (
          <section className="success">
            <h2>Authenticated!</h2>
            <dl>
              <div>
                <dt>User ID</dt>
                <dd>{result.user.id}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{result.user.email}</dd>
              </div>
              <div>
                <dt>Display name</dt>
                <dd>{result.user.displayName}</dd>
              </div>
            </dl>
            <button type="button" onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
}

export default App;

