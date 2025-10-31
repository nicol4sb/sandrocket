// Authentication module
const AuthModule = {
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
    },

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },

    async login() {
        const password = document.getElementById('password').value;
        
        try {
            this.showLoading();
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
    },

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
    },

    showLogin() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        document.getElementById('password').focus();
    },

    showApp() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }
};

