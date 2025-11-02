// Sand Rocket - Frontend Application
class SandRocketApp {
    constructor() {
        this.socket = null;
        this.epics = [];
        this.tasks = [];
        this.completedTasks = [];
        this.activityLog = [];
        this.currentUser = 'user';
        this.draggedTask = null;
        this.reorderingTasks = new Set(); // Track tasks being reordered to prevent duplicates
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupScrollBehavior();
        await this.checkAuthStatus();
        
        // Update activity times every minute
        setInterval(() => {
            if (this.activityLog.length > 0) {
                this.updateActivityTimes();
            }
        }, 60000); // 60 seconds
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Header buttons
        const addEpicBtn = document.getElementById('addEpicBtn');
        if (addEpicBtn) {
            addEpicBtn.addEventListener('click', () => {
                this.showEpicModal();
            });
        }

        const activityToggle = document.getElementById('activityToggle');
        if (activityToggle) {
            activityToggle.addEventListener('click', () => {
                this.toggleActivityPanel();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Epic modal
        document.getElementById('epicForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createEpic();
        });

        document.getElementById('cancelEpicBtn').addEventListener('click', () => {
            this.hideEpicModal();
        });

        // Task modal
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask();
        });

        document.getElementById('cancelTaskBtn').addEventListener('click', () => {
            this.hideTaskModal();
        });

        // Character count for task content
        document.getElementById('taskContent').addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('charCount').textContent = count;
            
            if (count > 150) {
                e.target.style.borderColor = '#dc3545';
            } else {
                e.target.style.borderColor = '#e9ecef';
            }
        });

        // Panel close buttons
        document.getElementById('closeActivityBtn').addEventListener('click', () => {
            this.hideActivityPanel();
        });

        document.getElementById('closeCompletedBtn').addEventListener('click', () => {
            this.hideCompletedPanel();
        });

        // Confirmation modal
        document.getElementById('confirmCancel').addEventListener('click', () => {
            this.hideConfirmModal();
        });

        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close modals
                this.hideAllModals();
                
                // Close activity panel if open
                const activityPanel = document.getElementById('activityPanel');
                if (activityPanel && activityPanel.classList.contains('open')) {
                    this.hideActivityPanel();
                }
                
                // Close completed panel if open
                const completedPanel = document.getElementById('completedPanel');
                if (completedPanel && completedPanel.classList.contains('open')) {
                    this.hideCompletedPanel();
                }
            }
        });

        // Window resize - adjust epics alignment
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.adjustEpicsAlignment();
            }, 100);
        });
    }

    setupScrollBehavior() {
        // Only apply scroll behavior on mobile devices (screen width <= 768px)
        if (window.innerWidth > 768) {
            return;
        }
        
        let lastScrollY = window.scrollY;
        let ticking = false;
        const header = document.querySelector('.header');
        
        if (!header) return;
        
        const updateHeader = () => {
            const currentScrollY = window.scrollY;
            
            // Only hide/show if scrolled more than 10px to prevent jitter
            if (Math.abs(currentScrollY - lastScrollY) < 10) {
                ticking = false;
                return;
            }
            
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                // Scrolling down - hide header
                header.classList.add('hidden');
            } else if (currentScrollY < lastScrollY) {
                // Scrolling up - show header
                header.classList.remove('hidden');
            }
            
            lastScrollY = currentScrollY;
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateHeader);
                ticking = true;
            }
        }, { passive: true });
        
        // Re-check on resize in case user rotates device or window is resized
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                header.classList.remove('hidden');
            }
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'same-origin'
            });
            const data = await response.json();
            
            if (data.authenticated) {
                this.showApp();
                await this.loadData();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showLogin();
        }
    }

    async hashPassword(password) {
        // Hash password using Web Crypto API (SHA-256) before sending
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async login() {
        const password = document.getElementById('password').value;
        
        try {
            this.showLoading();
            
            // Hash password before sending
            const passwordHash = await this.hashPassword(password);
            
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ passwordHash }),
            });

            const data = await response.json();
            
            if (data.success) {
                this.showApp();
                await this.loadData();
                this.showToast('Welcome to Sand Rocket! 🚀', 'success');
            } else {
                this.showToast('Invalid password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', { 
                method: 'POST',
                credentials: 'same-origin'
            });
            this.showLogin();
            this.showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    showLogin() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        document.getElementById('password').focus();
    }

    showApp() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }

    async loadData() {
        try {
            this.showLoading();
            
            const [epicsResponse, tasksResponse, completedResponse, activityResponse, statsResponse] = await Promise.all([
                fetch('/api/epics', { credentials: 'same-origin' }),
                fetch('/api/tasks', { credentials: 'same-origin' }),
                fetch('/api/tasks/completed', { credentials: 'same-origin' }),
                fetch('/api/activity?limit=50', { credentials: 'same-origin' }),
                fetch('/api/stats/weekly', { credentials: 'same-origin' })
            ]);

            this.epics = await epicsResponse.json();
            this.tasks = await tasksResponse.json();
            this.completedTasks = await completedResponse.json();
            this.activityLog = await activityResponse.json();
            const stats = await statsResponse.json();

            this.renderEpics();
            this.renderCompletedTasks();
            this.renderActivityLog();
            this.updateStats(stats);
            
        } catch (error) {
            console.error('Load data error:', error);
            this.showToast('Failed to load data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderEpics() {
        const container = document.getElementById('epicsContainer');
        container.innerHTML = '';

        this.epics.forEach(epic => {
            const epicElement = this.createEpicElement(epic);
            container.appendChild(epicElement);
        });
        
        // Check if content overflows and adjust alignment
        this.adjustEpicsAlignment();
    }

    adjustEpicsAlignment() {
        const container = document.getElementById('epicsContainer');
        if (!container) return;
        
        // Wait for next frame to ensure layout is complete
        requestAnimationFrame(() => {
            const containerWidth = container.clientWidth;
            const scrollWidth = container.scrollWidth;
            
            // If content overflows, use flex-start (left-align)
            // Otherwise, use center
            if (scrollWidth > containerWidth) {
                container.style.justifyContent = 'flex-start';
            } else {
                container.style.justifyContent = 'center';
            }
        });
    }

    createEpicElement(epic) {
        const epicDiv = document.createElement('div');
        epicDiv.className = 'epic-column';
        epicDiv.dataset.epicId = epic.id;

        const tasks = this.tasks
            .filter(task => task.epic_id === epic.id && !task.is_completed)
            .sort((a, b) => a.position - b.position);
        
        epicDiv.innerHTML = `
            <div class="epic-header">
                <div class="epic-pastille" style="background-color: ${epic.pastille_color}"></div>
                <div class="epic-name clickable-text" contenteditable="false" onclick="app.editEpicName(${epic.id}, event)" title="Click to edit">${epic.name}</div>
                <div class="epic-actions">
                    <button onclick="app.showAddTaskModal(${epic.id})" title="Add task">+</button>
                    <button onclick="app.deleteEpic(${epic.id})" title="Delete epic">🗑️</button>
                </div>
            </div>
            <div class="tasks-container" data-epic-id="${epic.id}">
                ${tasks.map(task => this.createTaskElement(task)).join('')}
            </div>
            <button class="add-task-btn" onclick="app.showAddTaskModal(${epic.id})">
                <span>+</span> Add Task
            </button>
        `;

        this.setupEpicDragAndDrop(epicDiv);
        return epicDiv;
    }

    createTaskElement(task) {
        const createdDate = new Date(task.created_at).toLocaleString();
        
        return `
            <div class="task-item" data-task-id="${task.id}" draggable="true">
                <div class="task-content clickable-text" contenteditable="false" onclick="app.editTask(${task.id}, event)" title="Click to edit">${this.escapeHtml(task.content)}</div>
                <div class="task-meta">
                    <span class="task-date" title="Created: ${createdDate}">${this.formatDate(task.created_at)}</span>
                    <div class="task-actions">
                        <button class="complete-btn" onclick="app.completeTask(${task.id})" title="Mark as complete">✓</button>
                        <button class="delete-btn" onclick="app.deleteTask(${task.id})" title="Delete task">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEpicDragAndDrop(epicElement) {
        const tasksContainer = epicElement.querySelector('.tasks-container');
        const epicId = parseInt(epicElement.dataset.epicId);
        
        // Make both epic and tasks container droppable for moving tasks between epics
        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent task drop handlers from firing
            epicElement.classList.add('drag-over');
        };
        
        const handleDragLeave = (e) => {
            // Only remove class if we're actually leaving the epic element
            if (!epicElement.contains(e.relatedTarget)) {
                epicElement.classList.remove('drag-over');
            }
        };
        
        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling
            epicElement.classList.remove('drag-over');
            
            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId && this.draggedTask) {
                const newEpicId = parseInt(epicElement.dataset.epicId);
                
                // Find the drop position within the epic
                const taskElements = Array.from(tasksContainer.querySelectorAll('.task-item'));
                
                // Calculate drop position based on mouse Y coordinate
                const dropY = e.clientY;
                let insertPosition = 0;
                
                for (let i = 0; i < taskElements.length; i++) {
                    const taskRect = taskElements[i].getBoundingClientRect();
                    const taskCenterY = taskRect.top + taskRect.height / 2;
                    
                    if (dropY < taskCenterY) {
                        insertPosition = i;
                        break;
                    }
                    insertPosition = i + 1;
                }
                
                this.moveTaskToEpic(parseInt(taskId), newEpicId, insertPosition);
            }
            
            // Clear dragged task to prevent duplicate drops
            this.draggedTask = null;
        };
        
        // Attach handlers to both epic element and tasks container
        epicElement.addEventListener('dragover', handleDragOver);
        tasksContainer.addEventListener('dragover', handleDragOver);
        
        epicElement.addEventListener('dragleave', handleDragLeave);
        tasksContainer.addEventListener('dragleave', handleDragLeave);
        
        epicElement.addEventListener('drop', handleDrop);
        tasksContainer.addEventListener('drop', handleDrop);

        // Setup task drag and drop within the epic
        const taskElements = tasksContainer.querySelectorAll('.task-item');
        taskElements.forEach(taskElement => {
            this.setupTaskDragAndDrop(taskElement);
        });
    }




    setupTaskDragAndDrop(taskElement) {
        taskElement.addEventListener('dragstart', (e) => {
            this.draggedTask = { id: parseInt(taskElement.dataset.taskId) };
            taskElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', taskElement.dataset.taskId);
        });

        taskElement.addEventListener('dragend', () => {
            taskElement.classList.remove('dragging');
            this.draggedTask = null;
            
            // Clean up all drag-over classes
            document.querySelectorAll('.drag-over, .drag-over-bottom').forEach(el => {
                el.classList.remove('drag-over', 'drag-over-bottom');
            });
        });

        taskElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // Determine if we're dragging over the top or bottom half
            const rect = taskElement.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const isOverTopHalf = e.clientY < midpoint;
            
            // Remove previous drag-over classes from all tasks
            document.querySelectorAll('.task-item').forEach(task => {
                task.classList.remove('drag-over', 'drag-over-bottom');
            });
            
            // Add appropriate class based on position
            if (isOverTopHalf) {
                taskElement.classList.add('drag-over');
            } else {
                taskElement.classList.add('drag-over-bottom');
            }
        });

        taskElement.addEventListener('dragleave', (e) => {
            // Only remove classes if we're actually leaving the element
            if (!taskElement.contains(e.relatedTarget)) {
                taskElement.classList.remove('drag-over', 'drag-over-bottom');
            }
        });

        taskElement.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling
            taskElement.classList.remove('drag-over', 'drag-over-bottom');
            
            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId && this.draggedTask) {
                const targetTaskId = parseInt(taskElement.dataset.taskId);
                const draggedTaskId = parseInt(taskId);
                
                // Get the epic IDs to check if we're moving between epics
                const draggedTask = this.tasks.find(t => t.id === draggedTaskId);
                const targetTask = this.tasks.find(t => t.id === targetTaskId);
                
                if (draggedTask && targetTask && draggedTask.epic_id !== targetTask.epic_id) {
                    // Moving between epics - calculate position and move directly
                    const epicElement = taskElement.closest('.epic-column');
                    if (epicElement) {
                        const newEpicId = parseInt(epicElement.dataset.epicId);
                        const tasksContainer = epicElement.querySelector('.tasks-container');
                        const taskElements = Array.from(tasksContainer.querySelectorAll('.task-item'));
                        
                        // Calculate drop position based on mouse Y coordinate
                        const dropY = e.clientY;
                        let insertPosition = 0;
                        
                        for (let i = 0; i < taskElements.length; i++) {
                            const taskRect = taskElements[i].getBoundingClientRect();
                            const taskCenterY = taskRect.top + taskRect.height / 2;
                            
                            if (dropY < taskCenterY) {
                                insertPosition = i;
                                break;
                            }
                            insertPosition = i + 1;
                        }
                        
                        this.moveTaskToEpic(draggedTaskId, newEpicId, insertPosition);
                        return;
                    }
                }
                
                if (draggedTaskId !== targetTaskId && draggedTask && targetTask && draggedTask.epic_id === targetTask.epic_id) {
                    // Same epic, just reordering
                    // Determine if we're dropping above or below the target
                    const rect = taskElement.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    const isAbove = e.clientY < midpoint;
                    
                    this.reorderTasks(draggedTaskId, targetTaskId, isAbove);
                }
            }
            
            // Clear dragged task to prevent duplicate drops
            this.draggedTask = null;
        });
    }

    async moveTaskToEpic(taskId, newEpicId, insertPosition = null) {
        try {
            // Prevent duplicate concurrent move calls for the same task
            if (this.reorderingTasks.has(taskId)) {
                return; // Already moving/reordering this task
            }
            this.reorderingTasks.add(taskId);
            
            // Get original task info before moving
            const originalTask = this.tasks.find(t => t.id === taskId);
            if (!originalTask) {
                this.reorderingTasks.delete(taskId);
                return;
            }
            
            const oldEpicId = originalTask.epic_id;
            
            // Get old position in original epic
            const oldEpicTasks = this.tasks
                .filter(t => t.epic_id === oldEpicId && !t.is_completed && t.id !== taskId)
                .sort((a, b) => a.position - b.position);
            const oldPosition = this.tasks
                .filter(t => t.epic_id === oldEpicId && !t.is_completed)
                .sort((a, b) => a.position - b.position)
                .findIndex(t => t.id === taskId);
            
            // Prepare position updates
            let updates = [];
            let newPosition = insertPosition;
            
            if (insertPosition !== null && oldEpicId !== newEpicId) {
                // Moving between epics with specific position
                // Get all tasks currently in the TARGET epic (excluding the moved task)
                const targetEpicTasks = this.tasks
                    .filter(t => t.epic_id === newEpicId && !t.is_completed && t.id !== taskId)
                    .sort((a, b) => a.position - b.position);
                
                // Insert the moved task at the specified position
                targetEpicTasks.splice(insertPosition, 0, originalTask);
                
                // Update positions for all tasks in the target epic
                updates = targetEpicTasks.map((t, index) => ({
                    id: t.id,
                    position: index
                }));
            } else if (insertPosition !== null && oldEpicId === newEpicId) {
                // Same epic, just reordering - this shouldn't happen via moveTaskToEpic
                // but handle it anyway
                const epicTasks = this.tasks
                    .filter(t => t.epic_id === oldEpicId && !t.is_completed && t.id !== taskId)
                    .sort((a, b) => a.position - b.position);
                
                epicTasks.splice(insertPosition, 0, originalTask);
                updates = epicTasks.map((t, index) => ({
                    id: t.id,
                    position: index
                }));
            } else if (oldEpicId !== newEpicId) {
                // Just epic change, no specific position - append to end
                const targetEpicTasks = this.tasks
                    .filter(t => t.epic_id === newEpicId && !t.is_completed && t.id !== taskId)
                    .sort((a, b) => a.position - b.position);
                
                // Add moved task at the end
                targetEpicTasks.push(originalTask);
                updates = targetEpicTasks.map((t, index) => ({
                    id: t.id,
                    position: index
                }));
                newPosition = targetEpicTasks.length - 1;
            }
            
            // Single API call: update epic_id and positions together
            if (oldEpicId !== newEpicId || insertPosition !== null) {
                const response = await fetch('/api/tasks/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ 
                        updates,
                        movedTaskId: taskId,
                        oldEpicId: oldEpicId,
                        newEpicId: newEpicId,
                        oldPosition: oldPosition,
                        newPosition: newPosition !== null ? newPosition : undefined
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // Update local data - epic_id and positions
                const localTask = this.tasks.find(t => t.id === taskId);
                if (localTask) {
                    localTask.epic_id = newEpicId;
                }
                
                updates.forEach(update => {
                    const localTask = this.tasks.find(t => t.id === update.id);
                    if (localTask) {
                        localTask.position = update.position;
                    }
                });
            }
            
            this.renderEpics();
            this.showToast('Task moved successfully', 'success');
        } catch (error) {
            console.error('Move task error:', error);
            this.showToast('Failed to move task', 'error');
        } finally {
            // Always remove from reordering set
            this.reorderingTasks.delete(taskId);
        }
    }

    async reorderTasks(taskId, targetTaskId, isAbove = false) {
        try {
            // Validate inputs
            if (!taskId || !targetTaskId || taskId === targetTaskId) {
                return; // No need to reorder if same task or invalid IDs
            }
            
            // Prevent duplicate concurrent reorder calls for the same task
            if (this.reorderingTasks.has(taskId)) {
                return; // Already reordering this task
            }
            this.reorderingTasks.add(taskId);

            // Get current positions and calculate new position
            const task = this.tasks.find(t => t.id === taskId);
            const targetTask = this.tasks.find(t => t.id === targetTaskId);
            
            if (!task || !targetTask) {
                this.reorderingTasks.delete(taskId);
                return;
            }

            if (task.epic_id !== targetTask.epic_id) {
                this.reorderingTasks.delete(taskId);
                return; // Different epics, should use moveTaskToEpic instead
            }

            // Get all tasks in the same epic, sorted by position
            const epicTasks = this.tasks
                .filter(t => t.epic_id === task.epic_id && !t.is_completed)
                .sort((a, b) => a.position - b.position);
            
            const draggedIndex = epicTasks.findIndex(t => t.id === taskId);
            const targetIndex = epicTasks.findIndex(t => t.id === targetTaskId);
            const oldPosition = draggedIndex + 1; // 1-based for display
            
            if (draggedIndex === -1 || targetIndex === -1) {
                this.reorderingTasks.delete(taskId);
                return;
            }

            // Remove the dragged task from its current position
            epicTasks.splice(draggedIndex, 1);
            // Insert it at the new position (adjust based on isAbove flag)
            const newTargetIndex = isAbove ? targetIndex : targetIndex + 1;
            epicTasks.splice(newTargetIndex, 0, task);
            
            // Update positions for all affected tasks
            const updates = epicTasks.map((t, index) => ({
                id: t.id,
                position: index
            }));
            
            const newPosition = epicTasks.findIndex(t => t.id === taskId) + 1; // 1-based for display
            
            // Get epic name for logging
            const epic = this.epics.find(e => e.id === task.epic_id);
            const epicName = epic ? epic.name : 'Unknown';
            
            // Send batch update to server with position change info
            const response = await fetch('/api/tasks/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ 
                    updates,
                    movedTaskId: taskId,
                    oldEpicId: task.epic_id,
                    newEpicId: task.epic_id,
                    oldPosition: oldPosition - 1, // Convert back to 0-based for server
                    newPosition: newPosition - 1 // Convert back to 0-based for server
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Update local data with new positions
            updates.forEach(update => {
                const localTask = this.tasks.find(t => t.id === update.id);
                if (localTask) {
                    localTask.position = update.position;
                }
            });
            
            // Force re-render by clearing and rebuilding the epics
            this.renderEpics();
            this.showToast('Task reordered', 'success');
        } catch (error) {
            console.error('Reorder task error:', error);
            this.showToast('Failed to reorder task', 'error');
        } finally {
            // Always remove from reordering set
            this.reorderingTasks.delete(taskId);
        }
    }

    // Epic Management
    showEpicModal() {
        document.getElementById('epicModal').classList.remove('hidden');
        document.getElementById('epicName').focus();
    }

    hideEpicModal() {
        document.getElementById('epicModal').classList.add('hidden');
        document.getElementById('epicForm').reset();
    }

    async createEpic() {
        const name = document.getElementById('epicName').value.trim();
        const color = document.querySelector('input[name="epicColor"]:checked').value;

        if (!name) {
            this.showToast('Epic name is required', 'error');
            return;
        }

        try {
            // Set flag to prevent WebSocket rendering
            this.isCreatingEpic = true;
            
            const response = await fetch('/api/epics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ name, pastilleColor: color })
            });

            const epic = await response.json();
            this.epics.push(epic);
            this.renderEpics();
            this.hideEpicModal();
            this.showToast('Epic created successfully', 'success');
            
            // Clear flag after a short delay to allow WebSocket event to be ignored
            setTimeout(() => {
                this.isCreatingEpic = false;
            }, 100);
        } catch (error) {
            console.error('Create epic error:', error);
            this.showToast('Failed to create epic', 'error');
            this.isCreatingEpic = false;
        }
    }

    async editEpicName(epicId, clickEvent) {
        const epic = this.epics.find(e => e.id === epicId);
        if (!epic) return;

        const nameElement = document.querySelector(`[data-epic-id="${epicId}"] .epic-name`);
        nameElement.contentEditable = true;
        nameElement.classList.add('editing');
        nameElement.focus();
        
        // Add character counter
        const charCounter = document.createElement('div');
        charCounter.className = 'char-counter';
        charCounter.style.cssText = 'font-size: 0.8rem; color: #6c757d; text-align: right; margin-top: 0.25rem;';
        charCounter.textContent = `${nameElement.textContent.length}/150`;
        nameElement.parentNode.appendChild(charCounter);
        
        // Set cursor position at click location
        if (clickEvent) {
            setTimeout(() => {
                const x = clickEvent.clientX;
                const y = clickEvent.clientY;
                
                // Try modern API first (Chrome/Edge)
                if (document.caretRangeFromPoint) {
                    const range = document.caretRangeFromPoint(x, y);
                    if (range) {
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return;
                    }
                }
                
                // Fallback for Firefox
                if (document.caretPositionFromPoint) {
                    const caretPos = document.caretPositionFromPoint(x, y);
                    if (caretPos) {
                        const range = document.createRange();
                        range.setStart(caretPos.offsetNode, caretPos.offset);
                        range.collapse(true);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return;
                    }
                }
                
                // Fallback: select all if we can't determine position
                const range = document.createRange();
                range.selectNodeContents(nameElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }, 0);
        } else {
            // No click event: select all text
            const range = document.createRange();
            range.selectNodeContents(nameElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }

        let isSaving = false; // Prevent duplicate saves
        const saveEdit = async () => {
            if (isSaving) return; // Already saving
            isSaving = true;
            
            const newName = nameElement.textContent.trim();
            if (newName && newName !== epic.name) {
                // Check character limit upfront
                if (newName.length > 150) {
                    this.showToast('Epic name cannot exceed 150 characters', 'error');
                    nameElement.textContent = epic.name;
                    nameElement.contentEditable = false;
                    nameElement.classList.remove('editing');
                    isSaving = false;
                    return;
                }

                try {
                    await fetch(`/api/epics/${epicId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ name: newName })
                    });
                    
                    epic.name = newName;
                    this.showToast('Epic updated', 'success');
                    
                    // Update activity log if panel is open
                    const activityPanel = document.getElementById('activityPanel');
                    if (activityPanel && activityPanel.classList.contains('open')) {
                        try {
                            const activityResponse = await fetch('/api/activity?limit=50', { credentials: 'same-origin' });
                            this.activityLog = await activityResponse.json();
                            this.renderActivityLog();
                        } catch (error) {
                            console.error('Failed to update activity log:', error);
                        }
                    }
                } catch (error) {
                    console.error('Update epic error:', error);
                    this.showToast('Failed to update epic', 'error');
                    nameElement.textContent = epic.name; // Revert on error
                }
            } else {
                nameElement.textContent = epic.name; // Revert if no change
            }
            
            nameElement.contentEditable = false;
            nameElement.classList.remove('editing');
            
            // Remove character counter
            if (charCounter && charCounter.parentNode) {
                charCounter.parentNode.removeChild(charCounter);
            }
            isSaving = false;
        };

        const blurHandler = () => {
            // Remove keydown listener to prevent double save
            nameElement.removeEventListener('keydown', keydownHandler);
            saveEdit();
        };
        
        const keydownHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameElement.removeEventListener('blur', blurHandler); // Remove blur to prevent double save
                saveEdit();
            } else if (e.key === 'Escape') {
                nameElement.removeEventListener('blur', blurHandler);
                nameElement.removeEventListener('keydown', keydownHandler);
                nameElement.textContent = epic.name;
                nameElement.contentEditable = false;
                nameElement.classList.remove('editing');
                
                // Remove character counter
                if (charCounter && charCounter.parentNode) {
                    charCounter.parentNode.removeChild(charCounter);
                }
            }
        };
        
        nameElement.addEventListener('blur', blurHandler, { once: true });
        nameElement.addEventListener('keydown', keydownHandler);
        
        // Prevent typing beyond 150 characters and add real-time feedback
        nameElement.addEventListener('input', (e) => {
            const currentLength = e.target.textContent.length;
            
            // Prevent typing beyond 150 characters
            if (currentLength > 150) {
                e.target.textContent = e.target.textContent.substring(0, 150);
                // Move cursor to end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(e.target);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // Update character counter
            charCounter.textContent = `${e.target.textContent.length}/150`;
            
            // Visual feedback based on character count
            const length = e.target.textContent.length;
            if (length > 120) {
                nameElement.style.borderColor = '#ffc107';
                nameElement.style.backgroundColor = '#fff3cd';
                charCounter.style.color = '#ffc107';
            } else {
                nameElement.style.borderColor = '#FF6B6B';
                nameElement.style.backgroundColor = '#fff3cd';
                charCounter.style.color = '#6c757d';
            }
        });
        
        // Prevent paste operations that would exceed limit
        nameElement.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const currentText = e.target.textContent;
            const newText = currentText + paste;
            
            if (newText.length <= 150) {
                e.target.textContent = newText;
            } else {
                // Truncate paste to fit within limit
                const remainingChars = 150 - currentText.length;
                if (remainingChars > 0) {
                    e.target.textContent = currentText + paste.substring(0, remainingChars);
                }
            }
        });
    }

    async deleteEpic(epicId) {
        const epic = this.epics.find(e => e.id === epicId);
        if (!epic) return;

        const tasks = this.tasks.filter(t => t.epic_id === epicId);
        
        this.showConfirmModal(
            'Delete Epic',
            `Are you sure you want to delete "${epic.name}"? This will also delete ${tasks.length} task(s).`,
            async () => {
                try {
                    await fetch(`/api/epics/${epicId}`, { 
                        method: 'DELETE',
                        credentials: 'same-origin'
                    });
                    this.epics = this.epics.filter(e => e.id !== epicId);
                    this.tasks = this.tasks.filter(t => t.epic_id !== epicId);
                    this.renderEpics();
                    this.showToast('Epic deleted', 'success');
                } catch (error) {
                    console.error('Delete epic error:', error);
                    this.showToast('Failed to delete epic', 'error');
                }
            }
        );
    }

    // Task Management
    showAddTaskModal(epicId) {
        document.getElementById('taskModal').classList.remove('hidden');
        document.getElementById('taskContent').focus();
        
        // Store the epic ID for task creation
        this.currentEpicId = epicId;
    }

    hideTaskModal() {
        document.getElementById('taskModal').classList.add('hidden');
        document.getElementById('taskForm').reset();
        document.getElementById('charCount').textContent = '0';
    }

    async createTask() {
        const content = document.getElementById('taskContent').value.trim();
        const epicId = this.currentEpicId;

        if (!content) {
            this.showToast('Task content is required', 'error');
            return;
        }

        if (content.length > 150) {
            this.showToast('Task content cannot exceed 150 characters', 'error');
            return;
        }

        if (!epicId) {
            this.showToast('No epic selected', 'error');
            return;
        }

        try {
            // Set flag to prevent WebSocket rendering
            this.isCreatingTask = true;
            
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ content, epicId })
            });

            const task = await response.json();
            this.tasks.push(task);
            this.renderEpics();
            this.hideTaskModal();
            this.showToast('Task created successfully', 'success');
            
            // Clear flag after a short delay to allow WebSocket event to be ignored
            setTimeout(() => {
                this.isCreatingTask = false;
            }, 100);
        } catch (error) {
            console.error('Create task error:', error);
            this.showToast(error.message || 'Failed to create task', 'error');
            this.isCreatingTask = false;
        }
    }

    async editTask(taskId, clickEvent) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const contentElement = document.querySelector(`[data-task-id="${taskId}"] .task-content`);
        contentElement.contentEditable = true;
        contentElement.classList.add('editing');
        contentElement.focus();
        
        // Set cursor position at click location
        if (clickEvent) {
            setTimeout(() => {
                const x = clickEvent.clientX;
                const y = clickEvent.clientY;
                
                // Try modern API first (Chrome/Edge)
                if (document.caretRangeFromPoint) {
                    const range = document.caretRangeFromPoint(x, y);
                    if (range) {
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return;
                    }
                }
                
                // Fallback for Firefox
                if (document.caretPositionFromPoint) {
                    const caretPos = document.caretPositionFromPoint(x, y);
                    if (caretPos) {
                        const range = document.createRange();
                        range.setStart(caretPos.offsetNode, caretPos.offset);
                        range.collapse(true);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        return;
                    }
                }
                
                // Fallback: select all if we can't determine position
                const range = document.createRange();
                range.selectNodeContents(contentElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }, 0);
        } else {
            // No click event: select all text
            const range = document.createRange();
            range.selectNodeContents(contentElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }

        let isSaving = false; // Prevent duplicate saves
        const saveEdit = async () => {
            if (isSaving) return; // Already saving
            isSaving = true;
            
            const newContent = contentElement.textContent.trim();
            if (newContent && newContent !== task.content) {
                if (newContent.length > 150) {
                    this.showToast('Task content cannot exceed 150 characters', 'error');
                    contentElement.textContent = task.content;
                    contentElement.contentEditable = false;
                    contentElement.classList.remove('editing');
                    isSaving = false;
                    return;
                }

                try {
                    await fetch(`/api/tasks/${taskId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ content: newContent })
                    });
                    
                    task.content = newContent;
                    this.showToast('Task updated', 'success');
                    
                    // Update activity log if panel is open
                    const activityPanel = document.getElementById('activityPanel');
                    if (activityPanel && activityPanel.classList.contains('open')) {
                        try {
                            const activityResponse = await fetch('/api/activity?limit=50', { credentials: 'same-origin' });
                            this.activityLog = await activityResponse.json();
                            this.renderActivityLog();
                        } catch (error) {
                            console.error('Failed to update activity log:', error);
                        }
                    }
                } catch (error) {
                    console.error('Update task error:', error);
                    this.showToast('Failed to update task', 'error');
                    contentElement.textContent = task.content; // Revert on error
                }
            } else {
                contentElement.textContent = task.content; // Revert if no change
            }
            
            contentElement.contentEditable = false;
            contentElement.classList.remove('editing');
            isSaving = false;
        };

        const blurHandler = () => {
            // Remove keydown listener to prevent double save
            contentElement.removeEventListener('keydown', keydownHandler);
            saveEdit();
        };
        
        const keydownHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                contentElement.removeEventListener('blur', blurHandler); // Remove blur to prevent double save
                saveEdit();
            } else if (e.key === 'Escape') {
                contentElement.removeEventListener('blur', blurHandler);
                contentElement.removeEventListener('keydown', keydownHandler);
                contentElement.textContent = task.content;
                contentElement.contentEditable = false;
                contentElement.classList.remove('editing');
            }
        };
        
        contentElement.addEventListener('blur', blurHandler, { once: true });
        contentElement.addEventListener('keydown', keydownHandler);
        
        // Prevent typing beyond 150 characters and add real-time feedback
        contentElement.addEventListener('input', (e) => {
            const currentLength = e.target.textContent.length;
            
            // Prevent typing beyond 150 characters
            if (currentLength > 150) {
                e.target.textContent = e.target.textContent.substring(0, 150);
                // Move cursor to end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(e.target);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // Visual feedback based on character count
            const length = e.target.textContent.length;
            if (length > 120) {
                contentElement.style.borderColor = '#ffc107';
                contentElement.style.backgroundColor = '#fff3cd';
            } else {
                contentElement.style.borderColor = '#FF6B6B';
                contentElement.style.backgroundColor = 'white';
            }
        });
        
        // Prevent paste operations that would exceed limit
        contentElement.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const currentText = e.target.textContent;
            const newText = currentText + paste;
            
            if (newText.length <= 150) {
                e.target.textContent = newText;
            } else {
                // Truncate paste to fit within limit
                const remainingChars = 150 - currentText.length;
                if (remainingChars > 0) {
                    e.target.textContent = currentText + paste.substring(0, remainingChars);
                }
            }
        });
    }

    async completeTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/complete`, { 
                method: 'POST',
                credentials: 'same-origin'
            });
            const task = await response.json();
            
            // Remove from active tasks and add to completed
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.completedTasks.unshift(task);
            
            this.renderEpics();
            this.renderCompletedTasks();
            
            // Update stats immediately
            try {
                const statsResponse = await fetch('/api/stats/weekly', { credentials: 'same-origin' });
                const stats = await statsResponse.json();
                this.updateStats(stats);
            } catch (error) {
                console.error('Failed to update stats:', error);
            }
            
            // Update activity log immediately
            try {
                const activityResponse = await fetch('/api/activity?limit=50', { credentials: 'same-origin' });
                this.activityLog = await activityResponse.json();
                
                // Re-render activity log if panel is open
                const activityPanel = document.getElementById('activityPanel');
                if (activityPanel && activityPanel.classList.contains('open')) {
                    this.renderActivityLog();
                }
            } catch (error) {
                console.error('Failed to update activity log:', error);
            }
            
            this.showToast('Task completed! 🎉', 'success');
        } catch (error) {
            console.error('Complete task error:', error);
            this.showToast('Failed to complete task', 'error');
        }
    }

    async reopenTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/reopen`, { 
                method: 'POST',
                credentials: 'same-origin'
            });
            const task = await response.json();
            
            // Remove from completed and add back to active
            this.completedTasks = this.completedTasks.filter(t => t.id !== taskId);
            this.tasks.push(task);
            
            this.renderEpics();
            this.renderCompletedTasks();
            
            // Update stats immediately
            try {
                const statsResponse = await fetch('/api/stats/weekly', { credentials: 'same-origin' });
                const stats = await statsResponse.json();
                this.updateStats(stats);
            } catch (error) {
                console.error('Failed to update stats:', error);
            }
            
            // Update activity log immediately
            try {
                const activityResponse = await fetch('/api/activity?limit=50', { credentials: 'same-origin' });
                this.activityLog = await activityResponse.json();
                
                // Re-render activity log if panel is open
                const activityPanel = document.getElementById('activityPanel');
                if (activityPanel && activityPanel.classList.contains('open')) {
                    this.renderActivityLog();
                }
            } catch (error) {
                console.error('Failed to update activity log:', error);
            }
            
            this.showToast('Task reopened', 'success');
        } catch (error) {
            console.error('Reopen task error:', error);
            this.showToast('Failed to reopen task', 'error');
        }
    }

    async deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.showConfirmModal(
            'Delete Task',
            `Are you sure you want to delete this task?`,
            async () => {
                try {
                    await fetch(`/api/tasks/${taskId}`, { 
                        method: 'DELETE',
                        credentials: 'same-origin'
                    });
                    this.tasks = this.tasks.filter(t => t.id !== taskId);
                    this.renderEpics();
                    this.showToast('Task deleted', 'success');
                } catch (error) {
                    console.error('Delete task error:', error);
                    this.showToast('Failed to delete task', 'error');
                }
            }
        );
    }

    // Completed Tasks Panel
    renderCompletedTasks() {
        const container = document.getElementById('completedTasks');
        container.innerHTML = this.completedTasks.map(task => `
            <div class="completed-task" onclick="app.reopenTask(${task.id})">
                <div class="completed-task-content">${this.escapeHtml(task.content)}</div>
                <div class="completed-task-meta">
                    <span>Completed: ${this.formatDate(task.updated_at)}</span>
                    <span>Click to reopen</span>
                </div>
            </div>
        `).join('');
    }

    showCompletedPanel() {
        document.getElementById('completedPanel').classList.add('open');
    }

    hideCompletedPanel() {
        document.getElementById('completedPanel').classList.remove('open');
    }

    // Activity Panel
    renderActivityLog() {
        const container = document.getElementById('activityLog');
        if (!this.activityLog || this.activityLog.length === 0) {
            container.innerHTML = '<div class="activity-item" style="text-align: center; color: #6c757d; font-style: italic;">No activity yet. Start by creating an epic or task!</div>';
            return;
        }
        
        container.innerHTML = this.activityLog.map(activity => {
            // Check if this is a completed task entry that can be reopened
            const actionText = this.formatActivityAction(activity);
            const isCompletedTask = activity.task_id && 
                (activity.action_type === 'task_completed' || 
                 (activity.action_type === 'task_updated' && actionText.toLowerCase().includes('completed')));
            
            const clickableClass = isCompletedTask ? 'activity-item-clickable' : '';
            const onClick = isCompletedTask ? `onclick="app.reopenTask(${activity.task_id})"` : '';
            const clickHint = isCompletedTask ? '<div class="activity-hint">Click to reopen</div>' : '';
            const details = this.formatActivityDetails(activity);
            
            // Skip empty action text (e.g., generic "Updated task")
            if (!actionText || !actionText.trim()) {
                return '';
            }
            
            return `
            <div class="activity-item ${clickableClass}" ${onClick}>
                <div class="activity-action">${actionText}</div>
                ${details ? `<div class="activity-details">${details}</div>` : ''}
                ${clickHint}
                <div class="activity-time">${this.formatRelativeTime(activity.timestamp)}</div>
            </div>
        `;
        }).join('');
    }

    updateActivityTimes() {
        // Update relative times every minute
        const timeElements = document.querySelectorAll('.activity-time');
        timeElements.forEach((element, index) => {
            if (this.activityLog[index]) {
                element.textContent = this.formatRelativeTime(this.activityLog[index].timestamp);
            }
        });
    }

    formatActivityAction(activity) {
        // If we have a detailed message in the details field, use that as the main message
        if (activity.details && activity.details.trim()) {
            // Clean up escaped quotes and return the clean message
            let message = activity.details.replace(/\\"/g, '"').replace(/^"|"$/g, '');
            
            // Skip JSON-only details (old format from database methods)
            if (message.startsWith('{') && message.endsWith('}')) {
                // This is JSON from old logging format, ignore it and build from activity data instead
                message = null;
            } else if (message && (message.includes('Moved') || message.includes('Edited') || message.includes('Completed') || message.includes('Reopened') || message.includes('Deleted') || message.includes('Created'))) {
                // This is a proper human-readable message with an action verb
                return message;
            }
        }
        
        // Build natural language messages from activity data
        if (activity.task_content) {
            const taskContent = this.escapeHtml(activity.task_content);
            const epicName = activity.epic_name ? ` in <strong>${this.escapeHtml(activity.epic_name)}</strong>` : '';
            
            switch (activity.action_type) {
                case 'task_created':
                    return `Created task "${taskContent}"${epicName}`;
                case 'task_completed':
                    return `Completed task "${taskContent}"${epicName}`;
                case 'task_deleted':
                    return `Deleted task "${taskContent}"${epicName}`;
                case 'task_updated':
                    // For task_updated, use the details field if it has a proper message
                    // Otherwise show generic message
                    if (activity.details && activity.details.trim() && !activity.details.trim().startsWith('{')) {
                        return '';
                    }
                    return `Updated task "${taskContent}"${epicName}`;
                default:
                    return `Task "${taskContent}"${epicName}`;
            }
        }
        
        if (activity.epic_name) {
            const epicName = this.escapeHtml(activity.epic_name);
            switch (activity.action_type) {
                case 'epic_created':
                    return `Created epic <strong>${epicName}</strong>`;
                case 'epic_updated':
                    return `Updated epic <strong>${epicName}</strong>`;
                case 'epic_deleted':
                    return `Deleted epic <strong>${epicName}</strong>`;
                default:
                    return `Epic <strong>${epicName}</strong>`;
            }
        }
        
        // Fallback to generic actions
        const actions = {
            'task_created': 'Task created',
            'task_updated': 'Task updated',
            'task_completed': 'Task completed',
            'task_deleted': 'Task deleted',
            'epic_created': 'Epic created',
            'epic_updated': 'Epic updated',
            'epic_deleted': 'Epic deleted'
        };
        return actions[activity.action_type] || activity.action_type;
    }

    formatActivityDetails(activity) {
        // If details already contain a full message, don't duplicate info
        if (activity.details && activity.details.trim()) {
            const detailsText = activity.details.replace(/\\"/g, '"').replace(/^"|"$/g, '');
            // If details already contain task/epic info, don't add more
            if (detailsText.includes('"') || detailsText.includes('Epic:') || detailsText.includes('epic')) {
                return '';
            }
        }
        
        // Add contextual details for tasks
        if (activity.task_content && activity.epic_name) {
            return `In epic <strong>${this.escapeHtml(activity.epic_name)}</strong>`;
        }
        
        return '';
    }

    updateStats(stats) {
        document.getElementById('weeklyCreated').textContent = stats.created;
        document.getElementById('weeklyCompleted').textContent = stats.completed;
    }

    async showActivityPanel() {
        // Reload activity log from server
        try {
            const response = await fetch('/api/activity?limit=50', { credentials: 'same-origin' });
            this.activityLog = await response.json();
            this.renderActivityLog();
        } catch (error) {
            console.error('Failed to load activity log:', error);
        }
        
        document.getElementById('activityPanel').classList.add('open');
    }

    hideActivityPanel() {
        document.getElementById('activityPanel').classList.remove('open');
    }

    toggleActivityPanel() {
        const panel = document.getElementById('activityPanel');
        if (panel.classList.contains('open')) {
            this.hideActivityPanel();
        } else {
            this.showActivityPanel();
        }
    }

    // WebSocket Setup
    setupSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.socket.emit('join_workspace');
        });

        // Real-time updates
        this.socket.on('task_created', (task) => {
            // Skip if we're currently creating a task locally
            if (this.isCreatingTask) {
                return;
            }
            
            // Only add if not already in the array (prevent duplicates)
            if (!this.tasks.find(t => t.id === task.id)) {
                this.tasks.push(task);
                this.renderEpics();
            }
        });

        this.socket.on('task_updated', (task) => {
            const index = this.tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
                this.tasks[index] = task;
                this.renderEpics();
                
                // Update activity log if panel is open
                const activityPanel = document.getElementById('activityPanel');
                if (activityPanel && activityPanel.classList.contains('open')) {
                    fetch('/api/activity?limit=50', { credentials: 'same-origin' })
                        .then(response => response.json())
                        .then(activities => {
                            this.activityLog = activities;
                            this.renderActivityLog();
                        })
                        .catch(error => console.error('Failed to update activity log:', error));
                }
            }
        });

        this.socket.on('task_completed', (task) => {
            this.tasks = this.tasks.filter(t => t.id !== task.id);
            this.completedTasks.unshift(task);
            this.renderEpics();
            this.renderCompletedTasks();
            
            // Update stats immediately
            fetch('/api/stats/weekly', { credentials: 'same-origin' })
                .then(response => response.json())
                .then(stats => this.updateStats(stats))
                .catch(error => console.error('Failed to update stats:', error));
            
            // Update activity log immediately
            fetch('/api/activity?limit=50', { credentials: 'same-origin' })
                .then(response => response.json())
                .then(activities => {
                    this.activityLog = activities;
                    // Re-render activity log if panel is open
                    const activityPanel = document.getElementById('activityPanel');
                    if (activityPanel && activityPanel.classList.contains('open')) {
                        this.renderActivityLog();
                    }
                })
                .catch(error => console.error('Failed to update activity log:', error));
        });

        this.socket.on('task_reopened', (task) => {
            this.completedTasks = this.completedTasks.filter(t => t.id !== task.id);
            this.tasks.push(task);
            this.renderEpics();
            this.renderCompletedTasks();
            
            // Update stats immediately
            fetch('/api/stats/weekly', { credentials: 'same-origin' })
                .then(response => response.json())
                .then(stats => this.updateStats(stats))
                .catch(error => console.error('Failed to update stats:', error));
            
            // Update activity log immediately
            fetch('/api/activity?limit=50', { credentials: 'same-origin' })
                .then(response => response.json())
                .then(activities => {
                    this.activityLog = activities;
                    // Re-render activity log if panel is open
                    const activityPanel = document.getElementById('activityPanel');
                    if (activityPanel && activityPanel.classList.contains('open')) {
                        this.renderActivityLog();
                    }
                })
                .catch(error => console.error('Failed to update activity log:', error));
        });

        this.socket.on('task_deleted', (data) => {
            this.tasks = this.tasks.filter(t => t.id !== data.id);
            this.completedTasks = this.completedTasks.filter(t => t.id !== data.id);
            this.renderEpics();
            this.renderCompletedTasks();
            
            // Update activity log if panel is open
            const activityPanel = document.getElementById('activityPanel');
            if (activityPanel && activityPanel.classList.contains('open')) {
                fetch('/api/activity?limit=50', { credentials: 'same-origin' })
                    .then(response => response.json())
                    .then(activities => {
                        this.activityLog = activities;
                        this.renderActivityLog();
                    })
                    .catch(error => console.error('Failed to update activity log:', error));
            }
        });

        this.socket.on('epic_created', (epic) => {
            // Skip if we're currently creating an epic locally
            if (this.isCreatingEpic) {
                return;
            }
            
            // Only add if not already in the array (prevent duplicates)
            if (!this.epics.find(e => e.id === epic.id)) {
                this.epics.push(epic);
                this.renderEpics();
            }
        });

        this.socket.on('epic_updated', (epic) => {
            const index = this.epics.findIndex(e => e.id === epic.id);
            if (index !== -1) {
                this.epics[index] = epic;
                this.renderEpics();
                
                // Update activity log if panel is open
                const activityPanel = document.getElementById('activityPanel');
                if (activityPanel && activityPanel.classList.contains('open')) {
                    fetch('/api/activity?limit=50', { credentials: 'same-origin' })
                        .then(response => response.json())
                        .then(activities => {
                            this.activityLog = activities;
                            this.renderActivityLog();
                        })
                        .catch(error => console.error('Failed to update activity log:', error));
                }
            }
        });

        this.socket.on('epic_deleted', (data) => {
            this.epics = this.epics.filter(e => e.id !== data.id);
            this.tasks = this.tasks.filter(t => t.epic_id !== data.id);
            this.renderEpics();
            
            // Update activity log if panel is open
            const activityPanel = document.getElementById('activityPanel');
            if (activityPanel && activityPanel.classList.contains('open')) {
                fetch('/api/activity?limit=50', { credentials: 'same-origin' })
                    .then(response => response.json())
                    .then(activities => {
                        this.activityLog = activities;
                        this.renderActivityLog();
                    })
                    .catch(error => console.error('Failed to update activity log:', error));
            }
        });

        this.socket.on('activity_created', (activity) => {
            // Check if this activity already exists (prevent duplicates)
            const exists = this.activityLog.some(a => 
                a.id === activity.id || 
                (a.task_id === activity.task_id && 
                 a.action_type === activity.action_type && 
                 a.details === activity.details &&
                 Math.abs(new Date(a.timestamp) - new Date(activity.timestamp)) < 1000) // Within 1 second
            );
            
            if (!exists) {
                // Add new activity to the beginning of the log
                this.activityLog.unshift(activity);
                // Keep only the last 50 activities
                if (this.activityLog.length > 50) {
                    this.activityLog = this.activityLog.slice(0, 50);
                }
                // Re-render if activity panel is open
                const activityPanel = document.getElementById('activityPanel');
                if (activityPanel && activityPanel.classList.contains('open')) {
                    this.renderActivityLog();
                }
            }
        });
    }

    // Utility Methods
    showConfirmModal(title, message, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.remove('hidden');
        
        document.getElementById('confirmOk').onclick = () => {
            this.hideConfirmModal();
            onConfirm();
        };
    }

    hideConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    showLoading() {
        document.getElementById('loadingSpinner').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSeconds < 60) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return months === 1 ? '1 month ago' : `${months} months ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            return years === 1 ? '1 year ago' : `${years} years ago`;
        }
    }

    formatRelativeTime(dateString) {
        // Parse the UTC timestamp from server
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSeconds < 60) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return months === 1 ? '1 month ago' : `${months} months ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            return years === 1 ? '1 year ago' : `${years} years ago`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SandRocketApp();
});
