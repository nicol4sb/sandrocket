import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskResponse } from '@sandrocket/contracts';
import { InlineText } from './App';

// Re-export InlineText type for EpicLane usage

type UiTask = TaskResponse;

function TaskInfo(props: { task: UiTask; currentUserId: number }) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getUserLabel = (userId: number) => {
    return userId === props.currentUserId ? 'You' : `User ${userId}`;
  };

  const colors = ['#2250f4', '#6a4bff', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#95e1d3'];
  const creatorColor = colors[props.task.creatorUserId % colors.length];
  const editorColor = props.task.lastEditedByUserId ? colors[props.task.lastEditedByUserId % colors.length] : creatorColor;
  const wasEdited = props.task.lastEditedByUserId && props.task.lastEditedByUserId !== props.task.creatorUserId;
  const isCurrentUserCreator = props.task.creatorUserId === props.currentUserId;
  const isCurrentUserEditor = props.task.lastEditedByUserId === props.currentUserId;

  return (
    <div className="task-info" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(13, 18, 36, 0.5)' }}>
      <span
        className="creator-badge"
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: creatorColor,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.6rem',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
          border: isCurrentUserCreator ? '1px solid #2250f4' : 'none'
        }}
        title={`Created by ${getUserLabel(props.task.creatorUserId)}`}
      >
        {isCurrentUserCreator ? 'Y' : String(props.task.creatorUserId).slice(-1)}
      </span>
      {wasEdited && (
        <>
          <span style={{ color: 'rgba(13, 18, 36, 0.25)', fontSize: '0.65rem' }}>→</span>
          <span
            className="editor-badge"
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: editorColor,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6rem',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              border: isCurrentUserEditor ? '1px solid #2250f4' : 'none'
            }}
            title={`Last edited by ${getUserLabel(props.task.lastEditedByUserId!)}`}
          >
            {isCurrentUserEditor ? 'Y' : String(props.task.lastEditedByUserId).slice(-1)}
          </span>
        </>
      )}
      <span style={{ whiteSpace: 'nowrap' }}>{formatTime(props.task.updatedAt)}</span>
    </div>
  );
}

function SortableTask(props: {
  task: UiTask;
  focusIds: number[];
  editContentId: number | null;
  editingContentDraft: string;
  onEditContent: (id: number, draft: string) => void;
  onCommitContent: (id: number, value: string) => void;
  onSetEditContent: (id: number | null, draft: string) => void;
  onDelete: (id: number) => void;
  currentUserId: number;
  onSave?: () => void;
}) {
  const [isTaskEditing, setIsTaskEditing] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: props.task.id,
    disabled: isTaskEditing // Disable drag when editing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  // Only apply drag listeners when not editing
  const dragListeners = isTaskEditing ? {} : listeners;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`task ${props.focusIds.includes(props.task.id) ? 'focus' : ''} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...dragListeners}
    >
      <InlineText
        value={props.task.description}
        onChange={(v) => {
          props.onCommitContent(props.task.id, v);
        }}
        editable
        multiline
        className="content"
        onClick={(e) => e.stopPropagation()}
        onEditingChange={setIsTaskEditing}
        onSave={props.onSave}
      />
      {!isTaskEditing && (
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete(props.task.id);
          }}
          title="Delete task"
        >
          ×
        </button>
      )}
    </li>
  );
}

function DroppableZone(props: { id: string; className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: props.id });
  return (
    <div ref={setNodeRef} className={`${props.className} ${isOver ? 'drag-over' : ''}`} style={{ marginBottom: '0.75rem' }}>
      {props.children}
    </div>
  );
}

export function EpicLane(props: {
  epic: { id: number; name: string; description: string | null };
  tasks: UiTask[];
  baseUrl: string;
  onInlineUpdate: (id: number, fields: Partial<Pick<TaskResponse, 'description'>>) => void;
  onReorder: (taskId: number, position: number) => void;
  onDeleteTask: (id: number) => void;
  onEpicUpdate: (id: number, fields: { name?: string; description?: string | null }) => void;
  onCreateTask: (epicId: number, description: string) => void;
  onDeleteEpic?: (id: number) => void;
  currentUserId: number;
}) {
  const [editContentId, setEditContentId] = useState<number | null>(null);
  const [editingContentDraft, setEditingContentDraft] = useState<string>('');
  const [newTaskDraft, setNewTaskDraft] = useState<string>('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const contentTimerRef = useRef<number | null>(null);
  const emptyTaskTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedTasks = [...props.tasks].sort((a, b) => a.position - b.position);
  const taskIds = sortedTasks.map(t => t.id);
  const focusIds = sortedTasks.slice(0, 3).map(t => t.id);
  const activeTask = activeId ? props.tasks.find(t => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdNum = active.id as number;
    const overId = over.id as number;
    
    // Find positions
    const activeIndex = sortedTasks.findIndex(t => t.id === activeIdNum);
    const overIndex = sortedTasks.findIndex(t => t.id === overId);
    
    if (activeIndex === -1 || overIndex === -1) return;
    if (activeIndex === overIndex) return; // No change

    // Calculate new position
    const newPosition = overIndex;
    
    // Only reorder if position changed
    if (activeIndex !== newPosition) {
      props.onReorder(activeIdNum, newPosition);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleEditContent = (id: number, draft: string) => {
    setEditingContentDraft(draft);
    if (contentTimerRef.current) window.clearTimeout(contentTimerRef.current);
    contentTimerRef.current = window.setTimeout(() => {
      void props.onInlineUpdate(id, { description: draft });
    }, 10000);
  };

  const handleCommitContent = (id: number, value: string) => {
    if (contentTimerRef.current) {
      window.clearTimeout(contentTimerRef.current);
      contentTimerRef.current = null;
    }
    void props.onInlineUpdate(id, { description: value });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="epic-card">
        <div className="epic-header" style={{ position: 'relative' }}>
          <InlineText
            value={props.epic.name}
            onChange={(v) => props.onEpicUpdate(props.epic.id, { name: v })}
            editable
            className="epic-title"
          />
          <button
            className="delete-btn epic-delete"
            onClick={(e) => {
              e.stopPropagation();
              props.onDeleteEpic?.(props.epic.id);
            }}
            title="Delete epic"
          >
            ×
          </button>
        </div>
        <DroppableZone id="drop-tasks" className="task-drop-zone">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, minHeight: '60px' }}>
              {sortedTasks.map((t) => (
                <SortableTask
                  key={t.id}
                  task={t}
                  focusIds={focusIds}
                  editContentId={editContentId}
                  editingContentDraft={editingContentDraft}
                  onEditContent={handleEditContent}
                  onCommitContent={handleCommitContent}
                  onSetEditContent={(id, draft) => { setEditContentId(id); setEditingContentDraft(draft); }}
                  onDelete={props.onDeleteTask}
                  currentUserId={props.currentUserId}
                  onSave={() => {
                    // Focus the empty task textarea after saving
                    if (emptyTaskTextareaRef.current) {
                      requestAnimationFrame(() => {
                        emptyTaskTextareaRef.current?.focus();
                      });
                    }
                  }}
                />
              ))}
              {/* Empty task placeholder */}
              <li className="task empty-task">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <textarea
                      ref={(el) => {
                        emptyTaskTextareaRef.current = el;
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      className="content"
                      placeholder="Add a note..."
                      value={newTaskDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 150) {
                          setNewTaskDraft(val);
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (e.altKey) {
                            // Alt+Enter: allow newline (default behavior)
                            return;
                          } else {
                            // Enter: create task and clear
                            e.preventDefault();
                            if (newTaskDraft.trim()) {
                              props.onCreateTask(props.epic.id, newTaskDraft.trim());
                              setNewTaskDraft('');
                            }
                          }
                        }
                      }}
                      onBlur={() => {
                        if (newTaskDraft.trim()) {
                          props.onCreateTask(props.epic.id, newTaskDraft.trim());
                          setNewTaskDraft('');
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      maxLength={150}
                      style={{ 
                        flex: 1, 
                        resize: 'none', 
                        overflow: 'hidden', 
                        border: 'none', 
                        background: 'transparent', 
                        outline: 'none', 
                        minHeight: '1.5rem', 
                        height: 'auto',
                        lineHeight: '1.5',
                        padding: 0,
                        margin: 0,
                        font: 'inherit',
                        color: 'inherit',
                        boxShadow: 'none'
                      }}
                    />
                  </div>
                </div>
              </li>
            </ul>
          </SortableContext>
        </DroppableZone>

        <div className="epic-backlog">
          <InlineText
            value={props.epic.description ?? ''}
            placeholder="Backlog notes…"
            onChange={(v) => props.onEpicUpdate(props.epic.id, { description: v || null })}
            editable
            multiline
          />
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="task ghost-preview" style={{ transform: 'rotate(2deg)', boxShadow: '0 20px 40px rgba(13, 18, 36, 0.25)' }}>
            <div style={{ flex: 1 }}>
              <span className="content">{activeTask.description}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {showToast && (
        <div className="toast" style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#22a06b', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(34, 160, 107, 0.3)', zIndex: 2000 }}>
          ✓ Task moved
        </div>
      )}
    </DndContext>
  );
}

