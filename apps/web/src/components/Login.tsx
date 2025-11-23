import React, { ChangeEvent, FormEvent, useState } from 'react';
import { AuthSuccessResponse, ErrorResponse, LoginRequest, RegisterRequest } from '@sandrocket/contracts';

type Mode = 'login' | 'register';

export function Login(props: { baseUrl: string; onSuccess: (res: AuthSuccessResponse) => void; invitationToken?: string | null }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (emailValue: string): string | null => {
    if (!emailValue.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue) ? null : 'Please enter a valid email address';
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }
    setLoading(true);
    setError(null);
    setEmailError(null);
    try {
      const endpoint = mode === 'login' ? `${props.baseUrl}/auth/login` : `${props.baseUrl}/auth/register`;
      const payload: LoginRequest | RegisterRequest =
        mode === 'login' ? { email, password } : { email, password, displayName: displayName.trim() };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorData = data as ErrorResponse | null;
        setError(errorData?.message ?? `Request failed with status ${response.status}`);
        return;
      }
      const authData = data as AuthSuccessResponse;
      props.onSuccess(authData);
      
      // If we have an invitation token, accept it after successful auth
      if (props.invitationToken) {
        try {
          await fetch(`${props.baseUrl}/invitations/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token: props.invitationToken })
          });
        } catch {
          // Ignore errors - user is already authenticated
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            onBlur={() => setEmailError(validateEmail(email))}
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
            />
          </label>
        ) : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      <footer>
        <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
          {mode === 'login' ? "Need an account? Let's register" : 'Already registered? Sign in'}
        </button>
      </footer>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}


