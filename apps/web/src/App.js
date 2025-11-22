import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Login } from './components/Login';
import { Modal } from './components/Modal';
import { EpicLane } from './EpicLane';
import './styles.css';
const DEFAULT_BASE_URL = '/api';
const SELECTED_PROJECT_KEY = 'sr:selectedProjectId';
export default function App() {
    const baseUrl = useMemo(() => {
        const b = import.meta.env?.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
        if (typeof window !== 'undefined' && window.location && window.location.port === '3000' && typeof b === 'string' && b.startsWith('/')) {
            // In dev, ensure we talk to the API port directly if proxy isn't rewriting
            return `${window.location.protocol}//localhost:9000${b}`;
        }
        return b;
    }, []);
    const [auth, setAuth] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [epicsByProject, setEpicsByProject] = useState({});
    const [tasksByEpic, setTasksByEpic] = useState({});
    const [error, setError] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingProjectName, setEditingProjectName] = useState('');
    const [editingProjectNameDraft, setEditingProjectNameDraft] = useState('');
    // Project creation modal
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    // Epic creation modal
    const [showEpicModal, setShowEpicModal] = useState(false);
    const [newEpicName, setNewEpicName] = useState('');
    const [newEpicDesc, setNewEpicDesc] = useState('');
    useEffect(() => {
        const hydrate = async () => {
            try {
                const response = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
                if (!response.ok)
                    return;
                const data = (await response.json());
                setAuth(data);
            }
            catch { }
        };
        hydrate();
    }, [baseUrl]);
    useEffect(() => {
        if (!showProjectDropdown)
            return;
        const handleClickOutside = (e) => {
            const target = e.target;
            if (!target.closest('.project-dropdown-container')) {
                setShowProjectDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showProjectDropdown]);
    useEffect(() => {
        if (!auth)
            return;
        const run = async () => {
            const res = await fetch(`${baseUrl}/projects`, { credentials: 'include' });
            if (!res.ok)
                return;
            const data = (await res.json());
            setProjects(data.projects);
            if (data.projects.length > 0) {
                const stored = window.localStorage.getItem(SELECTED_PROJECT_KEY);
                const storedId = stored ? Number(stored) : null;
                if (storedId && data.projects.some(p => p.id === storedId)) {
                    setSelectedProjectId(storedId);
                }
                else {
                    setSelectedProjectId(data.projects[0].id);
                }
            }
        };
        run();
    }, [auth, baseUrl]);
    useEffect(() => {
        if (!auth || !selectedProjectId)
            return;
        window.localStorage.setItem(SELECTED_PROJECT_KEY, String(selectedProjectId));
        const run = async () => {
            const res = await fetch(`${baseUrl}/projects/${selectedProjectId}/epics`, { credentials: 'include' });
            if (!res.ok)
                return;
            const data = (await res.json());
            setEpicsByProject(prev => ({ ...prev, [selectedProjectId]: data.epics }));
            for (const e of data.epics) {
                const tr = await fetch(`${baseUrl}/epics/${e.id}/tasks`, { credentials: 'include' });
                if (!tr.ok)
                    continue;
                const td = (await tr.json());
                setTasksByEpic(prev => ({
                    ...prev,
                    [e.id]: td.tasks
                }));
            }
        };
        run();
    }, [auth, baseUrl, selectedProjectId]);
    useEffect(() => {
        if (!auth)
            return;
        const timer = window.setInterval(async () => {
            try {
                const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
                if (!res.ok)
                    return;
                const data = (await res.json());
                setAuth(prev => {
                    if (!prev)
                        return data;
                    if (prev.user.id === data.user.id && prev.token !== data.token) {
                        return { ...prev, token: data.token };
                    }
                    return prev;
                });
            }
            catch { }
        }, 2 * 60 * 60 * 1000);
        return () => { window.clearInterval(timer); };
    }, [auth, baseUrl]);
    const handleLogout = async () => {
        await fetch(`${baseUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
        setAuth(null);
        setProjects([]);
        setSelectedProjectId(null);
        setEpicsByProject({});
        setTasksByEpic({});
    };
    const createTask = async (epicId, description) => {
        const res = await fetch(`${baseUrl}/epics/${epicId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ description })
        });
        if (!res.ok) {
            setError('Failed to create task');
            return;
        }
        const created = (await res.json());
        setTasksByEpic(prev => {
            const list = prev[epicId] ?? [];
            return {
                ...prev,
                [epicId]: [...list, created]
            };
        });
    };
    const updateTask = async (id, fields) => {
        const res = await fetch(`${baseUrl}/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(fields)
        });
        if (!res.ok)
            return;
        const epicId = Object.values(tasksByEpic).flat().find(t => t.id === id)?.epicId;
        if (!epicId)
            return;
        setTasksByEpic(prev => {
            const list = prev[epicId] ?? [];
            const updated = list.map(t => {
                if (t.id !== id)
                    return t;
                const nt = {
                    ...t,
                    description: fields.description !== undefined ? fields.description : t.description,
                    status: fields.status !== undefined ? fields.status : t.status
                };
                return nt;
            });
            return { ...prev, [epicId]: updated };
        });
    };
    const deleteTask = async (id) => {
        const res = await fetch(`${baseUrl}/tasks/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok)
            return;
        const epicId = Object.values(tasksByEpic).flat().find(t => t.id === id)?.epicId;
        if (!epicId)
            return;
        setTasksByEpic(prev => {
            const list = prev[epicId] ?? [];
            return { ...prev, [epicId]: list.filter(t => t.id !== id) };
        });
    };
    const reorderTask = async (taskId, epicId, position) => {
        // Optimistic update
        setTasksByEpic(prev => {
            const list = prev[epicId] ?? [];
            const task = list.find(t => t.id === taskId);
            if (!task)
                return prev;
            // Remove task from current position
            const filtered = list.filter(t => t.id !== taskId);
            // Insert at new position
            filtered.splice(Math.min(position, filtered.length), 0, {
                ...task,
                position
            });
            // Recalculate positions for all tasks
            const reordered = filtered.map((t, idx) => ({ ...t, position: idx }));
            return { ...prev, [epicId]: reordered };
        });
        // API call - always use backlog status
        const res = await fetch(`${baseUrl}/tasks/${taskId}/position`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ epicId, status: 'backlog', position })
        });
        if (!res.ok) {
            // Revert on error - reload tasks for this epic
            const tr = await fetch(`${baseUrl}/epics/${epicId}/tasks`, { credentials: 'include' });
            if (tr.ok) {
                const td = (await tr.json());
                setTasksByEpic(prev => ({
                    ...prev,
                    [epicId]: td.tasks
                }));
            }
        }
        else {
            const updated = (await res.json());
            setTasksByEpic(prev => {
                const list = prev[epicId] ?? [];
                const newList = list.map(t => t.id === taskId ? updated : t)
                    .sort((a, b) => a.position - b.position);
                return { ...prev, [epicId]: newList };
            });
        }
    };
    const createProject = async (name, description) => {
        const res = await fetch(`${baseUrl}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, description: description ?? null })
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to create project' }));
            setError(errorData.message || 'Failed to create project');
            return;
        }
        const created = (await res.json());
        setProjects(prev => [...prev, created]);
        setSelectedProjectId(created.id);
        setShowProjectModal(false);
        setNewProjectName('');
        setNewProjectDesc('');
    };
    const createEpic = async (projectId, name, description) => {
        const res = await fetch(`${baseUrl}/projects/${projectId}/epics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, description: description ?? null })
        });
        if (!res.ok) {
            setError('Failed to create epic');
            return;
        }
        const ep = (await res.json());
        setEpicsByProject(prev => {
            const list = prev[projectId] ?? [];
            return { ...prev, [projectId]: [...list, { id: ep.id, name: ep.name, description: ep.description }] };
        });
        setTasksByEpic(prev => ({ ...prev, [ep.id]: [] }));
    };
    const updateEpic = async (id, fields) => {
        const res = await fetch(`${baseUrl}/epics/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(fields)
        });
        if (!res.ok || !selectedProjectId)
            return;
        setEpicsByProject(prev => {
            const list = prev[selectedProjectId] ?? [];
            const updated = list.map(e => {
                if (e.id !== id)
                    return e;
                return {
                    ...e,
                    name: fields.name !== undefined ? fields.name : e.name,
                    description: fields.description !== undefined ? fields.description : e.description
                };
            });
            return { ...prev, [selectedProjectId]: updated };
        });
    };
    const deleteEpic = async (id) => {
        const res = await fetch(`${baseUrl}/epics/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok || !selectedProjectId)
            return;
        setEpicsByProject(prev => {
            const list = prev[selectedProjectId] ?? [];
            return { ...prev, [selectedProjectId]: list.filter(e => e.id !== id) };
        });
        // Also remove tasks for this epic
        setTasksByEpic(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
    };
    const deleteProject = async (id) => {
        const res = await fetch(`${baseUrl}/projects/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok)
            return;
        setProjects(prev => prev.filter(p => p.id !== id));
        if (selectedProjectId === id) {
            const remaining = projects.filter(p => p.id !== id);
            setSelectedProjectId(remaining.length > 0 ? remaining[0].id : null);
        }
        setEpicsByProject(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
    };
    const updateProject = async (id, name) => {
        const res = await fetch(`${baseUrl}/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name })
        });
        if (!res.ok)
            return;
        setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    };
    if (!auth) {
        return _jsx(Login, { baseUrl: baseUrl, onSuccess: setAuth });
    }
    const current = projects.find(p => p.id === selectedProjectId) ?? null;
    return (_jsxs("main", { className: "dashboard", children: [_jsxs("div", { className: "project-dropdown-container floating-control", children: [_jsxs("button", { type: "button", className: "project-dropdown-toggle", onClick: () => setShowProjectDropdown(!showProjectDropdown), children: [_jsx("span", { children: current?.name ?? 'Select project' }), _jsx("span", { className: "dropdown-arrow", children: "\u25BC" })] }), showProjectDropdown && (_jsxs("div", { className: "project-dropdown-menu", children: [projects.map(p => (_jsx("div", { className: "project-dropdown-item-wrapper", children: editingProjectId === p.id ? (_jsx("input", { type: "text", className: "project-dropdown-edit-input", value: editingProjectNameDraft, onChange: (e) => setEditingProjectNameDraft(e.target.value), onKeyDown: (e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (editingProjectNameDraft.trim()) {
                                                void updateProject(p.id, editingProjectNameDraft.trim());
                                            }
                                            setEditingProjectId(null);
                                            setEditingProjectNameDraft('');
                                        }
                                        else if (e.key === 'Escape') {
                                            setEditingProjectId(null);
                                            setEditingProjectNameDraft('');
                                        }
                                    }, onBlur: () => {
                                        if (editingProjectNameDraft.trim()) {
                                            void updateProject(p.id, editingProjectNameDraft.trim());
                                        }
                                        setEditingProjectId(null);
                                        setEditingProjectNameDraft('');
                                    }, autoFocus: true, onClick: (e) => e.stopPropagation() })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: `project-dropdown-item ${selectedProjectId === p.id ? 'active' : ''}`, onClick: () => {
                                                setSelectedProjectId(p.id);
                                                setShowProjectDropdown(false);
                                            }, children: p.name }), _jsx("button", { className: "project-dropdown-edit", onClick: (e) => {
                                                e.stopPropagation();
                                                setEditingProjectId(p.id);
                                                setEditingProjectNameDraft(p.name);
                                            }, title: "Rename project", children: "\u270E" }), _jsx("button", { className: "project-dropdown-delete", onClick: (e) => {
                                                e.stopPropagation();
                                                if (confirm(`Delete project "${p.name}"? This will delete all epics and tasks.`)) {
                                                    void deleteProject(p.id);
                                                }
                                            }, title: "Delete project", children: "\u00D7" })] })) }, p.id))), _jsx("button", { type: "button", className: "project-dropdown-item project-dropdown-add", onClick: () => {
                                    setShowProjectModal(true);
                                    setShowProjectDropdown(false);
                                }, children: "+ New Project" })] }))] }), selectedProjectId && (_jsx("button", { type: "button", className: "btn-ghost btn-epic floating-control", onClick: () => setShowEpicModal(true), children: "+ Epic" })), _jsxs("div", { className: "user-actions floating-control", children: [_jsx("span", { children: auth.user.displayName }), _jsx("button", { type: "button", onClick: handleLogout, className: "btn-ghost", children: "Logout" })] }), _jsx("section", { className: "board", children: !current ? (_jsx("div", { className: "card", children: "No project selected" })) : (_jsx("div", { className: "epic-columns", children: (epicsByProject[current.id] ?? []).map((e) => (_jsx(EpicLane, { epic: e, tasks: tasksByEpic[e.id] ?? [], baseUrl: baseUrl, onInlineUpdate: (id, fields) => updateTask(id, fields), onReorder: (taskId, position) => reorderTask(taskId, e.id, position), onDeleteTask: (id) => deleteTask(id), onCreateTask: (epicId, description) => createTask(epicId, description), onEpicUpdate: (id, fields) => updateEpic(id, fields), onDeleteEpic: (id) => deleteEpic(id), currentUserId: auth.user.id }, e.id))) })) }), error ? _jsx("p", { className: "error", children: error }) : null, _jsxs(Modal, { isOpen: showProjectModal, title: "Create project", onClose: () => { setShowProjectModal(false); setNewProjectName(''); setNewProjectDesc(''); }, footer: (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn-ghost", type: "button", onClick: () => { setShowProjectModal(false); setNewProjectName(''); setNewProjectDesc(''); }, children: "Cancel" }), _jsx("button", { className: "btn-primary", type: "button", onClick: () => {
                                if (!newProjectName.trim())
                                    return;
                                void createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
                            }, children: "Create" })] })), children: [_jsxs("label", { children: [_jsx("span", { children: "Name" }), _jsx("input", { value: newProjectName, onChange: (e) => setNewProjectName(e.target.value) })] }), _jsxs("label", { children: [_jsx("span", { children: "Description (optional)" }), _jsx("input", { value: newProjectDesc, onChange: (e) => setNewProjectDesc(e.target.value) })] })] }), _jsxs(Modal, { isOpen: showEpicModal, title: "Create epic", onClose: () => { setShowEpicModal(false); setNewEpicName(''); setNewEpicDesc(''); }, footer: (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn-ghost", type: "button", onClick: () => { setShowEpicModal(false); }, children: "Cancel" }), _jsx("button", { className: "btn-primary", type: "button", onClick: () => {
                                const n = newEpicName.trim();
                                if (!n || !selectedProjectId)
                                    return;
                                void (async () => {
                                    await createEpic(selectedProjectId, n, newEpicDesc.trim() || undefined);
                                    setShowEpicModal(false);
                                    setNewEpicName('');
                                    setNewEpicDesc('');
                                })();
                            }, children: "Create" })] })), children: [_jsxs("label", { children: [_jsx("span", { children: "Title" }), _jsx("input", { value: newEpicName, onChange: (e) => setNewEpicName(e.target.value), placeholder: "Epic title" })] }), _jsxs("label", { children: [_jsx("span", { children: "Backlog (optional)" }), _jsx("textarea", { value: newEpicDesc, onChange: (e) => setNewEpicDesc(e.target.value), placeholder: "Add backlog notes, ideas, or context...", rows: 4 })] })] })] }));
}
// TaskGroup removed: unified flat list per epic
export function InlineText(props) {
    const [val, setVal] = useState(props.value);
    const [isEditing, setIsEditing] = useState(false);
    const debounceRef = useRef(null);
    const textareaRef = useRef(null);
    const inputRef = useRef(null);
    const spanRef = useRef(null);
    const clickPositionRef = useRef(null);
    const initialHeightRef = useRef(null);
    useEffect(() => { setVal(props.value); }, [props.value]);
    // Auto-resize textarea based on content
    useEffect(() => {
        if (props.multiline && isEditing && textareaRef.current) {
            const textarea = textareaRef.current;
            // If we have an initial height from the span, use it to prevent jumping
            if (initialHeightRef.current !== null) {
                const savedHeight = initialHeightRef.current;
                initialHeightRef.current = null; // Clear immediately
                // Set initial height to match span
                textarea.style.height = `${savedHeight}px`;
                // Then recalculate based on actual content to ensure accuracy
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (textareaRef.current) {
                            textareaRef.current.style.height = 'auto';
                            const scrollHeight = textareaRef.current.scrollHeight;
                            // Use the larger of the two to prevent shrinking
                            textareaRef.current.style.height = `${Math.max(savedHeight, scrollHeight)}px`;
                        }
                    });
                });
            }
            else {
                // Normal auto-resize for subsequent changes
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        }
    }, [val, props.multiline, isEditing]);
    // Set cursor position for input after it's focused
    useEffect(() => {
        if (isEditing && inputRef.current && clickPositionRef.current !== null) {
            const pos = clickPositionRef.current;
            clickPositionRef.current = null;
            requestAnimationFrame(() => {
                if (inputRef.current) {
                    inputRef.current.setSelectionRange(pos, pos);
                }
            });
        }
    }, [isEditing]);
    // Set cursor position for textarea after it's rendered
    useEffect(() => {
        if (props.multiline && isEditing && textareaRef.current) {
            const textarea = textareaRef.current;
            const pos = textarea.__cursorPos;
            if (typeof pos === 'number' && pos >= 0) {
                delete textarea.__cursorPos;
                // Use multiple requestAnimationFrame to ensure textarea is fully rendered
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (textareaRef.current && pos <= textareaRef.current.value.length) {
                            textareaRef.current.setSelectionRange(pos, pos);
                            textareaRef.current.focus();
                        }
                    });
                });
            }
        }
    }, [isEditing, props.multiline]);
    const commit = (next) => { props.onChange(next); };
    const schedule = (next) => {
        if (debounceRef.current)
            window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => { commit(next); }, 10000);
    };
    if (props.multiline) {
        if (isEditing) {
            return (_jsx("textarea", { ref: textareaRef, className: props.className, value: val, placeholder: props.placeholder, style: {
                    padding: 0,
                    margin: 0,
                    border: 'none',
                    borderWidth: 0,
                    borderStyle: 'none',
                    borderColor: 'transparent',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    borderLeft: 'none',
                    borderRadius: 0,
                    background: 'transparent',
                    outline: 'none',
                    outlineWidth: 0,
                    outlineStyle: 'none',
                    outlineColor: 'transparent',
                    outlineOffset: 0,
                    boxShadow: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    font: 'inherit',
                    color: 'inherit',
                    lineHeight: 'inherit',
                    resize: 'none',
                    overflow: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box'
                }, onChange: (e) => {
                    const next = e.target.value;
                    setVal(next);
                    schedule(next);
                    // Auto-resize on change
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                }, onBlur: () => {
                    if (debounceRef.current) {
                        window.clearTimeout(debounceRef.current);
                        debounceRef.current = null;
                    }
                    commit(val);
                    setIsEditing(false);
                    if (props.onEditingChange)
                        props.onEditingChange(false);
                }, onKeyDown: (e) => {
                    e.stopPropagation(); // Prevent drag from starting
                    if (e.key === 'Enter') {
                        if (e.altKey) {
                            // Alt+Enter: allow newline (default behavior)
                            return;
                        }
                        else {
                            // Enter: save and exit
                            e.preventDefault();
                            if (debounceRef.current) {
                                window.clearTimeout(debounceRef.current);
                                debounceRef.current = null;
                            }
                            commit(val);
                            setIsEditing(false);
                            if (props.onEditingChange)
                                props.onEditingChange(false);
                            e.target.blur();
                            if (props.onSave) {
                                // Call onSave after a brief delay to ensure blur completes
                                setTimeout(() => {
                                    props.onSave();
                                }, 10);
                            }
                        }
                    }
                }, onClick: props.onClick, autoFocus: true }));
        }
        return (_jsx("span", { ref: spanRef, className: props.className, onClick: (e) => {
                if (!props.editable)
                    return;
                if (props.onClick)
                    props.onClick(e);
                e.stopPropagation();
                const span = e.currentTarget;
                // Use browser's caret API for accurate multiline positioning
                let charIndex = span.textContent?.length || 0;
                if (document.caretRangeFromPoint) {
                    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
                    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                        const textNode = range.startContainer;
                        const textBefore = textNode.textContent?.substring(0, range.startOffset) || '';
                        // Find the position in the span's text content
                        const allText = span.textContent || '';
                        const nodeText = textNode.textContent || '';
                        const nodeIndex = allText.indexOf(nodeText);
                        if (nodeIndex >= 0) {
                            charIndex = nodeIndex + range.startOffset;
                        }
                        else {
                            charIndex = range.startOffset;
                        }
                    }
                }
                else if (document.caretPositionFromPoint) {
                    const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                    if (pos && pos.offsetNode.nodeType === Node.TEXT_NODE) {
                        const textNode = pos.offsetNode;
                        const textBefore = textNode.textContent?.substring(0, pos.offset) || '';
                        const allText = span.textContent || '';
                        const nodeText = textNode.textContent || '';
                        const nodeIndex = allText.indexOf(nodeText);
                        if (nodeIndex >= 0) {
                            charIndex = nodeIndex + pos.offset;
                        }
                        else {
                            charIndex = pos.offset;
                        }
                    }
                }
                else {
                    // Fallback to canvas measurement for single-line
                    const text = span.textContent || '';
                    const rect = span.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const style = window.getComputedStyle(span);
                    const font = `${style.fontSize} ${style.fontFamily}`;
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        context.font = font;
                        for (let i = 0; i < text.length; i++) {
                            const width = context.measureText(text.substring(0, i + 1)).width;
                            if (width > clickX) {
                                charIndex = i;
                                break;
                            }
                        }
                    }
                }
                // Capture the span's height before switching to edit mode
                const spanHeight = span.getBoundingClientRect().height;
                initialHeightRef.current = spanHeight;
                setIsEditing(true);
                if (props.onEditingChange)
                    props.onEditingChange(true);
                requestAnimationFrame(() => {
                    if (textareaRef.current) {
                        textareaRef.current.__cursorPos = charIndex;
                    }
                });
            }, style: {
                cursor: props.editable ? 'text' : 'default',
                display: 'block',
                whiteSpace: 'pre-wrap',
                padding: 0,
                margin: 0,
                lineHeight: 'inherit',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                background: 'transparent'
            }, children: val ? val : _jsx("span", { style: { opacity: 0.5 }, children: props.placeholder }) }));
    }
    // Single-line input (for epic titles)
    if (isEditing) {
        return (_jsx("input", { ref: inputRef, className: props.className, value: val, placeholder: props.placeholder, style: {
                padding: 0,
                margin: 0,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                boxShadow: 'none',
                font: 'inherit',
                color: 'inherit',
                lineHeight: 'inherit',
                width: '100%',
                boxSizing: 'border-box'
            }, onChange: (e) => { const next = e.target.value; setVal(next); schedule(next); }, onBlur: () => {
                if (debounceRef.current) {
                    window.clearTimeout(debounceRef.current);
                    debounceRef.current = null;
                }
                commit(val);
                setIsEditing(false);
                if (props.onEditingChange)
                    props.onEditingChange(false);
            }, onKeyDown: (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (debounceRef.current) {
                        window.clearTimeout(debounceRef.current);
                        debounceRef.current = null;
                    }
                    commit(val);
                    setIsEditing(false);
                    if (props.onEditingChange)
                        props.onEditingChange(false);
                    e.target.blur();
                    if (props.onSave) {
                        // Call onSave after a brief delay to ensure blur completes
                        setTimeout(() => props.onSave(), 0);
                    }
                }
                else if (e.key === 'Escape') {
                    setVal(props.value);
                    setIsEditing(false);
                    if (props.onEditingChange)
                        props.onEditingChange(false);
                    e.target.blur();
                }
            }, autoFocus: true }));
    }
    return (_jsx("span", { ref: spanRef, className: props.className, onClick: (e) => {
            if (!props.editable)
                return;
            e.stopPropagation();
            const span = e.currentTarget;
            const text = span.textContent || '';
            // Calculate character position based on click X coordinate
            const rect = span.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const style = window.getComputedStyle(span);
            const font = `${style.fontSize} ${style.fontFamily}`;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            let charIndex = text.length;
            if (context) {
                context.font = font;
                for (let i = 0; i < text.length; i++) {
                    const width = context.measureText(text.substring(0, i + 1)).width;
                    if (width > clickX) {
                        charIndex = i;
                        break;
                    }
                }
            }
            clickPositionRef.current = charIndex;
            setIsEditing(true);
            if (props.onEditingChange)
                props.onEditingChange(true);
        }, style: {
            cursor: props.editable ? 'text' : 'default',
            padding: 0,
            margin: 0,
            lineHeight: 'inherit',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            display: 'inline-block',
            width: '100%',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            background: 'transparent'
        }, children: val ? val : _jsx("span", { style: { opacity: 0.5 }, children: props.placeholder }) }));
}
