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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
    if (!showUserDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  useEffect(() => {
    if (!showMobileMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-menu-container') && !target.closest('.mobile-menu-dropdown')) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMenu]);

  useEffect(() => {
    if (!showMobileMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMenu]);

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
      <header className="app-header">
        {/* Desktop header */}
        <div className="desktop-header">
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
            <div className="user-dropdown-container">
              <button
                type="button"
                className="user-dropdown-toggle"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                {auth.user.displayName}
              </button>
              {showUserDropdown && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-item-wrapper">
                    <div className="user-dropdown-item user-name-display">
                      {auth.user.displayName}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="user-dropdown-item user-dropdown-logout"
                    onClick={() => {
                      setShowUserDropdown(false);
                      void handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile header */}
        <div className="mobile-header">
          <div className="mobile-menu-container">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            {showMobileMenu && (
              <>
                <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)}></div>
                <div className="mobile-menu-dropdown">
                <div className="mobile-menu-content">
                  {/* Current project */}
                  {current && (
                    <div className="mobile-menu-section">
                      {editingProjectId === current.id ? (
                        <input
                          type="text"
                          className="mobile-menu-edit-input"
                          value={editingProjectNameDraft}
                          onChange={(e) => setEditingProjectNameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (editingProjectNameDraft.trim()) {
                                void updateProject(current.id, editingProjectNameDraft.trim());
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
                              void updateProject(current.id, editingProjectNameDraft.trim());
                            }
                            setEditingProjectId(null);
                            setEditingProjectNameDraft('');
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="mobile-menu-project-current-wrapper">
                          <div className="mobile-menu-project-current">
                            <strong>{current.name}</strong>
                          </div>
                          <button
                            type="button"
                            className="mobile-menu-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProjectId(current.id);
                              setEditingProjectNameDraft(current.name);
                            }}
                            title="Rename project"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="mobile-menu-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete project "${current.name}"? This will delete all epics and tasks.`)) {
                                void deleteProject(current.id);
                                setShowMobileMenu(false);
                              }
                            }}
                            title="Delete project"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Other projects */}
                  {projects.filter(p => p.id !== selectedProjectId).length > 0 && (
                    <div className="mobile-menu-section">
                      {projects.filter(p => p.id !== selectedProjectId).map(p => (
                        <div key={p.id} className="mobile-menu-project-wrapper">
                          {editingProjectId === p.id ? (
                            <input
                              type="text"
                              className="mobile-menu-edit-input"
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
                                className="mobile-menu-item mobile-menu-project-name"
                                onClick={() => {
                                  setSelectedProjectId(p.id);
                                  setShowMobileMenu(false);
                                }}
                              >
                                {p.name}
                              </button>
                              <button
                                type="button"
                                className="mobile-menu-edit"
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
                                type="button"
                                className="mobile-menu-delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete project "${p.name}"? This will delete all epics and tasks.`)) {
                                    void deleteProject(p.id);
                                    setShowMobileMenu(false);
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
                    </div>
                  )}
                  
                  {/* Separator */}
                  <div className="mobile-menu-separator"></div>
                  
                  {/* User name */}
                  <div className="mobile-menu-section">
                    <div className="mobile-menu-user">
                      {auth.user.displayName}
                    </div>
                  </div>
                  
                  {/* Logout */}
                  <div className="mobile-menu-section">
                    <button
                      type="button"
                      className="mobile-menu-item mobile-menu-logout"
                      onClick={() => {
                        setShowMobileMenu(false);
                        void handleLogout();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
          {selectedProjectId && (
            <button 
              type="button" 
              className="mobile-add-epic-btn" 
              onClick={() => setShowEpicModal(true)}
              aria-label="Add epic"
            >
              +
            </button>
          )}
        </div>
      </header>

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

export function InlineText(props: { value: string; placeholder?: string; onChange: (val: string) => void; editable?: boolean; className?: string; multiline?: boolean; onClick?: (e: React.MouseEvent) => void; onEditingChange?: (editing: boolean) => void; onSave?: () => void; maxLength?: number; onTab?: (shift: boolean) => void; enterBehavior?: 'save' | 'newline'; textareaRef?: React.RefObject<HTMLTextAreaElement>; dragListeners?: any; dragAttributes?: any }) {
  const [val, setVal] = useState(props.value);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const clickPositionRef = useRef<number | null>(null);
  const initialHeightRef = useRef<number | null>(null);
  const cursorPositionRef = useRef<number | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const pendingClickRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  
  useEffect(() => { setVal(props.value); }, [props.value]);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (props.multiline && isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // If we have an initial height from the span, use it to prevent jumping
      if (initialHeightRef.current !== null) {
        const savedHeight = initialHeightRef.current;
        console.log('[InlineText] useEffect - setting height:', savedHeight);
        // Set initial height to match span immediately - don't let it shrink
        textarea.style.minHeight = `${savedHeight}px`;
        textarea.style.height = `${savedHeight}px`;
        // After rendering, check if content needs more space, but keep minHeight
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (textareaRef.current && initialHeightRef.current !== null) {
              const savedHeight = initialHeightRef.current;
              initialHeightRef.current = null; // Clear after first use
              // Measure scrollHeight - minHeight will prevent shrinking
              textareaRef.current.style.height = 'auto';
              const scrollHeight = textareaRef.current.scrollHeight;
              console.log('[InlineText] scrollHeight:', scrollHeight, 'savedHeight:', savedHeight);
              // Use the larger value, but never shrink below original
              const finalHeight = Math.max(savedHeight, scrollHeight);
              textareaRef.current.style.height = `${finalHeight}px`;
              // Keep minHeight to prevent any shrinking
              textareaRef.current.style.minHeight = `${savedHeight}px`;
              console.log('[InlineText] Final height set to:', finalHeight);
            }
          });
        });
      } else {
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
  
  // Set cursor position for textarea after it's rendered and height is set
  useEffect(() => {
    if (props.multiline && isEditing && textareaRef.current && cursorPositionRef.current !== null) {
      const pos = cursorPositionRef.current;
      cursorPositionRef.current = null; // Clear after use
      // Use multiple requestAnimationFrame to ensure textarea is fully rendered and height is set
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              const maxPos = textareaRef.current.value.length;
              const finalPos = Math.min(pos, maxPos);
              textareaRef.current.setSelectionRange(finalPos, finalPos);
              textareaRef.current.focus();
            }
          });
        });
      });
    }
  }, [isEditing, props.multiline]);
  
  const commit = (next: string) => { props.onChange(next); };
  const schedule = (next: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { commit(next); }, 10000);
  };
  
  if (props.multiline) {
    if (isEditing) {
      return (
        <textarea
          ref={(el) => {
            textareaRef.current = el;
            if (props.textareaRef) {
              (props.textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            }
            // Set height immediately when textarea is mounted if we have saved height
            if (el && initialHeightRef.current !== null) {
              const savedHeight = initialHeightRef.current;
              console.log('[InlineText] Setting initial height in ref callback:', savedHeight);
              el.style.minHeight = `${savedHeight}px`;
              el.style.height = `${savedHeight}px`;
            }
          }}
          className={props.className}
          value={val}
          placeholder={props.placeholder}
          style={{
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
            boxSizing: 'border-box',
            minHeight: initialHeightRef.current !== null ? `${initialHeightRef.current}px` : undefined,
            height: initialHeightRef.current !== null ? `${initialHeightRef.current}px` : undefined
          } as React.CSSProperties}
          onChange={(e) => { 
            let next = e.target.value;
            // Enforce maxLength if specified
            if (props.maxLength !== undefined && next.length > props.maxLength) {
              next = next.slice(0, props.maxLength);
            }
            setVal(next); 
            schedule(next);
            // Auto-resize on change
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          maxLength={props.maxLength}
          onBlur={() => { 
            if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; } 
            commit(val);
            setIsEditing(false);
            if (props.onEditingChange) props.onEditingChange(false);
          }}
          onKeyDown={(e) => {
            e.stopPropagation(); // Prevent drag from starting
            if (e.key === 'Tab') {
              // Tab: save and move to next/previous note
              e.preventDefault();
              if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
              commit(val);
              setIsEditing(false);
              if (props.onEditingChange) props.onEditingChange(false);
              (e.target as HTMLTextAreaElement).blur();
              if (props.onTab) {
                props.onTab(e.shiftKey);
              }
              return;
            }
            if (e.key === 'Enter') {
              const enterBehavior = props.enterBehavior || 'save';
              if (enterBehavior === 'newline') {
                // Enter: insert newline (for tasks)
                const textarea = e.target as HTMLTextAreaElement;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = textarea.value;
                const newValue = currentValue.slice(0, start) + '\n' + currentValue.slice(end);
                // Check maxLength
                if (props.maxLength === undefined || newValue.length <= props.maxLength) {
                  setVal(newValue);
                  schedule(newValue);
                  // Set cursor position after the newline
                  requestAnimationFrame(() => {
                    textarea.setSelectionRange(start + 1, start + 1);
                    // Auto-resize
                    textarea.style.height = 'auto';
                    textarea.style.height = `${textarea.scrollHeight}px`;
                  });
                }
                e.preventDefault();
                return;
              } else {
                // Enter: save and exit (default behavior for other inputs)
                e.preventDefault();
                if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
                commit(val);
                setIsEditing(false);
                if (props.onEditingChange) props.onEditingChange(false);
                (e.target as HTMLTextAreaElement).blur();
                if (props.onSave) {
                  // Call onSave after a brief delay to ensure blur completes
                  setTimeout(() => {
                    props.onSave!();
                  }, 10);
                }
              }
            }
          }}
          onClick={props.onClick}
          autoFocus
        />
      );
    }
    return (
      <span
        ref={spanRef}
        className={props.className}
        {...(props.dragAttributes || {})}
        {...(props.dragListeners || {})}
        style={{ 
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
        } as React.CSSProperties}
        onDoubleClick={(e) => {
          // Prevent drag from starting on double-click
          e.stopPropagation();
          // Double-click to enter edit mode (single click is for drag)
          if (!props.editable || isEditing) return;
          if (props.onClick) props.onClick(e);
          
          const currentSpan = spanRef.current;
          if (!currentSpan) return;
          
          const clickX = e.clientX;
          const clickY = e.clientY;
          
          // Calculate cursor position at click point
          let charIndex = currentSpan.textContent?.length || 0;
          
          // Helper to calculate text offset by walking the DOM tree
          const calculateTextOffset = (targetNode: Node, targetOffset: number): number => {
            const walker = document.createTreeWalker(
              currentSpan,
              NodeFilter.SHOW_TEXT,
              null
            );
            let count = 0;
            let node: Node | null;
            while (node = walker.nextNode()) {
              if (node === targetNode && node.nodeType === Node.TEXT_NODE) {
                return count + targetOffset;
              }
              count += node.textContent?.length || 0;
            }
            return count;
          };
          
          if (document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(clickX, clickY);
            if (range) {
              if (range.startContainer.nodeType === Node.TEXT_NODE) {
                charIndex = calculateTextOffset(range.startContainer, range.startOffset);
              } else {
                if (range.startContainer.childNodes.length > range.startOffset) {
                  const childNode = range.startContainer.childNodes[range.startOffset];
                  if (childNode && childNode.nodeType === Node.TEXT_NODE) {
                    charIndex = calculateTextOffset(childNode, 0);
                  } else {
                    const rangeFromStart = document.createRange();
                    rangeFromStart.setStart(currentSpan, 0);
                    rangeFromStart.setEnd(range.startContainer, range.startOffset);
                    charIndex = rangeFromStart.toString().length;
                  }
                } else {
                  const rangeFromStart = document.createRange();
                  rangeFromStart.setStart(currentSpan, 0);
                  rangeFromStart.setEnd(range.startContainer, 0);
                  charIndex = rangeFromStart.toString().length;
                }
              }
            }
          } else if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(clickX, clickY);
            if (pos && pos.offsetNode) {
              if (pos.offsetNode.nodeType === Node.TEXT_NODE) {
                charIndex = calculateTextOffset(pos.offsetNode, pos.offset);
              } else {
                try {
                  const rangeFromStart = document.createRange();
                  rangeFromStart.setStart(currentSpan, 0);
                  if (pos.offsetNode.childNodes.length > pos.offset) {
                    const childNode = pos.offsetNode.childNodes[pos.offset];
                    if (childNode && childNode.nodeType === Node.TEXT_NODE) {
                      rangeFromStart.setEnd(childNode, 0);
                    } else {
                      rangeFromStart.setEnd(pos.offsetNode, pos.offset);
                    }
                  } else {
                    rangeFromStart.setEnd(pos.offsetNode, 0);
                  }
                  charIndex = rangeFromStart.toString().length;
                } catch (err) {
                  charIndex = calculateTextOffset(pos.offsetNode, 0);
                }
              }
            }
          } else {
            // Fallback for multiline text
            const text = currentSpan.textContent || '';
            const rect = currentSpan.getBoundingClientRect();
            const relativeX = clickX - rect.left;
            const relativeY = clickY - rect.top;
            const style = window.getComputedStyle(currentSpan);
            const font = `${style.fontSize} ${style.fontFamily}`;
            const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
              context.font = font;
              const lineNumber = Math.floor(relativeY / lineHeight);
              const lines = text.split('\n');
              let charCount = 0;
              for (let i = 0; i < lineNumber && i < lines.length; i++) {
                charCount += lines[i].length + 1;
              }
              if (lineNumber < lines.length) {
                const lineText = lines[lineNumber];
                for (let i = 0; i < lineText.length; i++) {
                  const width = context.measureText(lineText.substring(0, i + 1)).width;
                  if (width > relativeX) {
                    charIndex = charCount + i;
                    break;
                  }
                }
                if (charIndex === charCount) {
                  charIndex = charCount + lineText.length;
                }
              } else {
                charIndex = text.length;
              }
            }
          }
          
          // Store cursor position (use cursorPositionRef for multiline, clickPositionRef for single-line)
          if (props.multiline) {
            cursorPositionRef.current = charIndex;
          } else {
            clickPositionRef.current = charIndex;
          }
          
          // Enter edit mode with correct cursor position
          setIsEditing(true);
          if (props.onEditingChange) props.onEditingChange(true);
        }}
      >
        {val ? val : <span style={{ opacity: 0.5 }}>{props.placeholder}</span>}
      </span>
    );
  }
  
  // Single-line input (for epic titles)
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={props.className}
        value={val}
        placeholder={props.placeholder}
        style={{
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
        }}
        onChange={(e) => { const next = e.target.value; setVal(next); schedule(next); }}
        onBlur={() => { 
          if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; } 
          commit(val);
          setIsEditing(false);
          if (props.onEditingChange) props.onEditingChange(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
            commit(val);
            setIsEditing(false);
            if (props.onEditingChange) props.onEditingChange(false);
            (e.target as HTMLInputElement).blur();
            if (props.onSave) {
              // Call onSave after a brief delay to ensure blur completes
              setTimeout(() => props.onSave!(), 0);
            }
          } else if (e.key === 'Escape') {
            setVal(props.value);
            setIsEditing(false);
            if (props.onEditingChange) props.onEditingChange(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        autoFocus
      />
    );
  }
  
  return (
    <span
      ref={spanRef}
      className={props.className}
      onClick={(e) => {
        if (!props.editable) return;
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
        if (props.onEditingChange) props.onEditingChange(true);
      }}
      style={{ 
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
      }}
    >
      {val ? val : <span style={{ opacity: 0.5 }}>{props.placeholder}</span>}
    </span>
  );
}


