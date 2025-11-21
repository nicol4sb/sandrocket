import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function Login(props) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [emailError, setEmailError] = useState(null);
    const validateEmail = (emailValue) => {
        if (!emailValue.trim())
            return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailValue) ? null : 'Please enter a valid email address';
    };
    const handleSubmit = async (e) => {
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
            const payload = mode === 'login' ? { email, password } : { email, password, displayName: displayName.trim() };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                const errorData = data;
                setError(errorData?.message ?? `Request failed with status ${response.status}`);
                return;
            }
            props.onSuccess(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unexpected error occurred.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("section", { className: "auth-card", children: [_jsxs("header", { children: [_jsx("h1", { children: "Sand Rocket" }), _jsx("p", { children: mode === 'login' ? 'Welcome back' : 'Create an account' })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("label", { children: [_jsx("span", { children: "Email" }), _jsx("input", { type: "email", placeholder: "you@example.com", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), onBlur: () => setEmailError(validateEmail(email)) }), emailError ? _jsx("span", { className: "field-error", children: emailError }) : null] }), _jsxs("label", { children: [_jsx("span", { children: "Password" }), _jsx("input", { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: mode === 'login' ? 'current-password' : 'new-password', required: true, value: password, onChange: (e) => setPassword(e.target.value) })] }), mode === 'register' ? (_jsxs("label", { children: [_jsx("span", { children: "Display name" }), _jsx("input", { type: "text", placeholder: "Your name", required: true, value: displayName, onChange: (e) => setDisplayName(e.target.value) })] })) : null, _jsx("button", { type: "submit", disabled: loading, children: loading ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account' })] }), _jsx("footer", { children: _jsx("button", { type: "button", className: "link", onClick: () => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }, children: mode === 'login' ? "Need an account? Let's register" : 'Already registered? Sign in' }) }), error ? _jsx("p", { className: "error", children: error }) : null] }));
}
