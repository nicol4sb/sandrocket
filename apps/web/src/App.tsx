import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AuthSuccessResponse,
  ListProjectsResponse,
  ErrorResponse,
  LoginRequest,
  RegisterRequest,
  CreateProjectRequest
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
  const [projects, setProjects] = useState<ListProjectsResponse['projects']>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [epicsByProject, setEpicsByProject] = useState<Record<string, { id: string; projectId: string; name: string; description: string | null; createdAt: string; updatedAt: string; }[]>>({});
  const [newEpicNameByProject, setNewEpicNameByProject] = useState<Record<string, string>>({});
  const [newEpicDescriptionByProject, setNewEpicDescriptionByProject] = useState<Record<string, string>>({});
  const [tasksByEpic, setTasksByEpic] = useState<Record<string, { id: string; epicId: string; title: string; description: string | null; status: 'backlog' | 'in_progress' | 'done'; position: number; createdAt: string; updatedAt: string; }[]>>({});
  const [newTaskTitleByEpic, setNewTaskTitleByEpic] = useState<Record<string, string>>({});
  const [newTaskDescriptionByEpic, setNewTaskDescriptionByEpic] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState<{ epicId: string; status: 'backlog' | 'in_progress' | 'done' } | null>(null);

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
        const data = (await response.json()) as ListProjectsResponse;
        setProjects(data.projects);
      } catch {
        // ignore
      }
    };
    if (result) {
      loadProjects();
    } else {
      setProjects([]);
    }
  }, [result?.user.id, baseUrl]);

  const loadEpicsForProject = async (projectId: string) => {
    try {
      const response = await fetch(`${baseUrl}/projects/${projectId}/epics`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { epics: typeof epicsByProject[string] };
      setEpicsByProject((prev) => ({ ...prev, [projectId]: data.epics }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // When projects change, load their epics
    if (projects.length > 0) {
      projects.forEach((p) => {
        void loadEpicsForProject(p.id);
      });
    } else {
      setEpicsByProject({});
    }
  }, [projects]);

  const loadTasksForEpic = async (epicId: string) => {
    try {
      const response = await fetch(`${baseUrl}/epics/${epicId}/tasks`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { tasks: typeof tasksByEpic[string] };
      setTasksByEpic((prev) => ({ ...prev, [epicId]: data.tasks }));
    } catch {
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
    } else {
      setTasksByEpic({});
    }
  }, [epicsByProject]);

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name) {
      setError('Project name is required');
      return;
    }
    try {
      const payload: CreateProjectRequest = {
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
        const data = (await response.json().catch(() => null)) as ErrorResponse | null;
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
        const data = (await list.json()) as ListProjectsResponse;
        setProjects(data.projects);
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unexpected error occurred. Please try again.');
      }
    }
  };

  const handleCreateEpic = (projectId: string) => async (event: FormEvent<HTMLFormElement>) => {
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
        const data = (await response.json().catch(() => null)) as ErrorResponse | null;
        setError(data?.message ?? `Request failed with status ${response.status}`);
        return;
      }
      // Clear inputs
      setNewEpicNameByProject((prev) => ({ ...prev, [projectId]: '' }));
      setNewEpicDescriptionByProject((prev) => ({ ...prev, [projectId]: '' }));
      // Reload epics
      void loadEpicsForProject(projectId);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unexpected error occurred. Please try again.');
      }
    }
  };

  const handleCreateTask = (epicId: string) => async (event: FormEvent<HTMLFormElement>) => {
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
        const data = (await response.json().catch(() => null)) as ErrorResponse | null;
        setError(data?.message ?? `Request failed with status ${response.status}`);
        return;
      }
      setNewTaskTitleByEpic((prev) => ({ ...prev, [epicId]: '' }));
      setNewTaskDescriptionByEpic((prev) => ({ ...prev, [epicId]: '' }));
      void loadTasksForEpic(epicId);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unexpected error occurred. Please try again.');
      }
    }
  };

  const moveTask = async (taskId: string, newStatus: 'backlog' | 'in_progress' | 'done') => {
    try {
      const response = await fetch(`${baseUrl}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) return;
      // Find epic id to reload
      const epicId = Object.values(tasksByEpic).flat().find((t) => t.id === taskId)?.epicId;
      if (epicId) {
        void loadTasksForEpic(epicId);
      }
    } catch {
      // ignore
    }
  };

  // Drag and drop
  const handleDragStart = (taskId: string) => (ev: React.DragEvent<HTMLLIElement>) => {
    ev.dataTransfer.setData('text/plain', taskId);
    ev.dataTransfer.effectAllowed = 'move';
  };
  const handleDropOnColumn = (epicId: string, status: 'backlog' | 'in_progress' | 'done') => async (ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData('text/plain');
    if (!taskId) return;
    await moveTask(taskId, status);
    setDragOver(null);
  };
  const allowDrop: React.DragEventHandler<HTMLDivElement> = (ev) => {
    ev.preventDefault();
  };

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
      {!result ? (
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
        </section>
      ) : (
        <section className="auth-card">
          <header>
            <h1>Sand Rocket</h1>
            <p>Welcome, {result.user.displayName}</p>
          </header>

          <button type="button" onClick={handleLogout} className="logout-button">
            Logout
          </button>

          <section style={{ marginTop: '2rem' }}>
            <h3>Your projects</h3>
            {projects.length === 0 ? <p>No projects yet.</p> : (
              <ul>
                {projects.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    {p.description ? ` — ${p.description}` : null}
                    <div style={{ marginTop: '0.5rem' }}>
                      <em>Epics</em>
                      {(epicsByProject[p.id]?.length ?? 0) === 0 ? <p style={{ margin: 0 }}>No epics yet.</p> : (
                        <div className="epic-columns">
                          {(epicsByProject[p.id] ?? []).map((e) => (
                            <div key={e.id} className="epic-card">
                              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                                {e.name}{e.description ? ` — ${e.description}` : null}
                              </div>
                              <div className="columns">
                                {(['backlog', 'in_progress', 'done'] as const).map((col) => (
                                  <div
                                    key={col}
                                    className={`column ${col} ${dragOver && dragOver.epicId === e.id && dragOver.status === col ? 'drag-over' : ''}`}
                                    onDragOver={allowDrop}
                                    onDragEnter={() => setDragOver({ epicId: e.id, status: col })}
                                    onDragLeave={() => setDragOver(null)}
                                    onDrop={handleDropOnColumn(e.id, col)}
                                  >
                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                      {col === 'backlog' ? 'Backlog' : col === 'in_progress' ? 'In Progress' : 'Done'}
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                      {(tasksByEpic[e.id] ?? []).filter((t) => t.status === col).map((t) => (
                                        <li
                                          key={t.id}
                                          className={`task ${col}`}
                                          draggable
                                          onDragStart={handleDragStart(t.id)}
                                        >
                                          {t.title}
                                          <div style={{ display: 'inline-flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                                            {col !== 'backlog' ? (
                                              <button type="button" onClick={() => moveTask(t.id, col === 'done' ? 'in_progress' : 'backlog')}>
                                                ←
                                              </button>
                                            ) : null}
                                            {col !== 'done' ? (
                                              <button type="button" onClick={() => moveTask(t.id, col === 'backlog' ? 'in_progress' : 'done')}>
                                                →
                                              </button>
                                            ) : null}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                              <form onSubmit={handleCreateTask(e.id)} style={{ marginTop: '0.5rem' }}>
                                <label>
                                  <span>Task title</span>
                                  <input
                                    type="text"
                                    placeholder="New task"
                                    value={newTaskTitleByEpic[e.id] ?? ''}
                                    onChange={(ev: ChangeEvent<HTMLInputElement>) =>
                                      setNewTaskTitleByEpic((prev) => ({ ...prev, [e.id]: ev.target.value }))
                                    }
                                    required
                                  />
                                </label>
                                <label>
                                  <span>Description (optional)</span>
                                  <input
                                    type="text"
                                    placeholder="Short description"
                                    value={newTaskDescriptionByEpic[e.id] ?? ''}
                                    onChange={(ev: ChangeEvent<HTMLInputElement>) =>
                                      setNewTaskDescriptionByEpic((prev) => ({ ...prev, [e.id]: ev.target.value }))
                                    }
                                  />
                                </label>
                                <button type="submit">Add task</button>
                              </form>
                            </div>
                          ))}
                        </div>
                      )}
                      <form onSubmit={handleCreateEpic(p.id)} style={{ marginTop: '0.5rem' }}>
                        <label>
                          <span>Epic name</span>
                          <input
                            type="text"
                            placeholder="First epic"
                            value={newEpicNameByProject[p.id] ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setNewEpicNameByProject((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            required
                          />
                        </label>
                        <label>
                          <span>Description (optional)</span>
                          <input
                            type="text"
                            placeholder="Short description"
                            value={newEpicDescriptionByProject[p.id] ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setNewEpicDescriptionByProject((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                          />
                        </label>
                        <button type="submit">Add epic</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleCreateProject} style={{ marginTop: '1rem' }}>
              <label>
                <span>Project name</span>
                <input
                  type="text"
                  placeholder="My first project"
                  value={newProjectName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>Description (optional)</span>
                <input
                  type="text"
                  placeholder="Short description"
                  value={newProjectDescription}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewProjectDescription(e.target.value)}
                />
              </label>
              <button type="submit">Create project</button>
            </form>
          </section>
        </section>
      )}
    </main>
  );
}

export default App;

