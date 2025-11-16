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
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');
    const [epicsByProject, setEpicsByProject] = useState({});
    const [newEpicNameByProject, setNewEpicNameByProject] = useState({});
    const [newEpicDescriptionByProject, setNewEpicDescriptionByProject] = useState({});
    const [tasksByEpic, setTasksByEpic] = useState({});
    const [newTaskTitleByEpic, setNewTaskTitleByEpic] = useState({});
    const [newTaskDescriptionByEpic, setNewTaskDescriptionByEpic] = useState({});
    const [dragOver, setDragOver] = useState(null);
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
                // Then refresh every 2 days
                refreshIntervalRef.current = window.setInterval(() => {
                    refreshToken();
                }, 2 * 24 * 3600 * 1000); // 2 days
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
    // Load projects when authenticated
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const response = await fetch(`${baseUrl}/projects`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (!response.ok) {
                    return;
                }
                const data = (await response.json());
                setProjects(data.projects);
            }
            catch {
                // ignore
            }
        };
        if (result) {
            loadProjects();
        }
        else {
            setProjects([]);
        }
    }, [result?.user.id, baseUrl]);
    const loadEpicsForProject = async (projectId) => {
        try {
            const response = await fetch(`${baseUrl}/projects/${projectId}/epics`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) {
                return;
            }
            const data = (await response.json());
            setEpicsByProject((prev) => ({ ...prev, [projectId]: data.epics }));
        }
        catch {
            // ignore
        }
    };
    useEffect(() => {
        // When projects change, load their epics
        if (projects.length > 0) {
            projects.forEach((p) => {
                void loadEpicsForProject(p.id);
            });
        }
        else {
            setEpicsByProject({});
        }
    }, [projects]);
    const loadTasksForEpic = async (epicId) => {
        try {
            const response = await fetch(`${baseUrl}/epics/${epicId}/tasks`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) {
                return;
            }
            const data = (await response.json());
            setTasksByEpic((prev) => ({ ...prev, [epicId]: data.tasks }));
        }
        catch {
            // ignore
        }
    };
    useEffect(() => {
        // When epics load/change, load their tasks
        const epicIds = Object.keys(epicsByProject).flatMap((pid) => (epicsByProject[pid] ?? []).map((e) => e.id));
        if (epicIds.length > 0) {
            epicIds.forEach((eid) => {
                void loadTasksForEpic(eid);
            });
        }
        else {
            setTasksByEpic({});
        }
    }, [epicsByProject]);
    const handleCreateProject = async (event) => {
        event.preventDefault();
        const name = newProjectName.trim();
        if (!name) {
            setError('Project name is required');
            return;
        }
        try {
            const payload = {
                name,
                description: newProjectDescription.trim() || undefined
            };
            const response = await fetch(`${baseUrl}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => null));
                setError(data?.message ?? `Request failed with status ${response.status}`);
                return;
            }
            // Reload projects
            setNewProjectName('');
            setNewProjectDescription('');
            const list = await fetch(`${baseUrl}/projects`, {
                method: 'GET',
                credentials: 'include'
            });
            if (list.ok) {
                const data = (await list.json());
                setProjects(data.projects);
                setError(null);
            }
        }
        catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError('Unexpected error occurred. Please try again.');
            }
        }
    };
    const handleCreateEpic = (projectId) => async (event) => {
        event.preventDefault();
        const name = (newEpicNameByProject[projectId] ?? '').trim();
        if (!name) {
            setError('Epic name is required');
            return;
        }
        try {
            const epicPayload = {
                name,
                description: (newEpicDescriptionByProject[projectId] ?? '').trim() || undefined
            };
            const response = await fetch(`${baseUrl}/projects/${projectId}/epics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(epicPayload)
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => null));
                setError(data?.message ?? `Request failed with status ${response.status}`);
                return;
            }
            // Clear inputs
            setNewEpicNameByProject((prev) => ({ ...prev, [projectId]: '' }));
            setNewEpicDescriptionByProject((prev) => ({ ...prev, [projectId]: '' }));
            // Reload epics
            void loadEpicsForProject(projectId);
            setError(null);
        }
        catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError('Unexpected error occurred. Please try again.');
            }
        }
    };
    const handleCreateTask = (epicId) => async (event) => {
        event.preventDefault();
        const title = (newTaskTitleByEpic[epicId] ?? '').trim();
        if (!title) {
            setError('Task title is required');
            return;
        }
        try {
            const taskPayload = {
                epicId,
                title,
                description: (newTaskDescriptionByEpic[epicId] ?? '').trim() || undefined
            };
            const response = await fetch(`${baseUrl}/epics/${epicId}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(taskPayload)
            });
            if (!response.ok) {
                const data = (await response.json().catch(() => null));
                setError(data?.message ?? `Request failed with status ${response.status}`);
                return;
            }
            setNewTaskTitleByEpic((prev) => ({ ...prev, [epicId]: '' }));
            setNewTaskDescriptionByEpic((prev) => ({ ...prev, [epicId]: '' }));
            void loadTasksForEpic(epicId);
            setError(null);
        }
        catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError('Unexpected error occurred. Please try again.');
            }
        }
    };
    const moveTask = async (taskId, newStatus) => {
        try {
            const response = await fetch(`${baseUrl}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok)
                return;
            // Find epic id to reload
            const epicId = Object.values(tasksByEpic).flat().find((t) => t.id === taskId)?.epicId;
            if (epicId) {
                void loadTasksForEpic(epicId);
            }
        }
        catch {
            // ignore
        }
    };
    // Drag and drop
    const handleDragStart = (taskId) => (ev) => {
        ev.dataTransfer.setData('text/plain', taskId);
        ev.dataTransfer.effectAllowed = 'move';
    };
    const handleDropOnColumn = (epicId, status) => async (ev) => {
        ev.preventDefault();
        const taskId = ev.dataTransfer.getData('text/plain');
        if (!taskId)
            return;
        await moveTask(taskId, status);
        setDragOver(null);
    };
    const allowDrop = (ev) => {
        ev.preventDefault();
    };
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
    return (_jsx("main", { children: !result ? (_jsxs("section", { className: "auth-card", children: [_jsxs("header", { children: [_jsx("h1", { children: "Sand Rocket" }), _jsx("p", { children: mode === 'login' ? 'Welcome back' : 'Create an account' })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("label", { children: [_jsx("span", { children: "Email" }), _jsx("input", { type: "email", placeholder: "you@example.com", autoComplete: "email", required: true, value: email, onChange: handleEmailChange, onBlur: () => {
                                        const validationError = validateEmail(email);
                                        setEmailError(validationError);
                                    } }), emailError ? _jsx("span", { className: "field-error", children: emailError }) : null] }), _jsxs("label", { children: [_jsx("span", { children: "Password" }), _jsx("input", { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: mode === 'login' ? 'current-password' : 'new-password', required: true, value: password, onChange: (event) => setPassword(event.target.value) })] }), mode === 'register' ? (_jsxs("label", { children: [_jsx("span", { children: "Display name" }), _jsx("input", { type: "text", placeholder: "Your name", required: true, value: displayName, onChange: (event) => setDisplayName(event.target.value) })] })) : null, _jsx("button", { type: "submit", disabled: loading, children: loading
                                ? 'Working...'
                                : mode === 'login'
                                    ? 'Sign In'
                                    : 'Create Account' })] }), _jsx("footer", { children: _jsx("button", { type: "button", className: "link", onClick: toggleMode, children: mode === 'login'
                            ? "Need an account? Let's register"
                            : 'Already registered? Sign in' }) }), error ? _jsx("p", { className: "error", children: error }) : null] })) : (_jsxs("section", { className: "auth-card", children: [_jsxs("header", { children: [_jsx("h1", { children: "Sand Rocket" }), _jsxs("p", { children: ["Welcome, ", result.user.displayName] })] }), _jsx("button", { type: "button", onClick: handleLogout, className: "logout-button", children: "Logout" }), _jsxs("section", { style: { marginTop: '2rem' }, children: [_jsx("h3", { children: "Your projects" }), projects.length === 0 ? _jsx("p", { children: "No projects yet." }) : (_jsx("ul", { children: projects.map((p) => (_jsxs("li", { children: [_jsx("strong", { children: p.name }), p.description ? ` — ${p.description}` : null, _jsxs("div", { style: { marginTop: '0.5rem' }, children: [_jsx("em", { children: "Epics" }), (epicsByProject[p.id]?.length ?? 0) === 0 ? _jsx("p", { style: { margin: 0 }, children: "No epics yet." }) : (_jsx("div", { className: "epic-columns", children: (epicsByProject[p.id] ?? []).map((e) => (_jsxs("div", { className: "epic-card", children: [_jsxs("div", { style: { fontWeight: 700, marginBottom: '0.25rem' }, children: [e.name, e.description ? ` — ${e.description}` : null] }), _jsx("div", { className: "columns", children: ['backlog', 'in_progress', 'done'].map((col) => (_jsxs("div", { className: `column ${col} ${dragOver && dragOver.epicId === e.id && dragOver.status === col ? 'drag-over' : ''}`, onDragOver: allowDrop, onDragEnter: () => setDragOver({ epicId: e.id, status: col }), onDragLeave: () => setDragOver(null), onDrop: handleDropOnColumn(e.id, col), children: [_jsx("div", { style: { fontWeight: 600, marginBottom: '0.25rem' }, children: col === 'backlog' ? 'Backlog' : col === 'in_progress' ? 'In Progress' : 'Done' }), _jsx("ul", { style: { listStyle: 'none', padding: 0, margin: 0 }, children: (tasksByEpic[e.id] ?? []).filter((t) => t.status === col).map((t) => (_jsxs("li", { className: `task ${col}`, draggable: true, onDragStart: handleDragStart(t.id), children: [t.title, _jsxs("div", { style: { display: 'inline-flex', gap: '0.25rem', marginLeft: '0.5rem' }, children: [col !== 'backlog' ? (_jsx("button", { type: "button", onClick: () => moveTask(t.id, col === 'done' ? 'in_progress' : 'backlog'), children: "\u2190" })) : null, col !== 'done' ? (_jsx("button", { type: "button", onClick: () => moveTask(t.id, col === 'backlog' ? 'in_progress' : 'done'), children: "\u2192" })) : null] })] }, t.id))) })] }, col))) }), _jsxs("form", { onSubmit: handleCreateTask(e.id), style: { marginTop: '0.5rem' }, children: [_jsxs("label", { children: [_jsx("span", { children: "Task title" }), _jsx("input", { type: "text", placeholder: "New task", value: newTaskTitleByEpic[e.id] ?? '', onChange: (ev) => setNewTaskTitleByEpic((prev) => ({ ...prev, [e.id]: ev.target.value })), required: true })] }), _jsxs("label", { children: [_jsx("span", { children: "Description (optional)" }), _jsx("input", { type: "text", placeholder: "Short description", value: newTaskDescriptionByEpic[e.id] ?? '', onChange: (ev) => setNewTaskDescriptionByEpic((prev) => ({ ...prev, [e.id]: ev.target.value })) })] }), _jsx("button", { type: "submit", children: "Add task" })] })] }, e.id))) })), _jsxs("form", { onSubmit: handleCreateEpic(p.id), style: { marginTop: '0.5rem' }, children: [_jsxs("label", { children: [_jsx("span", { children: "Epic name" }), _jsx("input", { type: "text", placeholder: "First epic", value: newEpicNameByProject[p.id] ?? '', onChange: (e) => setNewEpicNameByProject((prev) => ({ ...prev, [p.id]: e.target.value })), required: true })] }), _jsxs("label", { children: [_jsx("span", { children: "Description (optional)" }), _jsx("input", { type: "text", placeholder: "Short description", value: newEpicDescriptionByProject[p.id] ?? '', onChange: (e) => setNewEpicDescriptionByProject((prev) => ({ ...prev, [p.id]: e.target.value })) })] }), _jsx("button", { type: "submit", children: "Add epic" })] })] })] }, p.id))) })), _jsxs("form", { onSubmit: handleCreateProject, style: { marginTop: '1rem' }, children: [_jsxs("label", { children: [_jsx("span", { children: "Project name" }), _jsx("input", { type: "text", placeholder: "My first project", value: newProjectName, onChange: (e) => setNewProjectName(e.target.value), required: true })] }), _jsxs("label", { children: [_jsx("span", { children: "Description (optional)" }), _jsx("input", { type: "text", placeholder: "Short description", value: newProjectDescription, onChange: (e) => setNewProjectDescription(e.target.value) })] }), _jsx("button", { type: "submit", children: "Create project" })] })] })] })) }));
}
export default App;
