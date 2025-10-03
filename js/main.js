// Configuración de la API
const API_BASE = 'https://auth-service-eight-mocha.vercel.app/api';

// Cliente de autenticación
let authChecked = false;
class AuthClient {
    
    loading = document.getElementById('loading');

    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    init() {
        this.checkAuthState();
        this.setupEventListeners();
    }
    
    // Verificar si el usuario está logueado al cargar la página
    async checkAuthState() {
    // ✅ Prevenir múltiples ejecuciones
    if (authChecked) return;
    authChecked = true;
    
    console.log('🔍 Verificando estado de autenticación...');
    
    const token = this.getToken();
    
    if (token) {
        try {
            const user = await this.verifyToken(token);
            if (user) {
                console.log('✅ Usuario autenticado encontrado:', user.email);
                
                // ✅ NO redirigir inmediatamente, solo actualizar UI
                this.handleSuccessfulAuth(user, false); // false = no redirigir
                
            } else {
                console.log('❌ Token inválido o expirado');
                this.logoutClientSide();
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            this.logoutClientSide();
        }
    } else {
        console.log('🔐 No hay token, usuario no autenticado');
    }
}

    // Configurar event listeners
    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e)
            });
        }

        // Logout si existe el botón (podrías agregarlo)
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    // Manejar el envío del formulario de login
    async handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!username || !password) {
        this.showMessage('Por favor, complete todos los campos', 'error');
        return;
    }

    this.setButtonState(submitBtn, true, 'Accediendo...');

    try {
        loading.classList.remove('hidden');
        const result = await this.login(username, password);
        
        // ✅ Ahora SÍ redirigir después del login
        this.handleSuccessfulAuth(result.user, true); // true = redirigir
        
        this.showMessage(`¡Bienvenido ${result.user.name || result.user.email}!`, 'success');
    } catch (error) {
        this.showMessage(error.message, 'error');
        if (error.message.includes('verifica')) {
            window.location.href = 'verify-email.html';
        }
    } finally {
        this.setButtonState(submitBtn, false, 'Acceder a la Documentación');
    }
}

    // Login con la API
    async login(email, password) {
        const response = await fetch(`${API_BASE}/login.js`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            loading.classList.add('hidden');
            throw new Error(data.error || 'Error en el login');
        }
        
        if (data.success) {
            // Guardar token y datos del usuario
            this.saveAuthData(data.token, data.user);
            return data;
        } else {
            throw new Error(data.error || 'Error desconocido');
        }
    }

    // Verificar token con la API
    async verifyToken(token) {
        const response = await fetch(`${API_BASE}/profile.js`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
        return null;
    }

    // Guardar datos de autenticación
    saveAuthData(token, user) {
        localStorage.setItem('rpg_auth_token', token);
        localStorage.setItem('rpg_user_data', JSON.stringify(user));
        
        // Guardar también en sessionStorage para mayor seguridad
        sessionStorage.setItem('rpg_auth_token', token);
        
        this.currentUser = user;
    }

    // Obtener token almacenado
    getToken() {
        return localStorage.getItem('rpg_auth_token') || 
               sessionStorage.getItem('rpg_auth_token');
    }

    // Manejar autenticación exitosa
    // Manejar autenticación exitosa
handleSuccessfulAuth(user, shouldRedirect = true) {
    loading.classList.add('hidden');
    this.currentUser = user;
    
    // ✅ Actualizar UI para mostrar que está logueado
    this.updateUIForLoggedInUser(user);
    
    // ✅ SOLO redirigir si se indica explícitamente (después de login)
    if (shouldRedirect) {
        console.log('🔄 Redirigiendo a dashboard...');
        this.showProtectedContent(user);
    }
}

    // Mostrar contenido protegido (redirigir o cargar dinámicamente)
    showProtectedContent(user) {
        // Aquí puedes redirigir a otra página o cargar contenido dinámicamente
        console.log('Usuario autenticado:', user);
        
        // Ejemplo: redirigir a dashboard después de 1 segundo
        setTimeout(() => {
            window.location.replace('/dashboard.html') // Crea esta página
        }, 1000);
    }

    // Actualizar UI para usuario logueado
    // Actualizar UI para usuario logueado
updateUIForLoggedInUser(user) {
    const loginBox = document.querySelector('.login-box');
    if (loginBox) {
        loginBox.innerHTML = `
            <h3>¡Bienvenido, ${user.name || user.email}!</h3>
            <div class="user-welcome">
                <p>Acceso concedido al portal técnico</p>
                <div class="user-actions">
                    <button id="goToDashboard" class="btn btn-primary">
                        Ir al Dashboard
                    </button>
                    <button id="logoutBtn" class="btn btn-secondary">
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        `;
        
        // ✅ Agregar event listeners a los nuevos botones
        document.getElementById('goToDashboard').addEventListener('click', () => {
            this.redirectToDashboard();
        });
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
    }
}

    // Redirigir al dashboard
    redirectToDashboard() {
        window.location.href = '/dashboard.html';
    }

    // Manejar logout
    handleLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            this.logoutClientSide();
            this.showMessage('Sesión cerrada correctamente', 'success');
        }
    }

    // Logout completamente en el cliente
    logoutClientSide() {
        // Eliminar datos de autenticación
        localStorage.removeItem('rpg_auth_token');
        localStorage.removeItem('rpg_user_data');
        sessionStorage.removeItem('rpg_auth_token');
        
        // Eliminar cookies
        this.deleteCookie('token');
        
        this.currentUser = null;
        
        // Recargar la página para mostrar el formulario de login
        window.location.reload();
    }

    // Eliminar cookie
    deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }

    // Mostrar mensajes al usuario
    showMessage(message, type = 'info') {
        // Eliminar mensajes anteriores
        this.removeExistingMessages();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;

        // Estilos según el tipo
        if (type === 'error') {
            messageDiv.style.background = '#f44336';
        } else if (type === 'success') {
            messageDiv.style.background = '#4CAF50';
        } else {
            messageDiv.style.background = '#2196F3';
        }

        document.body.appendChild(messageDiv);

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => messageDiv.remove(), 300);
            }
        }, 5000);
    }

    // Eliminar mensajes existentes
    removeExistingMessages() {
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
    }

    // Cambiar estado del botón
    setButtonState(button, loading, text) {
        button.disabled = loading;
        button.innerHTML = loading ? 
            '<span class="loading-spinner"></span> ' + text : 
            text;
    }

    // Verificar si está autenticado (para otras páginas)
    isAuthenticated() {
        return this.currentUser !== null || this.getToken() !== null;
    }

    // Obtener usuario actual
    getCurrentUser() {
        if (!this.currentUser) {
            const userData = localStorage.getItem('rpg_user_data');
            if (userData) {
                this.currentUser = JSON.parse(userData);
            }
        }
        return this.currentUser;
    }
}


// Estilos CSS para los mensajes y spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .loading-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .user-welcome {
        text-align: center;
        padding: 20px;
    }
    
    .user-actions {
        margin-top: 15px;
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .btn-primary {
        background: #4CAF50;
    }
    
    .btn-secondary {
        background: #757575;
    }
    
    .btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
`;
document.head.appendChild(style);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.authClient = new AuthClient();
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
});

// Exportar para usar en otros archivos
//export default AuthClient;
