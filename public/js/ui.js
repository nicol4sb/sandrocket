// UI helper functions
const UI = {
    showLoading() {
        document.getElementById('loadingSpinner').classList.remove('hidden');
    },

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('hidden');
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    showConfirmModal(title, message, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.remove('hidden');
        
        document.getElementById('confirmOk').onclick = () => {
            this.hideConfirmModal();
            onConfirm();
        };
    },

    hideConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
    },

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
};
