// Configuración de la API
const API_BASE = 'https://auth-service-eight-mocha.vercel.app/api';

class RegistrationManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Validación en tiempo real
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        
        if (passwordInput && confirmPasswordInput) {
            passwordInput.addEventListener('input', () => this.validatePasswords());
            confirmPasswordInput.addEventListener('input', () => this.validatePasswords());
        }

        // Redirigir si ya está autenticado
        const loginLink = document.querySelector('a[href="index.html"]');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        }
    }

    checkExistingAuth() {
        const token = this.getToken();
        if (token) {
            this.showMessage('Ya tiene una sesión activa. Será redirigido al portal.', 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        this.setButtonState(submitBtn, true, 'Creando Cuenta...');

        try {
            const result = await this.registerUser();
            this.handleRegistrationSuccess(result);
        } catch (error) {
            this.handleRegistrationError(error);
        } finally {
            this.setButtonState(submitBtn, false, 'Crear Cuenta');
        }
    }

    validateForm() {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        // Clear previous messages
        this.clearMessages();

        // Validations
        if (!name) {
            this.showMessage('Por favor, ingrese su nombre completo', 'error');
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showMessage('Por favor, ingrese un email válido', 'error');
            return false;
        }

        if (password.length < 6) {
            this.showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return false;
        }

        if (password !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden', 'error');
            return false;
        }

        if (!terms) {
            this.showMessage('Debe aceptar los términos de servicio', 'error');
            return false;
        }

        return true;
    }

    validatePasswords() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmInput.style.borderColor = '#f87171';
        } else if (confirmPassword) {
            confirmInput.style.borderColor = '#4ade80';
        } else {
            confirmInput.style.borderColor = '#e5e7eb';
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async registerUser() {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const company = document.getElementById('company').value.trim();

        const userData = {
            name: name,
            email: email,
            password: password,
            company: company || undefined
        };

        const response = await fetch(`${API_BASE}/register.js`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        console.log(data)
        if (!response.ok) {
            throw new Error(data.error || 'Error en el registro');
        }

        return data;
    }

    handleRegistrationSuccess(result) {
        this.showMessage('¡Cuenta creada exitosamente! Redirigiendo...', 'success');
        
        // Guardar token y redirigir
        this.saveAuthData(result.token, result.user);
        setTimeout(() => {
             localStorage.setItem('registerEmail', result.user.email);
            // Redirigir a verificación
            window.location.href = `/verify-email.html?email=${encodeURIComponent(result.user.email)}`;
        }, 2000);
    }

    handleRegistrationError(error) {
        console.error('Registration error:', error);
        alert(error.message);
        if (error.message.includes('Ya existe')) {
            this.showMessage('Ya existe una cuenta con este email. ¿Desea <a href="index.html">iniciar sesión</a>?', 'error');
        } else {
            this.showMessage(error.message, 'error');
        }
    }

    saveAuthData(token, user) {
        localStorage.setItem('rpg_auth_token', token);
        localStorage.setItem('rpg_user_data', JSON.stringify(user));
    }

    getToken() {
        return localStorage.getItem('rpg_auth_token');
    }

    showMessage(message, type = 'info') {
        this.clearMessages();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = message;
        
        const container = document.getElementById('messageContainer');
        container.appendChild(messageDiv);
        
        // Auto-remove success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }

    clearMessages() {
        const container = document.getElementById('messageContainer');
        container.innerHTML = '';
    }

    setButtonState(button, loading, text) {
        button.disabled = loading;
        button.innerHTML = loading ? 
            `<span class="loading-spinner"></span> ${text}` : 
            text;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.registrationManager = new RegistrationManager();
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
});