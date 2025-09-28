// Configuración de la API
const API_BASE = 'https://auth-service-eight-mocha.vercel.app/api';

class VerificationManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.preloadEmail();
        this.setupCodeInputs();
    }

    setupEventListeners() {
        const verifyForm = document.getElementById('verifyForm');
        if (verifyForm) {
            verifyForm.addEventListener('submit', (e) => this.handleVerification(e));
        }
    }

    setupCodeInputs() {
        const inputs = document.querySelectorAll('.code-input');
        
        inputs.forEach((input, index) => {
            // Auto-enfocar el primer input
            if (index === 0) {
                input.focus();
            }

            // Manejar input
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1) {
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                }
            });

            // Manejar borrado con Backspace
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '') {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    }
                }
            });

            // Prevenir caracteres no numéricos
            input.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
        });
    }

    preloadEmail() {
        // Obtener email de la URL o localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const emailFromUrl = urlParams.get('email');
        const emailFromStorage = localStorage.getItem('registerEmail');
        
        const email = emailFromUrl || emailFromStorage;
        const userEmailElement = document.getElementById('userEmail');
        
        if (userEmailElement && email) {
            userEmailElement.textContent = email;
            localStorage.setItem('registerEmail', email);
        } else if (userEmailElement) {
            userEmailElement.textContent = 'No especificado';
            this.showMessage('No se encontró el email para verificar', 'error');
        }
    }

    async handleVerification(event) {
        event.preventDefault();
        
        const code = this.getVerificationCode();
        if (!this.validateCode(code)) {
            return;
        }

        const submitBtn = document.getElementById('verifyBtn');
        this.setButtonState(submitBtn, true, 'Verificando...');

        try {
            const result = await this.verifyCode(code);
            this.handleVerificationSuccess(result);
        } catch (error) {
            this.handleVerificationError(error);
        } finally {
            this.setButtonState(submitBtn, false, 'Verificar Código');
        }
    }

    getVerificationCode() {
        const inputs = document.querySelectorAll('.code-input');
        let code = '';
        inputs.forEach(input => {
            code += input.value;
        });
        return code;
    }

    validateCode(code) {
        if (code.length !== 6) {
            this.showMessage('El código debe tener exactamente 6 dígitos', 'error');
            return false;
        }

        if (!/^\d+$/.test(code)) {
            this.showMessage('El código debe contener solo números', 'error');
            return false;
        }

        return true;
    }

    async verifyCode(code) {
        const email = localStorage.getItem('registerEmail');
        
        if (!email) {
            throw new Error('No se encontró el email para verificar');
        }

        const verificationData = {
            email: email,
            code: code
        };

        console.log('Enviando datos de verificación:', verificationData);

        const response = await fetch(`${API_BASE}/verify-code.js`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(verificationData)
        });

        const data = await response.json();
        console.log('Respuesta del servidor:', data);

        if (!response.ok) {
            throw new Error(data.error || `Error en la verificación: ${response.status}`);
        }

        return data;
    }

    handleVerificationSuccess(result) {
        this.showMessage('¡Email verificado exitosamente! Redirigiendo...', 'success');
        
        // Guardar datos de autenticación si vienen en la respuesta
        if (result.token) {
            localStorage.setItem('rpg_auth_token', result.token);
        }
        if (result.user) {
            localStorage.setItem('rpg_user_data', JSON.stringify(result.user));
        }

        // Limpiar email temporal
        localStorage.removeItem('registerEmail');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    handleVerificationError(error) {
        console.error('Verification error:', error);
        
        if (error.message.includes('400')) {
            this.showMessage('Código inválido o expirado. Por favor, verifique el código e intente nuevamente.', 'error');
        } else if (error.message.includes('404')) {
            this.showMessage('No se encontró la solicitud de verificación. ¿Desea <a href="register.html">registrarse nuevamente</a>?', 'error');
        } else {
            this.showMessage(error.message, 'error');
        }
    }

    showMessage(message, type = 'info') {
        this.clearMessages();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = message;
        
        const container = document.getElementById('messageContainer');
        if (container) {
            container.appendChild(messageDiv);
        }
        
        // Auto-remove success messages
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
        if (container) {
            container.innerHTML = '';
        }
    }

    setButtonState(button, loading, text) {
        if (button) {
            button.disabled = loading;
            button.innerHTML = loading ? 
                `<span class="loading-spinner"></span> ${text}` : 
                text;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.verificationManager = new VerificationManager();
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
});