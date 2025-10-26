// Global state
let socket;
let currentUser = null;
let epics = [];
let tasks = [];
let completedTasks = [];

// DOM elements
const loginModal = document.getElementById('loginModal');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const activityTab = document.getElementById('activityTab');
const activityPanel = document.getElementById('activityPanel');
// Close button removed from activity panel
const activityList = document.getElementById('activityList');
const epicsContainer = document.getElementById('epicsContainer');
const mobileEpicSelect = document.getElementById('mobileEpicSelect');
const mainContent = document.querySelector('.main-content');

// Modals
const taskModal = document.getElementById('taskModal');
const epicModal = document.getElementById('epicModal');
const confirmModal = document.getElementById('confirmModal');
const taskForm = document.getElementById('taskForm');
const epicForm = document.getElementById('epicForm');
const taskContent = document.getElementById('taskContent');
const charCount = document.getElementById('charCount');
const epicName = document.getElementById('epicName');
const taskContextMenu = document.getElementById('taskContextMenu');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

function initializeApp() {
    // Initialize Socket.IO
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join_workspace');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    // Real-time updates
    socket.on('epic_created', handleEpicCreated);
    socket.on('epic_updated', handleEpicUpdated);
    socket.on('epic_deleted', handleEpicDeleted);
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_position_updated', handleTaskPositionUpdated);
    socket.on('task_deleted', handleTaskDeleted);
}

function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Activity log
    activityTab.addEventListener('click', toggleActivityPanel);
    
    // Mobile epic selector
    mobileEpicSelect.addEventListener('change', handleMobileEpicChange);
    
    // Window resize handler
    window.addEventListener('resize', handleWindowResize);
    
    // Close activity panel when clicking outside on mobile
    document.addEventListener('click', handleDocumentClick);
    
    // Context menu
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    taskContextMenu.addEventListener('click', handleContextMenuAction);
    
    // Report tabs
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.addEventListener('click', handleReportTabClick);
    });
    
    // Task creation
    taskForm.addEventListener('submit', handleTaskCreate);
    taskContent.addEventListener('input', updateCharCount);
    
    // Task modal keyboard shortcuts
    taskContent.addEventListener('keydown', handleTaskModalKeydown);
    
    // Epic creation
    epicForm.addEventListener('submit', handleEpicCreate);
    document.getElementById('cancelEpic').addEventListener('click', closeEpicModal);
    
    // Color picker
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', selectColor);
    });
    
    // Confirmation modal
    document.getElementById('confirmCancel').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmOk').addEventListener('click', handleConfirm);
    
    // Drag and drop will be setup after data is loaded
    
}

async function checkAuthStatus() {
    try {
        console.log('Checking auth status...');
        const response = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await response.json();
        console.log('Auth status response:', data);
        
        if (data.authenticated) {
            console.log('User is authenticated, showing app...');
            showApp();
            loadData();
        } else {
            console.log('User not authenticated, showing login...');
            showLogin();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showLogin();
    }
}

function showLogin() {
    loginModal.classList.add('show');
    app.style.display = 'none';
    passwordInput.focus();
}

function showApp() {
    loginModal.classList.remove('show');
    app.style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    const password = passwordInput.value;
    console.log('Attempting login with password:', password);
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        console.log('Login response:', response.status, data);
        
        if (response.ok) {
            console.log('Login successful, showing app...');
            showApp();
            loadData();
            passwordInput.value = '';
            hideError();
        } else {
            console.log('Login failed:', data.error);
            showError(data.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please try again.');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        showLogin();
        epics = [];
        tasks = [];
        completedTasks = [];
        renderEpics();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
}

function hideError() {
    loginError.classList.remove('show');
}

async function loadData() {
    try {
        console.log('Loading data...');
        const [epicsResponse, tasksResponse, activityResponse] = await Promise.all([
            fetch('/api/epics', { credentials: 'include' }),
            fetch('/api/tasks', { credentials: 'include' }),
            fetch('/api/activity', { credentials: 'include' })
        ]);
        
        console.log('Epics response status:', epicsResponse.status);
        console.log('Tasks response status:', tasksResponse.status);
        console.log('Activity response status:', activityResponse.status);
        
        if (!epicsResponse.ok || !tasksResponse.ok || !activityResponse.ok) {
            throw new Error('Failed to fetch data');
        }
        
        epics = await epicsResponse.json();
        const allTasks = await tasksResponse.json();
        const activities = await activityResponse.json();
        
        console.log('Loaded epics:', epics.length);
        console.log('Loaded tasks:', allTasks.length);
        console.log('Loaded activities:', activities.length);
        
        // Separate active and completed tasks
        tasks = allTasks.filter(task => !task.is_completed);
        completedTasks = allTasks.filter(task => task.is_completed);
        
        console.log('Active tasks:', tasks.length);
        console.log('Completed tasks:', completedTasks.length);
        
        renderEpics();
        renderActivityLog(activities);
        
        // Setup drag and drop after data is rendered
        setupDragAndDrop();
        
        console.log('Data loaded and rendered successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        // If data loading fails, show login again
        showLogin();
    }
}

function renderEpics() {
    epicsContainer.innerHTML = '';
    
    // Populate mobile epic selector
    mobileEpicSelect.innerHTML = '<option value="">Select Epic</option>';
    epics.forEach(epic => {
        const option = document.createElement('option');
        option.value = epic.id;
        option.textContent = epic.name;
        mobileEpicSelect.appendChild(option);
    });
    
    epics.forEach(epic => {
        const epicElement = createEpicElement(epic);
        epicsContainer.appendChild(epicElement);
    });
    
    // Add "Add Epic" button
    const addEpicBtn = document.createElement('div');
    addEpicBtn.className = 'add-epic-btn';
    addEpicBtn.innerHTML = '+ Add Epic';
    addEpicBtn.addEventListener('click', openEpicModal);
    epicsContainer.appendChild(addEpicBtn);
    
    // Handle mobile view after a short delay to ensure DOM is ready
    setTimeout(() => {
        handleMobileView();
    }, 100);
}

function createEpicElement(epic) {
    const epicDiv = document.createElement('div');
    epicDiv.className = 'epic-column';
    epicDiv.draggable = true;
    epicDiv.dataset.epicId = epic.id;
    
    const epicTasks = tasks.filter(task => task.epic_id === epic.id && !task.is_completed)
                          .sort((a, b) => a.position - b.position);
    
    epicDiv.innerHTML = `
        <div class="epic-header" style="--epic-color: ${epic.pastille_color}; --epic-color-dark: ${darkenColor(epic.pastille_color, 20)}">
            <div class="epic-pastille" style="background-color: ${epic.pastille_color}"></div>
            <div class="epic-title" contenteditable="true" data-epic-id="${epic.id}">${epic.name}</div>
        </div>
        <div class="epic-tasks" data-epic-id="${epic.id}">
            ${epicTasks.map(task => createTaskHTML(task)).join('')}
            <button class="add-task-btn" onclick="openTaskModal(${epic.id})">
                + Add Task
            </button>
        </div>
    `;
    
    // Setup epic title editing
    const titleElement = epicDiv.querySelector('.epic-title');
    titleElement.addEventListener('blur', () => updateEpic(epic.id, titleElement.textContent, epic.pastille_color, epic.position));
    titleElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleElement.blur();
        }
    });
    titleElement.addEventListener('dblclick', () => {
        titleElement.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(titleElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });
    
    // Setup task content editing
    const taskElements = epicDiv.querySelectorAll('.task-content');
    console.log('Setting up task editing for epic', epic.id, '- found', taskElements.length, 'task elements');
    
    taskElements.forEach((taskElement, index) => {
        const taskId = parseInt(taskElement.closest('.task').dataset.taskId);
        console.log(`Adding event listeners to task ${index + 1} (ID: ${taskId})`);
        
        taskElement.addEventListener('blur', () => {
            console.log('Task content blur event triggered for task', taskId);
            const newContent = taskElement.textContent.trim();
            const originalContent = taskElement.getAttribute('data-original-content') || '';
            console.log('New content:', newContent);
            console.log('Original content:', originalContent);
            
            if (newContent && newContent !== originalContent) {
                console.log('Content changed, updating task...');
                updateTaskContent(taskId, newContent);
            } else {
                console.log('No content change detected');
            }
        });
        
        taskElement.addEventListener('keydown', (e) => {
            console.log('Task content keydown event:', e.key);
            if (e.key === 'Enter') {
                e.preventDefault();
                taskElement.blur();
            }
        });
        
        taskElement.addEventListener('dblclick', () => {
            taskElement.focus();
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(taskElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
        
        taskElement.addEventListener('click', (e) => {
            console.log('Task content clicked for editing');
            // Ensure the element gets focus for text editing
            if (document.activeElement !== taskElement) {
                taskElement.focus();
            }
            
            // Let the browser handle cursor positioning naturally
            // Don't interfere with the default click behavior
        });
    });
    
    // Epic drag and drop handled by DragDropManager
    
    return epicDiv;
}

function createTaskHTML(task) {
    const createdDate = new Date(task.created_at).toLocaleString();
    
    return `
        <div class="task" data-task-id="${task.id}">
            <div class="task-drag-handle" draggable="true" title="Drag to reorder">⋮⋮</div>
            <div class="task-main">
                <input type="checkbox" class="task-complete-checkbox" onchange="completeTask(${task.id})" ${task.is_completed ? 'checked' : ''} title="Mark as completed">
                <div class="task-content" contenteditable="true" data-original-content="${task.content.replace(/"/g, '&quot;')}">${task.content}</div>
            </div>
            <div class="task-meta">
                <span class="task-created" title="Created: ${createdDate}">${formatDate(task.created_at)}</span>
            </div>
        </div>
    `;
}



function renderActivityLog(activities) {
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div>${activity.details}</div>
            <div class="timestamp">${formatDate(activity.timestamp)}</div>
        </div>
    `).join('');
}

function loadMetrics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Calculate metrics
    const allTasks = [...tasks, ...completedTasks];
    const tasksCreatedLast7Days = allTasks.filter(task => 
        new Date(task.created_at) >= sevenDaysAgo
    ).length;
    
    const tasksCompletedLast7Days = completedTasks.filter(task => 
        new Date(task.updated_at) >= sevenDaysAgo
    ).length;
    
    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
    
    // Update metric displays
    document.getElementById('tasksCreated').textContent = tasksCreatedLast7Days;
    document.getElementById('tasksCompleted').textContent = tasksCompletedLast7Days;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completionRate').textContent = completionRate + '%';
}

async function loadClosedTasks() {
    const closedTasksList = document.getElementById('closedTasksList');
    
    try {
        const response = await fetch('/api/tasks/completed', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch completed tasks');
        }
        
        const completedTasks = await response.json();
        
        if (completedTasks.length === 0) {
            closedTasksList.innerHTML = '<div class="no-tasks">No completed tasks yet</div>';
            return;
        }
        
        closedTasksList.innerHTML = completedTasks.map(task => {
            const completedDate = new Date(task.completed_at).toLocaleString();
            const epicName = task.epic_name || 'Unknown Epic';
            
            return `
                <div class="closed-task-item">
                    <div>
                        <div class="closed-task-content">${task.content}</div>
                        <div class="closed-task-meta">
                            From: ${epicName} • Completed: ${completedDate}
                        </div>
                    </div>
                    <div class="closed-task-actions">
                        <button class="btn-secondary" onclick="reopenTask(${task.id})">Reopen</button>
                        <button class="task-delete" onclick="confirmDeleteTask(${task.id})">×</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading completed tasks:', error);
        closedTasksList.innerHTML = '<div class="no-tasks">Error loading completed tasks</div>';
    }
}

// Task Management
async function reopenTask(taskId) {
    try {
        // First, get the task details
        const response = await fetch('/api/tasks/completed', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch task details');
        }
        
        const completedTasks = await response.json();
        const task = completedTasks.find(t => t.id === taskId);
        
        if (!task) {
            console.error('Task not found:', taskId);
            return;
        }
        
        // Reopen the task by setting isCompleted to false
        const updateResponse = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                epicId: task.epic_id,
                content: task.content,
                position: task.position,
                isCompleted: false
            })
        });
        
        if (updateResponse.ok) {
            console.log('Task reopened successfully');
            // Reload the closed tasks list to remove the reopened task
            loadClosedTasks();
            // Reload main data to show the task back in its epic
            loadData();
        } else {
            console.error('Failed to reopen task:', updateResponse.status, updateResponse.statusText);
        }
    } catch (error) {
        console.error('Error reopening task:', error);
    }
}

function openTaskModal(epicId) {
    // Store the epic ID for task creation
    taskModal.dataset.epicId = epicId;
    
    taskContent.value = '';
    updateCharCount();
    taskModal.classList.add('show');
    taskContent.focus();
}

function closeTaskModal() {
    taskModal.classList.remove('show');
}

function handleTaskModalKeydown(e) {
    // Ctrl + Enter to create task
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleTaskCreate(e);
    }
    // Esc to cancel
    else if (e.key === 'Escape') {
        e.preventDefault();
        closeTaskModal();
    }
}

function updateCharCount() {
    const count = taskContent.value.length;
    charCount.textContent = count;
    charCount.style.color = count > 150 ? '#dc3545' : '#6c757d';
}

async function handleTaskCreate(e) {
    e.preventDefault();
    
    const epicId = parseInt(taskModal.dataset.epicId);
    const content = taskContent.value.trim();
    
    if (!epicId || !content) return;
    
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                epicId,
                content,
                position: tasks.filter(t => t.epic_id === epicId).length
            })
        });
        
        if (response.ok) {
            closeTaskModal();
            loadData(); // Reload to get the new task
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Error creating task');
    }
}

// Epic Management
function openEpicModal() {
    epicName.value = '';
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector('.color-option').classList.add('selected');
    
    epicModal.classList.add('show');
    epicName.focus();
}

function closeEpicModal() {
    epicModal.classList.remove('show');
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
}

function selectColor(e) {
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    e.target.classList.add('selected');
}

async function handleEpicCreate(e) {
    e.preventDefault();
    
    const name = epicName.value.trim();
    const selectedColor = document.querySelector('.color-option.selected').dataset.color;
    
    if (!name) return;
    
    try {
        const response = await fetch('/api/epics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name,
                pastilleColor: selectedColor,
                position: epics.length
            })
        });
        
        if (response.ok) {
            closeEpicModal();
            loadData(); // Reload to get the new epic
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        console.error('Error creating epic:', error);
        alert('Error creating epic');
    }
}

async function updateEpic(epicId, name, pastilleColor, position) {
    try {
        const response = await fetch(`/api/epics/${epicId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: name.trim(),
                pastilleColor,
                position
            })
        });
        
        if (response.ok) {
            // Update local epic data
            const epic = epics.find(e => e.id === epicId);
            if (epic) {
                epic.name = name.trim();
            }
            
            // Broadcast update to other users
            socket.emit('epic_updated', { id: epicId, name: name.trim(), pastilleColor, position });
        } else {
            console.error('Failed to update epic');
            // Revert the title if update failed
            loadData();
        }
    } catch (error) {
        console.error('Error updating epic:', error);
        // Revert the title if update failed
        loadData();
    }
}

// Task Actions
async function completeTask(taskId) {
    try {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            console.log('Task not found:', taskId);
            return;
        }
        
        const checkbox = document.querySelector(`[data-task-id="${taskId}"] .task-complete-checkbox`);
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        
        if (!checkbox || !taskElement) {
            console.log('Checkbox or task element not found for task:', taskId);
            return;
        }
        
        const isCompleted = checkbox.checked;
        console.log('Completing task:', taskId, 'isCompleted:', isCompleted);
        
        // Add visual feedback
        taskElement.style.transition = 'all 0.3s ease';
        taskElement.style.transform = 'scale(0.95)';
        taskElement.style.opacity = '0.7';
        
        // Add completion animation
        setTimeout(() => {
            taskElement.style.transform = 'scale(1.05)';
            if (isCompleted) {
                taskElement.style.background = 'linear-gradient(135deg, rgba(40, 167, 69, 0.2), rgba(32, 201, 151, 0.2))';
                taskElement.style.border = '2px solid #28a745';
            } else {
                taskElement.style.background = '';
                taskElement.style.border = '';
            }
        }, 150);
        
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                epicId: task.epic_id,
                content: task.content,
                position: task.position,
                isCompleted: isCompleted
            })
        });
        
        if (response.ok) {
            console.log('Task completion status updated successfully');
            
            // Update local task state
            task.is_completed = isCompleted;
            
            // Show success feedback
            if (isCompleted) {
                taskElement.style.background = 'linear-gradient(135deg, rgba(40, 167, 69, 0.3), rgba(32, 201, 151, 0.3))';
                taskElement.style.border = '2px solid #28a745';
            } else {
                taskElement.style.background = '';
                taskElement.style.border = '';
            }
            
            // Reset visual state after animation
            setTimeout(() => {
                taskElement.style.transform = '';
                taskElement.style.opacity = '';
            }, 300);
        } else {
            console.error('Failed to update task completion status:', response.status, response.statusText);
            // Reset checkbox and visual state on error
            checkbox.checked = !isCompleted;
            taskElement.style.transform = '';
            taskElement.style.opacity = '';
            taskElement.style.background = '';
            taskElement.style.border = '';
        }
    } catch (error) {
        console.error('Error updating task completion status:', error);
        
        // Reset checkbox and visual state on error
        const checkbox = document.querySelector(`[data-task-id="${taskId}"] .task-complete-checkbox`);
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        
        if (checkbox) checkbox.checked = !checkbox.checked;
        if (taskElement) {
            taskElement.style.transform = '';
            taskElement.style.opacity = '';
            taskElement.style.background = '';
            taskElement.style.border = '';
        }
    }
}

async function reopenTask(taskId) {
    try {
        const task = completedTasks.find(t => t.id === taskId);
        if (!task) return;
        
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                epicId: task.epic_id,
                content: task.content,
                position: 0,
                isCompleted: false
            })
        });
        
        if (response.ok) {
            loadData(); // Reload to update the UI
        }
    } catch (error) {
        console.error('Error reopening task:', error);
    }
}

// Confirmation Modal
let confirmCallback = null;

function confirmDeleteTask(taskId) {
    const task = [...tasks, ...completedTasks].find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('confirmTitle').textContent = 'Delete Task';
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${task.content}"?`;
    
    confirmCallback = () => deleteTask(taskId);
    confirmModal.classList.add('show');
}


function closeConfirmModal() {
    confirmModal.classList.remove('show');
    confirmCallback = null;
}

function handleConfirm() {
    if (confirmCallback) {
        confirmCallback();
        closeConfirmModal();
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            loadData(); // Reload to update the UI
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}


// Mobile View Handling
function handleMobileView() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // Show first epic by default on mobile if none selected
        if (epics.length > 0 && !mobileEpicSelect.value) {
            mobileEpicSelect.value = epics[0].id;
            showSelectedEpic(epics[0].id);
        } else if (mobileEpicSelect.value) {
            // Show the currently selected epic
            showSelectedEpic(parseInt(mobileEpicSelect.value));
        }
    }
}

function handleMobileEpicChange() {
    const selectedEpicId = parseInt(mobileEpicSelect.value);
    console.log('Mobile epic changed to:', selectedEpicId);
    if (selectedEpicId) {
        showSelectedEpic(selectedEpicId);
    } else {
        hideAllEpics();
    }
}

function showSelectedEpic(epicId) {
    const isMobile = window.innerWidth <= 768;
    console.log('showSelectedEpic called with:', epicId, 'isMobile:', isMobile);
    
    if (isMobile) {
        // Remove mobile-selected class from all epics
        document.querySelectorAll('.epic-column').forEach(epic => {
            epic.classList.remove('mobile-selected');
        });
        
        // Add mobile-selected class to selected epic
        const selectedEpic = document.querySelector(`.epic-column[data-epic-id="${epicId}"]`);
        console.log('Found epic element:', selectedEpic);
        if (selectedEpic) {
            selectedEpic.classList.add('mobile-selected');
            console.log('Epic displayed');
        } else {
            console.log('Epic not found for ID:', epicId);
        }
    }
}

function hideAllEpics() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        document.querySelectorAll('.epic-column').forEach(epic => {
            epic.classList.remove('mobile-selected');
        });
    }
}

function handleWindowResize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // Mobile view - show epic selector and handle epic display
        handleMobileView();
    } else {
        // Desktop view - show all epics and clear mobile selection
        document.querySelectorAll('.epic-column').forEach(epic => {
            epic.classList.remove('mobile-selected');
        });
        mobileEpicSelect.value = '';
    }
}

function handleDocumentClick(e) {
    const isMobile = window.innerWidth <= 768;
    const isActivityPanelOpen = activityPanel.classList.contains('open');
    
    // On mobile, close activity panel if clicking outside of it
    if (isMobile && isActivityPanelOpen) {
        if (!activityPanel.contains(e.target) && !activityTab.contains(e.target)) {
            closeActivityPanel();
        }
    }
}

// Context menu variables
let touchStartTime = 0;
let touchStartTarget = null;
let currentTaskId = null;

function handleContextMenu(e) {
    const taskElement = e.target.closest('.task');
    const taskContent = e.target.closest('.task-content');
    const epicTitle = e.target.closest('.epic-title');
    
    // Don't show context menu for editable content (to allow text editing)
    if (taskContent || epicTitle) {
        return;
    }
    
    if (taskElement) {
        e.preventDefault();
        currentTaskId = parseInt(taskElement.dataset.taskId);
        showContextMenu(e.clientX, e.clientY);
    }
}

function handleTouchStart(e) {
    const taskElement = e.target.closest('.task');
    const taskContent = e.target.closest('.task-content');
    const epicTitle = e.target.closest('.epic-title');
    
    // Don't show context menu for editable content (to allow text editing)
    if (taskContent || epicTitle) {
        return;
    }
    
    if (taskElement) {
        touchStartTime = Date.now();
        touchStartTarget = taskElement;
        currentTaskId = parseInt(taskElement.dataset.taskId);
    }
}

function handleTouchEnd(e) {
    if (touchStartTarget && Date.now() - touchStartTime > 500) {
        e.preventDefault();
        const rect = touchStartTarget.getBoundingClientRect();
        showContextMenu(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    touchStartTime = 0;
    touchStartTarget = null;
}

function showContextMenu(x, y) {
    taskContextMenu.style.left = x + 'px';
    taskContextMenu.style.top = y + 'px';
    taskContextMenu.style.display = 'block';
}

function hideContextMenu() {
    taskContextMenu.style.display = 'none';
    currentTaskId = null;
}

function handleContextMenuAction(e) {
    const action = e.target.closest('.context-menu-item')?.dataset.action;
    
    if (action === 'delete' && currentTaskId) {
        confirmDeleteTask(currentTaskId);
    }
    
    hideContextMenu();
}

function handleReportTabClick(e) {
    const tabName = e.target.dataset.tab;
    
    // Remove active class from all tabs
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    e.target.classList.add('active');
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    const targetContent = document.getElementById(`${tabName}TabContent`);
    if (targetContent) {
        targetContent.classList.add('active');
        
        // Load data for specific tabs
        if (tabName === 'metrics') {
            loadMetrics();
        } else if (tabName === 'closed') {
            loadClosedTasks();
        }
    }
}

// Activity Panel
function toggleActivityPanel() {
    const isOpen = activityPanel.classList.contains('open');
    if (isOpen) {
        closeActivityPanel();
    } else {
        openActivityPanel();
    }
}

function openActivityPanel() {
    activityPanel.classList.add('open');
    activityTab.style.left = '350px';
    mainContent.classList.add('activity-panel-open');
}

function closeActivityPanel() {
    activityPanel.classList.remove('open');
    activityTab.style.left = '0';
    mainContent.classList.remove('activity-panel-open');
}

// Real-time Updates
function handleEpicCreated(data) {
    loadData(); // Reload to get the new epic
}

function handleEpicUpdated(data) {
    loadData(); // Reload to update the epic
}

function handleEpicDeleted(data) {
    loadData(); // Reload to remove the epic
}

function handleTaskCreated(data) {
    loadData(); // Reload to get the new task
}

function handleTaskUpdated(data) {
    loadData(); // Reload to update the task
}

function handleTaskPositionUpdated(data) {
    const task = tasks.find(t => t.id === data.id);
    if (task) {
        task.position = data.position;
        renderEpics();
    }
}

function handleTaskDeleted(data) {
    loadData(); // Reload to remove the task
}

// Drag and Drop System
class DragDropManager {
    constructor() {
        console.log('DragDropManager constructor called');
        this.draggedElement = null;
        this.draggedData = null;
        this.dropZones = new Map();
        this.setupEventListeners();
        console.log('DragDropManager setup complete');
    }

    setupEventListeners() {
        console.log('Setting up drag and drop event listeners');
        
        // Remove existing listeners if they exist
        this.removeEventListeners();
        
        // Bind methods to preserve 'this' context
        this.boundHandleDragStart = this.handleDragStart.bind(this);
        this.boundHandleDragEnd = this.handleDragEnd.bind(this);
        this.boundHandleDragOver = this.handleDragOver.bind(this);
        this.boundHandleDragLeave = this.handleDragLeave.bind(this);
        this.boundHandleDrop = this.handleDrop.bind(this);
        
        // Add event listeners
        document.addEventListener('dragstart', this.boundHandleDragStart);
        document.addEventListener('dragend', this.boundHandleDragEnd);
        document.addEventListener('dragover', this.boundHandleDragOver);
        document.addEventListener('dragleave', this.boundHandleDragLeave);
        document.addEventListener('drop', this.boundHandleDrop);
        
        console.log('Drag and drop event listeners set up');
        console.log('Document event listeners count:', {
            dragstart: document.addEventListener.toString().includes('dragstart'),
            dragover: document.addEventListener.toString().includes('dragover'),
            drop: document.addEventListener.toString().includes('drop')
        });
    }
    
    removeEventListeners() {
        if (this.boundHandleDragStart) {
            document.removeEventListener('dragstart', this.boundHandleDragStart);
            document.removeEventListener('dragend', this.boundHandleDragEnd);
            document.removeEventListener('dragover', this.boundHandleDragOver);
            document.removeEventListener('dragleave', this.boundHandleDragLeave);
            document.removeEventListener('drop', this.boundHandleDrop);
        }
    }

    handleDragStart(e) {
        console.log('Drag start event triggered');
        console.log('Event target:', e.target);
        console.log('Event target class:', e.target.className);
        
        // Only start drag if clicking on the drag handle
        const dragHandle = e.target.closest('.task-drag-handle');
        if (!dragHandle) {
            console.log('Not clicking on drag handle, not starting drag');
            return;
        }
        
        const taskElement = e.target.closest('.task');
        console.log('Task element found:', taskElement);
        
        if (taskElement) {
            console.log('Task element found:', taskElement.dataset.taskId);
            this.draggedElement = taskElement;
            this.draggedData = {
                type: 'task',
                id: parseInt(taskElement.dataset.taskId)
            };
            
            // Create placeholder where the task was
            this.createPlaceholder(taskElement);
            
            // Hide the original task
            taskElement.style.opacity = '0';
            taskElement.style.pointerEvents = 'none';
            
            // Create custom drag preview
            this.createDragPreview(taskElement, e);
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', taskElement.dataset.taskId);
            console.log('Drag started for task:', this.draggedData.id);
            console.log('Dragged data set:', this.draggedData);
        } else {
            console.log('No task element found in drag start');
            console.log('Available elements:', {
                target: e.target,
                parent: e.target.parentElement,
                grandparent: e.target.parentElement?.parentElement
            });
        }
    }

    createPlaceholder(taskElement) {
        const placeholder = document.createElement('div');
        placeholder.className = 'task-placeholder';
        placeholder.innerHTML = 'Moving task...';
        placeholder.dataset.taskId = taskElement.dataset.taskId;
        
        // Insert placeholder where the task was
        taskElement.parentNode.insertBefore(placeholder, taskElement);
        this.placeholder = placeholder;
    }
    
    createDragPreview(taskElement, e) {
        // Create drag preview element
        const dragPreview = document.createElement('div');
        dragPreview.className = 'drag-preview';
        
        // Copy task content
        const taskContent = taskElement.querySelector('.task-content').textContent;
        const taskMeta = taskElement.querySelector('.task-meta').textContent;
        
        dragPreview.innerHTML = `
            <div class="task-content">${taskContent}</div>
            <div class="task-meta">${taskMeta}</div>
        `;
        
        document.body.appendChild(dragPreview);
        this.dragPreview = dragPreview;
        
        // Position preview at mouse cursor
        this.updateDragPreviewPosition(e);
        
        // Add mouse move listener
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        document.addEventListener('mousemove', this.boundHandleMouseMove);
    }
    
    updateDragPreviewPosition(e) {
        if (this.dragPreview) {
            this.dragPreview.style.left = (e.clientX + 10) + 'px';
            this.dragPreview.style.top = (e.clientY - 10) + 'px';
        }
    }
    
    handleMouseMove(e) {
        this.updateDragPreviewPosition(e);
    }
    
    handleDragEnd(e) {
        const taskElement = e.target.closest('.task');
        if (taskElement) {
            taskElement.classList.remove('dragging');
            // Restore original task visibility
            taskElement.style.opacity = '';
            taskElement.style.pointerEvents = '';
        }
        
        // Remove drag preview
        if (this.dragPreview) {
            document.body.removeChild(this.dragPreview);
            this.dragPreview = null;
        }
        
        // Remove mouse move listener
        if (this.boundHandleMouseMove) {
            document.removeEventListener('mousemove', this.boundHandleMouseMove);
            this.boundHandleMouseMove = null;
        }
        
        this.cleanup();
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (!this.draggedData || this.draggedData.type !== 'task') {
            return;
        }

        const targetTask = e.target.closest('.task');
        const epicContainer = e.target.closest('.epic-tasks');
        const epicColumn = e.target.closest('.epic-column');

        // Handle epic container highlighting - make it more prominent
        if (epicContainer) {
            epicContainer.classList.add('drag-over');
            
            // If we're over an epic container but not a specific task, show drop zone at the end
            if (!targetTask) {
                this.showEpicDropZone(epicContainer, 'end');
            }
        }

        // Handle task-to-task reordering with expanded drop zones
        if (targetTask && !targetTask.classList.contains('dragging')) {
            this.showDropIndicator(targetTask, e);
        }
        
        // Handle epic column highlighting for cross-epic moves
        if (epicColumn && epicColumn.dataset.epicId !== this.draggedData.epicId) {
            epicColumn.classList.add('epic-drag-over');
        }
    }

    handleDragLeave(e) {
        const epicContainer = e.target.closest('.epic-tasks');
        const epicColumn = e.target.closest('.epic-column');
        
        if (epicContainer && !epicContainer.contains(e.relatedTarget)) {
            epicContainer.classList.remove('drag-over');
            this.hideEpicDropZone(epicContainer);
        }
        
        if (epicColumn && !epicColumn.contains(e.relatedTarget)) {
            epicColumn.classList.remove('epic-drag-over');
        }

        const task = e.target.closest('.task');
        if (task && !task.contains(e.relatedTarget)) {
            this.hideDropIndicator(task);
        }
    }

    async handleDrop(e) {
        console.log('DROP EVENT TRIGGERED!', {
            target: e.target,
            targetClass: e.target.className,
            draggedData: this.draggedData
        });
        
        e.preventDefault();

        console.log('Dragged data in drop:', this.draggedData);
        console.log('Dragged data type:', typeof this.draggedData);
        console.log('Dragged data type property:', this.draggedData?.type);
        
        if (!this.draggedData || this.draggedData.type !== 'task') {
            console.log('No valid dragged data in drop, returning');
            console.log('Dragged data is:', this.draggedData);
            this.cleanup();
            return;
        }

        const targetTask = e.target.closest('.task');
        const epicContainer = e.target.closest('.epic-tasks');

        console.log('Drop targets in handleDrop:', {
            targetTask: targetTask,
            epicContainer: epicContainer,
            targetTaskId: targetTask?.dataset?.taskId,
            epicContainerId: epicContainer?.dataset?.epicId,
            epicColumn: epicContainer?.closest('.epic-column'),
            epicColumnId: epicContainer?.closest('.epic-column')?.dataset?.epicId
        });

        if (targetTask) {
            console.log('Handling task reorder');
            await this.handleTaskReorder(targetTask, e);
        } else if (epicContainer) {
            console.log('Handling task move to epic');
            await this.handleTaskMoveToEpic(epicContainer);
        } else {
            console.log('No valid drop target found in handleDrop');
        }
        
        // Clean up after processing
        this.cleanup();
    }

    showDropIndicator(targetTask, e) {
        this.hideAllDropIndicators();

        const rect = targetTask.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isAbove = e.clientY < midY;

        // Add visual indicator to target task
        targetTask.classList.add(isAbove ? 'drop-above' : 'drop-below');

        // Create drop zone line
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone active';
        dropZone.dataset.targetTask = targetTask.dataset.taskId;
        dropZone.dataset.position = isAbove ? 'above' : 'below';

        if (isAbove) {
            targetTask.parentNode.insertBefore(dropZone, targetTask);
        } else {
            targetTask.parentNode.insertBefore(dropZone, targetTask.nextSibling);
        }

        this.dropZones.set(targetTask.dataset.taskId, { task: targetTask, zone: dropZone });
    }

    hideDropIndicator(targetTask) {
        if (this.dropZones.has(targetTask.dataset.taskId)) {
            const { task, zone } = this.dropZones.get(targetTask.dataset.taskId);
            task.classList.remove('drop-above', 'drop-below');
            zone.remove();
            this.dropZones.delete(targetTask.dataset.taskId);
        }
    }

    hideAllDropIndicators() {
        this.dropZones.forEach(({ task, zone }) => {
            task.classList.remove('drop-above', 'drop-below');
            zone.remove();
        });
        this.dropZones.clear();
    }

    showEpicDropZone(epicContainer, position) {
        this.hideEpicDropZone(epicContainer);
        
        const dropZone = document.createElement('div');
        dropZone.className = 'epic-drop-zone active';
        dropZone.dataset.epicId = epicContainer.dataset.epicId;
        dropZone.dataset.position = position;
        
        if (position === 'end') {
            epicContainer.appendChild(dropZone);
        } else {
            epicContainer.insertBefore(dropZone, epicContainer.firstChild);
        }
    }

    hideEpicDropZone(epicContainer) {
        const existingZone = epicContainer.querySelector('.epic-drop-zone');
        if (existingZone) {
            existingZone.remove();
        }
    }

    async handleTaskReorder(targetTask, e) {
        const draggedTaskId = this.draggedData.id;
        const targetTaskId = parseInt(targetTask.dataset.taskId);
        
        if (draggedTaskId === targetTaskId) return;

        const draggedTask = tasks.find(t => t.id === draggedTaskId);
        const targetTaskObj = tasks.find(t => t.id === targetTaskId);

        if (!draggedTask || !targetTaskObj) return;

        // If tasks are in different epics, move to the target epic
        if (draggedTask.epic_id !== targetTaskObj.epic_id) {
            console.log('Tasks in different epics, moving to target epic');
            const epicContainer = targetTask.closest('.epic-tasks');
            if (epicContainer) {
                await this.handleTaskMoveToEpic(epicContainer);
            }
            return;
        }

        const rect = targetTask.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isAbove = e.clientY < midY;

        // Remove placeholder first
        if (this.placeholder) {
            this.placeholder.remove();
            this.placeholder = null;
        }

        this.reorderTasks(draggedTask, targetTaskObj, isAbove);
    }

    async handleTaskMoveToEpic(epicContainer) {
        const draggedTaskId = this.draggedData.id;
        const epicColumn = epicContainer.closest('.epic-column');
        const newEpicId = parseInt(epicColumn.dataset.epicId);
        
        console.log('Moving task to epic:', {
            draggedTaskId: draggedTaskId,
            newEpicId: newEpicId,
            epicColumn: epicColumn
        });
        
        const draggedTask = tasks.find(t => t.id === draggedTaskId);
        if (!draggedTask) {
            console.log('Dragged task not found in tasks array');
            return;
        }
        
        if (draggedTask.epic_id === newEpicId) {
            console.log('Task is already in this epic, no move needed');
            return;
        }

        // Remove placeholder first
        if (this.placeholder) {
            this.placeholder.remove();
            this.placeholder = null;
        }

        console.log('Moving task from epic', draggedTask.epic_id, 'to epic', newEpicId);
        this.moveTaskToEpic(draggedTask, newEpicId);
    }

    reorderTasks(draggedTask, targetTask, isAbove) {
        const epicTasks = tasks.filter(t => t.epic_id === draggedTask.epic_id && !t.is_completed)
                              .sort((a, b) => a.position - b.position);

        // Remove dragged task from list
        const tasksWithoutDragged = epicTasks.filter(t => t.id !== draggedTask.id);
        
        // Find insertion point
        const targetIndex = tasksWithoutDragged.findIndex(t => t.id === targetTask.id);
        const insertIndex = isAbove ? targetIndex : targetIndex + 1;
        
        // Insert dragged task at new position
        tasksWithoutDragged.splice(insertIndex, 0, draggedTask);
        
        // Update positions
        const updates = [];
        tasksWithoutDragged.forEach((task, index) => {
            if (task.position !== index) {
                updates.push({ id: task.id, position: index });
            }
        });

        if (updates.length > 0) {
            this.updateTaskPositions(updates);
        }
    }

    async moveTaskToEpic(draggedTask, newEpicId) {
        console.log('Calling updateTask to move task to epic:', newEpicId);
        try {
            await updateTask(draggedTask.id, {
                epicId: newEpicId,
                content: draggedTask.content,
                position: 0,
                isCompleted: draggedTask.is_completed
            });
            console.log('Task moved successfully, reloading data...');
            
            // Show success animation before reloading
            this.showSuccessAnimation();
            
            // Reload after a short delay to show the animation
            setTimeout(() => {
                loadData();
            }, 300);
        } catch (error) {
            console.error('Error moving task to epic:', error);
        }
    }

    async updateTaskPositions(updates) {
        try {
            // Update local data first
            updates.forEach(update => {
                const task = tasks.find(t => t.id === update.id);
                if (task) {
                    task.position = update.position;
                }
            });

            // Send updates to server
            const promises = updates.map(update => 
                fetch(`/api/tasks/${update.id}/position`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ position: update.position })
                })
            );

            await Promise.all(promises);
            
            // Re-render and show success animation
            renderEpics();
            this.showSuccessAnimation(updates[0].id);
            
        } catch (error) {
            console.error('Error updating task positions:', error);
            loadData(); // Reload on error
        }
    }

    showSuccessAnimation(taskId) {
        setTimeout(() => {
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('moved');
                setTimeout(() => {
                    taskElement.classList.remove('moved');
                }, 600);
            }
        }, 100);
    }

    cleanup() {
        // Remove all visual indicators
        document.querySelectorAll('.epic-tasks').forEach(container => {
            container.classList.remove('drag-over');
        });
        this.hideAllDropIndicators();
        
        // Remove placeholder
        if (this.placeholder) {
            this.placeholder.remove();
            this.placeholder = null;
        }
        
        // Reset drag state
        this.draggedElement = null;
        this.draggedData = null;
    }
    
    destroy() {
        this.removeEventListeners();
        this.cleanup();
    }
}

// Initialize drag and drop system
let dragDropManager;

function setupDragAndDrop() {
    console.log('Setting up drag and drop...');
    try {
        // Destroy existing manager if it exists
        if (dragDropManager) {
            dragDropManager.destroy();
        }
        
        dragDropManager = new DragDropManager();
        console.log('DragDropManager initialized successfully');
        
        // Test if event listeners are working
        setTimeout(() => {
            const testTask = document.querySelector('.task');
            if (testTask) {
                console.log('Found test task:', testTask);
                console.log('Task draggable attribute:', testTask.getAttribute('draggable'));
                console.log('All tasks in DOM:', document.querySelectorAll('.task').length);
                
                // Add a simple test event listener
                testTask.addEventListener('dragstart', (e) => {
                    console.log('SIMPLE TEST: Drag start detected!');
                });
                
                // Test basic drag events
                testTask.addEventListener('drag', (e) => {
                    console.log('SIMPLE TEST: Drag event detected!');
                });
                
                testTask.addEventListener('dragend', (e) => {
                    console.log('SIMPLE TEST: Drag end detected!');
                });
                
                // Test drop events on the epic container
                const epicContainer = testTask.closest('.epic-tasks');
                if (epicContainer) {
                    epicContainer.addEventListener('dragover', (e) => {
                        console.log('SIMPLE TEST: Epic dragover detected!');
                        e.preventDefault();
                    });
                    
                    epicContainer.addEventListener('drop', (e) => {
                        console.log('SIMPLE TEST: Epic drop detected!');
                        e.preventDefault();
                    });
                }
                
                // Test if the DragDropManager is working
                console.log('DragDropManager instance:', dragDropManager);
                console.log('DragDropManager bound methods:', {
                    dragStart: dragDropManager.boundHandleDragStart,
                    dragEnd: dragDropManager.boundHandleDragEnd,
                    dragOver: dragDropManager.boundHandleDragOver
                });
                
                // Test if drag and drop is supported
                console.log('Drag and drop support test:');
                console.log('draggable attribute:', testTask.draggable);
                console.log('draggable property:', testTask.draggable);
                console.log('hasAttribute draggable:', testTask.hasAttribute('draggable'));
                
                // Force set draggable
                testTask.draggable = true;
                console.log('After setting draggable=true:', testTask.draggable);
            } else {
                console.log('No tasks found for testing');
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error initializing DragDropManager:', error);
    }
}



// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

async function updateTask(taskId, data) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            loadData(); // Reload to update the UI
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function updateTaskContent(taskId, newContent) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        console.error('Task not found:', taskId);
        return;
    }
    
    console.log('Updating task content:', { taskId, newContent });
    
    await updateTask(taskId, {
        content: newContent,
        epicId: task.epic_id,
        position: task.position,
        isCompleted: task.is_completed
    });
}

async function updateEpic(epicId, name, pastilleColor, position) {
    try {
        const response = await fetch(`/api/epics/${epicId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name,
                pastilleColor,
                position
            })
        });
        
        if (response.ok) {
            loadData(); // Reload to update the UI
        }
    } catch (error) {
        console.error('Error updating epic:', error);
    }
}
                    