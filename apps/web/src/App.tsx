import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AuthSuccessResponse, ListProjectsResponse, TaskResponse } from '@sandrocket/contracts';
import { Login } from './components/Login';
import { Modal } from './components/Modal';
import { EpicLane } from './EpicLane';
import './styles.css';

const DEFAULT_BASE_URL = '/api';
const SELECTED_PROJECT_KEY = 'sr:selectedProjectId';

type UiTask = TaskResponse;

export default function App() {
  const baseUrl = useMemo(() => {
    const b = (import.meta as any).env?.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
    if (typeof window !== 'undefined' && window.location && window.location.port === '3000' && typeof b === 'string' && b.startsWith('/')) {
      // In dev, ensure we talk to the API port directly if proxy isn't rewriting
      return `${window.location.protocol}//localhost:9000${b}`;
    }
    return b as string;
  }, []);
  const [auth, setAuth] = useState<AuthSuccessResponse | null>(null);
  const [projects, setProjects] = useState<ListProjectsResponse['projects']>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [epicsByProject, setEpicsByProject] = useState<Record<number, { id: number; name: string; description: string | null }[]>>({});
  const [tasksByEpic, setTasksByEpic] = useState<Record<number, UiTask[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');
  const [editingProjectNameDraft, setEditingProjectNameDraft] = useState<string>('');
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
        if (!response.ok) return;
        const data = (await response.json()) as AuthSuccessResponse;
        setAuth(data);
      } catch {}
    };
    hydrate();
  }, [baseUrl]);

  useEffect(() => {
    if (!showProjectDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.project-dropdown-container')) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProjectDropdown]);

  useEffect(() => {
    if (!auth) return;
    const run = async () => {
      const res = await fetch(`${baseUrl}/projects`, { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as ListProjectsResponse;
      setProjects(data.projects);
      if (data.projects.length > 0) {
        const stored = window.localStorage.getItem(SELECTED_PROJECT_KEY);
        const storedId = stored ? Number(stored) : null;
        if (storedId && data.projects.some(p => p.id === storedId)) {
          setSelectedProjectId(storedId);
        } else {
          setSelectedProjectId(data.projects[0]!.id);
        }
      }
    };
    run();
  }, [auth, baseUrl]);

  useEffect(() => {
    if (!auth || !selectedProjectId) return;
    window.localStorage.setItem(SELECTED_PROJECT_KEY, String(selectedProjectId));
    const run = async () => {
      const res = await fetch(`${baseUrl}/projects/${selectedProjectId}/epics`, { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as { epics: { id: number; projectId: number; name: string; description: string | null }[] };
      setEpicsByProject(prev => ({ ...prev, [selectedProjectId]: data.epics }));
      for (const e of data.epics) {
        const tr = await fetch(`${baseUrl}/epics/${e.id}/tasks`, { credentials: 'include' });
        if (!tr.ok) continue;
        const td = (await tr.json()) as { tasks: TaskResponse[] };
        setTasksByEpic(prev => ({
          ...prev,
          [e.id]: td.tasks
        }));
      }
    };
    run();
  }, [auth, baseUrl, selectedProjectId]);

  useEffect(() => {
    if (!auth) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as AuthSuccessResponse;
        setAuth(prev => {
          if (!prev) return data;
          if (prev.user.id === data.user.id && prev.token !== data.token) {
            return { ...prev, token: data.token };
          }
          return prev;
        });
      } catch {}
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

  const createTask = async (epicId: number, description: string) => {
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
    const created = (await res.json()) as TaskResponse;
    setTasksByEpic(prev => {
      const list = prev[epicId] ?? [];
      return {
        ...prev,
        [epicId]: [...list, created]
      };
    });
  };

  const updateTask = async (id: number, fields: Partial<Pick<TaskResponse, 'description' | 'status'>>) => {
    const res = await fetch(`${baseUrl}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(fields)
    });
    if (!res.ok) return;
    const epicId = Object.values(tasksByEpic).flat().find(t => t.id === id)?.epicId;
    if (!epicId) return;
    setTasksByEpic(prev => {
      const list = prev[epicId] ?? [];
      const updated = list.map(t => {
        if (t.id !== id) return t;
        const nt: UiTask = {
          ...t,
          description: fields.description !== undefined ? fields.description : t.description,
          status: fields.status !== undefined ? (fields.status as UiTask['status']) : t.status
        };
        return nt;
      });
      return { ...prev, [epicId]: updated };
    });
  };

  const deleteTask = async (id: number) => {
    const res = await fetch(`${baseUrl}/tasks/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) return;
    const epicId = Object.values(tasksByEpic).flat().find(t => t.id === id)?.epicId;
    if (!epicId) return;
    setTasksByEpic(prev => {
      const list = prev[epicId] ?? [];
      return { ...prev, [epicId]: list.filter(t => t.id !== id) };
    });
  };

  const reorderTask = async (taskId: number, epicId: number, position: number) => {
    // Optimistic update
    setTasksByEpic(prev => {
      const list = prev[epicId] ?? [];
      const task = list.find(t => t.id === taskId);
      if (!task) return prev;
      
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
        const td = (await tr.json()) as { tasks: TaskResponse[] };
        setTasksByEpic(prev => ({
          ...prev,
          [epicId]: td.tasks
        }));
      }
    } else {
      const updated = (await res.json()) as TaskResponse;
      setTasksByEpic(prev => {
        const list = prev[epicId] ?? [];
        const newList = list.map(t => t.id === taskId ? updated : t)
          .sort((a, b) => a.position - b.position);
        return { ...prev, [epicId]: newList };
      });
    }
  };

  const createProject = async (name: string, description?: string) => {
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
    const created = (await res.json()) as { id: number; name: string; description: string | null; createdAt: string; updatedAt: string };
    setProjects(prev => [...prev, created]);
    setSelectedProjectId(created.id);
    setShowProjectModal(false);
    setNewProjectName('');
    setNewProjectDesc('');
  };

  const createEpic = async (projectId: number, name: string, description?: string) => {
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
    const ep = (await res.json()) as { id: number; projectId: number; name: string; description: string | null; createdAt: string; updatedAt: string };
    setEpicsByProject(prev => {
      const list = prev[projectId] ?? [];
      return { ...prev, [projectId]: [...list, { id: ep.id, name: ep.name, description: ep.description }] };
    });
    setTasksByEpic(prev => ({ ...prev, [ep.id]: [] }));
  };
  const updateEpic = async (id: number, fields: { name?: string; description?: string | null }) => {
    const res = await fetch(`${baseUrl}/epics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(fields)
    });
    if (!res.ok || !selectedProjectId) return;
    setEpicsByProject(prev => {
      const list = prev[selectedProjectId] ?? [];
      const updated = list.map(e => {
        if (e.id !== id) return e;
        return {
          ...e,
          name: fields.name !== undefined ? fields.name : e.name,
          description: fields.description !== undefined ? fields.description : e.description
        };
      });
      return { ...prev, [selectedProjectId]: updated };
    });
  };

  const deleteEpic = async (id: number) => {
    const res = await fetch(`${baseUrl}/epics/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok || !selectedProjectId) return;
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

  const deleteProject = async (id: number) => {
    const res = await fetch(`${baseUrl}/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProjectId === id) {
      const remaining = projects.filter(p => p.id !== id);
      setSelectedProjectId(remaining.length > 0 ? remaining[0]!.id : null);
    }
    setEpicsByProject(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const updateProject = async (id: number, name: string) => {
    const res = await fetch(`${baseUrl}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name })
    });
    if (!res.ok) return;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  if (!auth) {
    return <Login baseUrl={baseUrl} onSuccess={setAuth} />;
  }

  const current = projects.find(p => p.id === selectedProjectId) ?? null;

  return (
    <main className="dashboard">
      <div className="tabs-header">
        <div className="project-dropdown-container">
          <button
            type="button"
            className="project-dropdown-toggle"
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
          >
            <span>{current?.name ?? 'Select project'}</span>
            <span className="dropdown-arrow">▼</span>
          </button>
            {showProjectDropdown && (
              <div className="project-dropdown-menu">
                {projects.map(p => (
                  <div key={p.id} className="project-dropdown-item-wrapper">
                    {editingProjectId === p.id ? (
                      <input
                        type="text"
                        className="project-dropdown-edit-input"
                        value={editingProjectNameDraft}
                        onChange={(e) => setEditingProjectNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (editingProjectNameDraft.trim()) {
                              void updateProject(p.id, editingProjectNameDraft.trim());
                            }
                            setEditingProjectId(null);
                            setEditingProjectNameDraft('');
                          } else if (e.key === 'Escape') {
                            setEditingProjectId(null);
                            setEditingProjectNameDraft('');
                          }
                        }}
                        onBlur={() => {
                          if (editingProjectNameDraft.trim()) {
                            void updateProject(p.id, editingProjectNameDraft.trim());
                          }
                          setEditingProjectId(null);
                          setEditingProjectNameDraft('');
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`project-dropdown-item ${selectedProjectId === p.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedProjectId(p.id);
                            setShowProjectDropdown(false);
                          }}
                        >
                          {p.name}
                        </button>
                        <button
                          className="project-dropdown-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProjectId(p.id);
                            setEditingProjectNameDraft(p.name);
                          }}
                          title="Rename project"
                        >
                          ✎
                        </button>
                        <button
                          className="project-dropdown-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete project "${p.name}"? This will delete all epics and tasks.`)) {
                              void deleteProject(p.id);
                            }
                          }}
                          title="Delete project"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              <button
                type="button"
                className="project-dropdown-item project-dropdown-add"
                onClick={() => {
                  setShowProjectModal(true);
                  setShowProjectDropdown(false);
                }}
              >
                + New Project
              </button>
            </div>
          )}
        </div>
        {selectedProjectId && (
          <button type="button" className="btn-ghost btn-epic" onClick={() => setShowEpicModal(true)}>+ Epic</button>
        )}
        <div className="user-actions">
          <span>{auth.user.displayName}</span>
          <button type="button" onClick={handleLogout} className="btn-ghost">Logout</button>
        </div>
      </div>

      <section className="board">
        {!current ? (
          <div className="card">No project selected</div>
        ) : (
          <div className="epic-columns">
            {(epicsByProject[current.id] ?? []).map((e) => (
              <EpicLane
                key={e.id}
                epic={e}
                tasks={tasksByEpic[e.id] ?? []}
                baseUrl={baseUrl}
                onInlineUpdate={(id, fields) => updateTask(id, fields)}
                onReorder={(taskId, position) => reorderTask(taskId, e.id, position)}
                onDeleteTask={(id) => deleteTask(id)}
                onCreateTask={(epicId, description) => createTask(epicId, description)}
                onEpicUpdate={(id, fields) => updateEpic(id, fields)}
                onDeleteEpic={(id) => deleteEpic(id)}
                currentUserId={auth.user.id}
              />
            ))}
          </div>
        )}
      </section>

      {error ? <p className="error">{error}</p> : null}
      {/* Project creation modal */}
      <Modal
        isOpen={showProjectModal}
        title="Create project"
        onClose={() => { setShowProjectModal(false); setNewProjectName(''); setNewProjectDesc(''); }}
        footer={(
          <>
            <button className="btn-ghost" type="button" onClick={() => { setShowProjectModal(false); setNewProjectName(''); setNewProjectDesc(''); }}>Cancel</button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => {
                if (!newProjectName.trim()) return;
                void createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
              }}
            >
              Create
            </button>
          </>
        )}
      >
        <label>
          <span>Name</span>
          <input value={newProjectName} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)} />
        </label>
        <label>
          <span>Description (optional)</span>
          <input value={newProjectDesc} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewProjectDesc(e.target.value)} />
        </label>
      </Modal>
      {/* Epic creation modal */}
      <Modal
        isOpen={showEpicModal}
        title="Create epic"
        onClose={() => { setShowEpicModal(false); setNewEpicName(''); setNewEpicDesc(''); }}
        footer={(
          <>
            <button className="btn-ghost" type="button" onClick={() => { setShowEpicModal(false); }}>Cancel</button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => {
                const n = newEpicName.trim();
                if (!n || !selectedProjectId) return;
                void (async () => {
                  await createEpic(selectedProjectId, n, newEpicDesc.trim() || undefined);
                  setShowEpicModal(false);
                  setNewEpicName('');
                  setNewEpicDesc('');
                })();
              }}
            >
              Create
            </button>
          </>
        )}
      >
        <label>
          <span>Title</span>
          <input value={newEpicName} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewEpicName(e.target.value)} placeholder="Epic title" />
        </label>
        <label>
          <span>Backlog (optional)</span>
          <textarea 
            value={newEpicDesc} 
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewEpicDesc(e.target.value)} 
            placeholder="Add backlog notes, ideas, or context..."
            rows={4}
          />
        </label>
      </Modal>
    </main>
  );
}


// TaskGroup removed: unified flat list per epic

export function InlineText(props: { value: string; placeholder?: string; onChange: (val: string) => void; editable?: boolean; className?: string; multiline?: boolean }) {
  const [val, setVal] = useState(props.value);
  const debounceRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  useEffect(() => { setVal(props.value); }, [props.value]);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (props.multiline && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [val, props.multiline]);
  
  const commit = (next: string) => { props.onChange(next); };
  const schedule = (next: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { commit(next); }, 10000);
  };
  
  if (props.multiline) {
    return (
      <textarea
        ref={textareaRef}
        className={props.className}
        value={val}
        placeholder={props.placeholder}
        rows={1}
        onChange={(e) => { 
          const next = e.target.value; 
          setVal(next); 
          schedule(next);
          // Auto-resize on change
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onBlur={() => { if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; } commit(val); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
            commit(val);
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
      />
    );
  }
  return (
    <input
      className={props.className}
      value={val}
      placeholder={props.placeholder}
      onChange={(e) => { const next = e.target.value; setVal(next); schedule(next); }}
      onBlur={() => { if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; } commit(val); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
          commit(val);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}


