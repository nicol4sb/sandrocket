import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { InlineText } from './App';
function TaskInfo(props) {
    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1)
            return 'just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };
    const getUserLabel = (userId) => {
        return userId === props.currentUserId ? 'You' : `User ${userId}`;
    };
    const colors = ['#2250f4', '#6a4bff', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#95e1d3'];
    const creatorColor = colors[props.task.creatorUserId % colors.length];
    const editorColor = props.task.lastEditedByUserId ? colors[props.task.lastEditedByUserId % colors.length] : creatorColor;
    const wasEdited = props.task.lastEditedByUserId && props.task.lastEditedByUserId !== props.task.creatorUserId;
    const isCurrentUserCreator = props.task.creatorUserId === props.currentUserId;
    const isCurrentUserEditor = props.task.lastEditedByUserId === props.currentUserId;
    return (_jsxs("div", { className: "task-info", style: { display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(13, 18, 36, 0.5)' }, children: [_jsx("span", { className: "creator-badge", style: {
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
                }, title: `Created by ${getUserLabel(props.task.creatorUserId)}`, children: isCurrentUserCreator ? 'Y' : String(props.task.creatorUserId).slice(-1) }), wasEdited && (_jsxs(_Fragment, { children: [_jsx("span", { style: { color: 'rgba(13, 18, 36, 0.25)', fontSize: '0.65rem' }, children: "\u2192" }), _jsx("span", { className: "editor-badge", style: {
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
                        }, title: `Last edited by ${getUserLabel(props.task.lastEditedByUserId)}`, children: isCurrentUserEditor ? 'Y' : String(props.task.lastEditedByUserId).slice(-1) })] })), _jsx("span", { style: { whiteSpace: 'nowrap' }, children: formatTime(props.task.updatedAt) })] }));
}
function SortableTask(props) {
    const isEditing = props.editContentId === props.task.id;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: props.task.id,
        disabled: isEditing // Disable drag when editing
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };
    // Only apply drag listeners when not editing
    const dragListeners = isEditing ? {} : listeners;
    return (_jsx("li", { ref: setNodeRef, style: style, className: `task ${props.focusIds.includes(props.task.id) ? 'focus' : ''} ${isDragging ? 'dragging' : ''}`, ...attributes, ...dragListeners, onMouseEnter: (e) => {
            const meta = e.currentTarget.querySelector('.task-meta');
            if (meta)
                meta.style.opacity = '1';
        }, onMouseLeave: (e) => {
            const meta = e.currentTarget.querySelector('.task-meta');
            if (meta)
                meta.style.opacity = '0';
        }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [props.editContentId === props.task.id ? (_jsx("textarea", { autoFocus: true, maxLength: 150, value: props.editingContentDraft, onChange: (e) => {
                                const val = e.target.value;
                                if (val.length <= 150) {
                                    props.onEditContent(props.task.id, val);
                                    // Auto-resize
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }
                            }, onKeyDown: (e) => {
                                e.stopPropagation(); // Prevent drag from starting
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    props.onCommitContent(props.task.id, props.editingContentDraft);
                                    props.onSetEditContent(null, '');
                                }
                            }, onBlur: () => {
                                props.onCommitContent(props.task.id, props.editingContentDraft);
                                props.onSetEditContent(null, '');
                            }, onClick: (e) => e.stopPropagation(), style: {
                                flex: 1,
                                resize: 'none',
                                overflow: 'hidden',
                                minHeight: '1.5rem',
                                height: 'auto',
                                lineHeight: '1.5',
                                padding: '0.25rem 0.5rem'
                            }, ref: (el) => {
                                if (el) {
                                    // Set initial height based on content
                                    el.style.height = 'auto';
                                    el.style.height = `${el.scrollHeight}px`;
                                }
                            } })) : (_jsx("span", { className: "content", title: "Click to edit", onClick: (e) => {
                                e.stopPropagation();
                                props.onSetEditContent(props.task.id, props.task.description);
                            }, style: { flex: 1 }, children: props.task.description })), _jsx("button", { className: "delete-btn", onClick: (e) => {
                                e.stopPropagation();
                                props.onDelete(props.task.id);
                            }, title: "Delete task", children: "\u00D7" })] }), _jsx("div", { className: "task-meta", style: { display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0, transition: 'opacity 160ms ease', fontSize: '0.7rem' }, children: _jsx(TaskInfo, { task: props.task, currentUserId: props.currentUserId }) })] }) }));
}
function DroppableZone(props) {
    const { setNodeRef, isOver } = useDroppable({ id: props.id });
    return (_jsx("div", { ref: setNodeRef, className: `${props.className} ${isOver ? 'drag-over' : ''}`, style: { marginBottom: '0.75rem' }, children: props.children }));
}
export function EpicLane(props) {
    const [editContentId, setEditContentId] = useState(null);
    const [editingContentDraft, setEditingContentDraft] = useState('');
    const [newTaskDraft, setNewTaskDraft] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const contentTimerRef = useRef(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const sortedTasks = [...props.tasks].sort((a, b) => a.position - b.position);
    const taskIds = sortedTasks.map(t => t.id);
    const focusIds = sortedTasks.slice(0, 3).map(t => t.id);
    const activeTask = activeId ? props.tasks.find(t => t.id === activeId) : null;
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };
    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over)
            return;
        const activeIdNum = active.id;
        const overId = over.id;
        // Find positions
        const activeIndex = sortedTasks.findIndex(t => t.id === activeIdNum);
        const overIndex = sortedTasks.findIndex(t => t.id === overId);
        if (activeIndex === -1 || overIndex === -1)
            return;
        if (activeIndex === overIndex)
            return; // No change
        // Calculate new position
        const newPosition = overIndex;
        // Only reorder if position changed
        if (activeIndex !== newPosition) {
            props.onReorder(activeIdNum, newPosition);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        }
    };
    const handleEditContent = (id, draft) => {
        setEditingContentDraft(draft);
        if (contentTimerRef.current)
            window.clearTimeout(contentTimerRef.current);
        contentTimerRef.current = window.setTimeout(() => {
            void props.onInlineUpdate(id, { description: draft });
        }, 10000);
    };
    const handleCommitContent = (id, value) => {
        if (contentTimerRef.current) {
            window.clearTimeout(contentTimerRef.current);
            contentTimerRef.current = null;
        }
        void props.onInlineUpdate(id, { description: value });
    };
    return (_jsxs(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragStart: handleDragStart, onDragEnd: handleDragEnd, children: [_jsxs("div", { className: "epic-card", children: [_jsxs("div", { className: "epic-header", style: { position: 'relative' }, children: [_jsx(InlineText, { value: props.epic.name, onChange: (v) => props.onEpicUpdate(props.epic.id, { name: v }), editable: true, className: "epic-title" }), _jsx("button", { className: "delete-btn epic-delete", onClick: (e) => {
                                    e.stopPropagation();
                                    props.onDeleteEpic?.(props.epic.id);
                                }, title: "Delete epic", children: "\u00D7" })] }), _jsx(DroppableZone, { id: "drop-tasks", className: "task-drop-zone", children: _jsx(SortableContext, { items: taskIds, strategy: verticalListSortingStrategy, children: _jsxs("ul", { style: { listStyle: 'none', padding: 0, margin: 0, minHeight: '60px' }, children: [sortedTasks.map((t) => (_jsx(SortableTask, { task: t, focusIds: focusIds, editContentId: editContentId, editingContentDraft: editingContentDraft, onEditContent: handleEditContent, onCommitContent: handleCommitContent, onSetEditContent: (id, draft) => { setEditContentId(id); setEditingContentDraft(draft); }, onDelete: props.onDeleteTask, currentUserId: props.currentUserId }, t.id))), _jsx("li", { className: "task empty-task", children: _jsx("div", { style: { flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: _jsx("textarea", { placeholder: "Add a note...", value: newTaskDraft, onChange: (e) => {
                                                    const val = e.target.value;
                                                    if (val.length <= 150) {
                                                        setNewTaskDraft(val);
                                                        // Auto-resize
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                    }
                                                }, onKeyDown: (e) => {
                                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                        e.preventDefault();
                                                        if (newTaskDraft.trim()) {
                                                            props.onCreateTask(props.epic.id, newTaskDraft.trim());
                                                            setNewTaskDraft('');
                                                        }
                                                    }
                                                }, onBlur: () => {
                                                    if (newTaskDraft.trim()) {
                                                        props.onCreateTask(props.epic.id, newTaskDraft.trim());
                                                        setNewTaskDraft('');
                                                    }
                                                }, maxLength: 150, style: {
                                                    flex: 1,
                                                    resize: 'none',
                                                    overflow: 'hidden',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    outline: 'none',
                                                    minHeight: '1.5rem',
                                                    height: 'auto',
                                                    lineHeight: '1.5',
                                                    padding: '0.25rem 0.5rem'
                                                } }) }) })] }) }) }), _jsx("div", { className: "epic-backlog", children: _jsx(InlineText, { value: props.epic.description ?? '', placeholder: "Backlog notes\u2026", onChange: (v) => props.onEpicUpdate(props.epic.id, { description: v || null }), editable: true, multiline: true }) })] }), _jsx(DragOverlay, { children: activeTask ? (_jsx("div", { className: "task ghost-preview", style: { transform: 'rotate(2deg)', boxShadow: '0 20px 40px rgba(13, 18, 36, 0.25)' }, children: _jsx("div", { style: { flex: 1 }, children: _jsx("span", { className: "content", children: activeTask.description }) }) })) : null }), showToast && (_jsx("div", { className: "toast", style: { position: 'fixed', bottom: '2rem', right: '2rem', background: '#22a06b', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(34, 160, 107, 0.3)', zIndex: 2000 }, children: "\u2713 Task moved" }))] }));
}
