import React, { useMemo, useState } from 'react';
import type { TaskResponse } from '@sandrocket/contracts';

interface DoneArchiveProps {
  epics: Array<{ id: number; name: string }>;
  tasksByEpic: Record<number, TaskResponse[]>;
  onRestore: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onGoToEpic: (epicId: number) => void;
}

function formatDoneTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function DoneArchive(props: DoneArchiveProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const doneItems = useMemo(() => {
    const items: Array<{ task: TaskResponse; epicName: string; epicId: number }> = [];
    for (const epic of props.epics) {
      for (const task of props.tasksByEpic[epic.id] ?? []) {
        if (task.status === 'done') {
          items.push({ task, epicName: epic.name, epicId: epic.id });
        }
      }
    }
    return items.sort((a, b) => b.task.updatedAt.localeCompare(a.task.updatedAt));
  }, [props.epics, props.tasksByEpic]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doneItems;
    return doneItems.filter(
      (item) =>
        item.task.description.toLowerCase().includes(q) ||
        item.epicName.toLowerCase().includes(q)
    );
  }, [doneItems, query]);

  if (doneItems.length === 0 && !open) {
    return (
      <div id="board-done" className="done-archive-section board-section">
        <div className="done-archive-accordion done-archive-accordion-empty">
          <button
            type="button"
            className="done-archive-toggle"
            onClick={() => setOpen(true)}
            aria-expanded={open}
          >
            <span className="done-archive-toggle-label">Done archive</span>
            <span className="done-archive-count">0</span>
            <span className="done-archive-caret" aria-hidden>
              ▸
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="board-done" className="done-archive-section board-section">
      <div className={`done-archive-accordion${open ? ' done-archive-accordion-open' : ''}`}>
        <button
          type="button"
          className="done-archive-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="done-archive-toggle-label">Done archive</span>
          <span className="done-archive-count">{doneItems.length}</span>
          <span className="done-archive-caret" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </button>
        {open && (
          <div className="done-archive-body">
            <input
              type="search"
              className="done-archive-search"
              placeholder="Search done tasks or epics…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search done tasks"
            />
            {filtered.length === 0 ? (
              <p className="done-archive-empty">
                {query.trim() ? 'No done tasks match your search.' : 'No done tasks yet.'}
              </p>
            ) : (
              <ul className="done-archive-list">
                {filtered.map(({ task, epicName, epicId }) => (
                  <li key={task.id} className="done-archive-item">
                    <div className="done-archive-item-main">
                      <span className="done-archive-epic">{epicName}</span>
                      <span className="done-archive-desc">{task.description}</span>
                      <span className="done-archive-time">{formatDoneTime(task.updatedAt)}</span>
                    </div>
                    <div className="done-archive-item-actions">
                      <button
                        type="button"
                        className="done-archive-action-btn"
                        onClick={() => props.onGoToEpic(epicId)}
                        title="Go to epic"
                        aria-label={`Go to epic ${epicName}`}
                      >
                        ↗
                      </button>
                      <button
                        type="button"
                        className="done-archive-action-btn"
                        onClick={() => props.onRestore(task.id)}
                        title="Restore to active tasks"
                        aria-label="Restore task"
                      >
                        ↩
                      </button>
                      <button
                        type="button"
                        className="done-archive-action-btn done-archive-delete-btn"
                        onClick={() => props.onDelete(task.id)}
                        title="Delete task"
                        aria-label="Delete task"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
