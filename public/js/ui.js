// UI helper functions
export const showLoading = () => {
    document.getElementById('loadingSpinner').classList.remove('hidden');
};

export const hideLoading = () => {
    document.getElementById('loadingSpinner').classList.add('hidden');
};

export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

export const showConfirmModal = (title, message, onConfirm) => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.remove('hidden');
    
    document.getElementById('confirmOk').onclick = () => {
        hideConfirmModal();
        onConfirm();
    };
};

export const hideConfirmModal = () => {
    document.getElementById('confirmModal').classList.add('hidden');
};

export const hideAllModals = () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
};

