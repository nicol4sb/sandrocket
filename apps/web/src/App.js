import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
const DEFAULT_BASE_URL = '/api';
function App() {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [emailError, setEmailError] = useState(null);
    const [result, setResult] = useState(null);
    const baseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL, []);
    const refreshIntervalRef = useRef(null);
    const isRefreshSetupRef = useRef(null);
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
                const data = await response.json();
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
            }
            catch (err) {
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
        }
        else {
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
    const validateEmail = (emailValue) => {
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
    const handleEmailChange = (event) => {
        const value = event.target.value;
        setEmail(value);
        // Clear email error when user starts typing
        if (emailError) {
            setEmailError(null);
        }
    };
    const handleSubmit = async (event) => {
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
            const endpoint = mode === 'login' ? `${baseUrl}/auth/login` : `${baseUrl}/auth/register`;
            const payload = mode === 'login'
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
            let data = null;
            try {
                data = await response.json();
            }
            catch {
                // If response is not JSON, use status text
                data = null;
            }
            if (!response.ok) {
                const errorData = data;
                const errorMessage = errorData?.message ?? `Request failed with status ${response.status}`;
                setError(errorMessage);
                setResult(null);
                setLoading(false);
                return;
            }
            setResult(data);
            setError(null);
        }
        catch (err) {
            console.error('Request error:', err);
            if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError('Unexpected error occurred. Please try again.');
            }
            setResult(null);
        }
        finally {
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
        }
        catch (err) {
            console.error('Logout error:', err);
        }
        finally {
            // Clear state regardless of API call success
            setResult(null);
            setError(null);
            setEmail('');
            setPassword('');
            setDisplayName('');
        }
    };
    return (_jsx("main", { children: _jsxs("section", { className: "auth-card", children: [_jsxs("header", { children: [_jsx("h1", { children: "Sand Rocket" }), _jsx("p", { children: mode === 'login' ? 'Welcome back' : 'Create an account' })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("label", { children: [_jsx("span", { children: "Email" }), _jsx("input", { type: "email", placeholder: "you@example.com", autoComplete: "email", required: true, value: email, onChange: handleEmailChange, onBlur: () => {
                                        const validationError = validateEmail(email);
                                        setEmailError(validationError);
                                    } }), emailError ? _jsx("span", { className: "field-error", children: emailError }) : null] }), _jsxs("label", { children: [_jsx("span", { children: "Password" }), _jsx("input", { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: mode === 'login' ? 'current-password' : 'new-password', required: true, value: password, onChange: (event) => setPassword(event.target.value) })] }), mode === 'register' ? (_jsxs("label", { children: [_jsx("span", { children: "Display name" }), _jsx("input", { type: "text", placeholder: "Your name", required: true, value: displayName, onChange: (event) => setDisplayName(event.target.value) })] })) : null, _jsx("button", { type: "submit", disabled: loading, children: loading
                                ? 'Working...'
                                : mode === 'login'
                                    ? 'Sign In'
                                    : 'Create Account' })] }), _jsx("footer", { children: _jsx("button", { type: "button", className: "link", onClick: toggleMode, children: mode === 'login'
                            ? "Need an account? Let's register"
                            : 'Already registered? Sign in' }) }), error ? _jsx("p", { className: "error", children: error }) : null, result ? (_jsxs("section", { className: "success", children: [_jsx("h2", { children: "Authenticated!" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "User ID" }), _jsx("dd", { children: result.user.id })] }), _jsxs("div", { children: [_jsx("dt", { children: "Email" }), _jsx("dd", { children: result.user.email })] }), _jsxs("div", { children: [_jsx("dt", { children: "Display name" }), _jsx("dd", { children: result.user.displayName })] })] }), _jsxs("p", { className: "token", children: [_jsx("span", { children: "JWT" }), _jsx("code", { children: result.token })] }), _jsx("button", { type: "button", onClick: handleLogout, className: "logout-button", children: "Logout" })] })) : null] }) }));
}
export default App;
