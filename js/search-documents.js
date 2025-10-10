const API_BASE = 'https://auth-service-eight-mocha.vercel.app/api';

class DocumentsManager {
    constructor() {
        // Verificar que existe y está autenticado
        
        if (!this.isAuthenticated()) {
            console.log(this.isAuthenticated());
            window.location.href = '/index.html';
            return;
        }
        
        // Obtener datos SIN asignar this.authClient
        this.user = this.getCurrentUser();
        this.token = this.getToken();
        
        console.log('✅ Datos obtenidos:', {
            user: this.user,
            tokenPresent: !!this.token
        });
        this.documents = [];
        console.log(this.user);
        console.log(this.token);
        //this.init();
    }

    
    init() {
        //Verificar autenticación y roles
        if (!this.user) {
            window.location.href = '/index.html';
            return;
        }
        
        if (!this.user.isVerified) {
            window.location.href = './verify-email.html';
            return;
        }
        
        //Si quieres restringir solo a admin, descomenta esto:
        if (this.user.rol !== 'admin') {
                window.location.href = './dashboard.html';
                return;
            }
            
            this.setupEventListeners();
            this.loadUserInfo();
            this.loadDocuments();
        }

    getCurrentUser() {
            if (!this.currentUser) {
                const userData = localStorage.getItem('rpg_user_data');
                if (userData) {
                    this.currentUser = JSON.parse(userData);
                }
            }
            return this.currentUser;
        }
    
    isAuthenticated() {
        return this.currentUser !== null || this.getToken() !== null;
    }
    
    getToken() {
        return localStorage.getItem('rpg_auth_token') || 
                sessionStorage.getItem('rpg_auth_token');
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchDocuments(e.target.value);
                }, 500);
            });
        }

        // Upload form
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.uploadDocument();
            });
        }

        // Edit form
        const editForm = document.getElementById('editForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateDocument();
            });
        }
    }

    loadUserInfo() {
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement && this.user) {
            userEmailElement.textContent = this.user.email || this.user.name || 'Usuario';
        }
    }

    async loadDocuments(searchTerm = '') {
        this.showLoading(true);
        
        try {
            const url = searchTerm 
                ? `${API_BASE}/documents.js?search=${encodeURIComponent(searchTerm)}`
                : `${API_BASE}/documents.js`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.documents = data.documents || [];
                this.renderDocuments();
            } else {
                this.showToast(data.error || 'Error al cargar documentos', 'error');
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            this.showToast('Error de conexión: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async searchDocuments(term) {
        await this.loadDocuments(term);
    }

    renderDocuments() {
        const container = document.getElementById('documentsContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (!container) return;
        
        if (this.documents.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        
        if (emptyState) emptyState.classList.add('hidden');
        
        container.innerHTML = this.documents.map(doc => `
            <div class="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                <div class="p-4">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center">
                            <i class="${this.getFileIcon(doc.file_type)} text-xl mr-3"></i>
                            <div>
                                <h3 class="font-semibold text-gray-900 text-sm truncate max-w-[200px]" title="${doc.name}">
                                    ${doc.name}
                                </h3>
                                <p class="text-xs text-gray-500">${doc.brand} ${doc.model}</p>
                            </div>
                        </div>
                        <div class="relative">
                            <button onclick="docManager.showDocumentMenu('${doc.id}')" class="text-gray-400 hover:text-gray-600 p-1">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${doc.id}" class="hidden absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[120px]">
                                <button onclick="docManager.downloadDocument('${doc.id}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg">
                                    <i class="fas fa-download mr-2"></i>Descargar
                                </button>
                                <button onclick="docManager.editDocument('${doc.id}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <i class="fas fa-edit mr-2"></i>Editar
                                </button>
                                <button onclick="docManager.deleteDocument('${doc.id}')" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg">
                                    <i class="fas fa-trash mr-2"></i>Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-xs text-gray-500 space-y-1">
                        <div class="flex justify-between">
                            <span>Tamaño:</span>
                            <span>${this.formatFileSize(doc.file_size)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Subido:</span>
                            <span>${this.formatDate(doc.created_at)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getFileIcon(fileType) {
        if (fileType?.includes('pdf')) return 'fas fa-file-pdf text-red-500';
        if (fileType?.includes('word') || fileType?.includes('document')) return 'fas fa-file-word text-blue-500';
        return 'fas fa-file text-gray-500';
    }

    async uploadDocument() {
        const form = document.getElementById('uploadForm');
        if (!form) return;
        
        const formData = new FormData();
        
        const documentData = {
            name: document.getElementById('docName').value,
            brand: document.getElementById('docBrand').value,
            model: document.getElementById('docModel').value
        };
        
        const fileInput = document.getElementById('docFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showToast('Selecciona un archivo', 'warning');
            return;
        }
        
        formData.append('document', JSON.stringify(documentData));
        formData.append('file', file);
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Subiendo...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Documento subido exitosamente', 'success');
                this.hideUploadModal();
                form.reset();
                this.loadDocuments();
            } else {
                this.showToast(data.error || 'Error al subir documento', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Error de conexión: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async updateDocument() {
        const documentId = document.getElementById('editDocId').value;
        const updates = {
            name: document.getElementById('editDocName').value,
            brand: document.getElementById('editDocBrand').value,
            model: document.getElementById('editDocModel').value
        };
        
        try {
            const response = await fetch('/api/documents', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ id: documentId, ...updates })
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Documento actualizado', 'success');
                this.hideEditModal();
                this.loadDocuments();
            } else {
                this.showToast(data.error || 'Error al actualizar', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            this.showToast('Error de conexión: ' + error.message, 'error');
        }
    }

    async deleteDocument(documentId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/documents', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ id: documentId })
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Documento eliminado', 'success');
                this.loadDocuments();
            } else {
                this.showToast(data.error || 'Error al eliminar', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Error de conexión: ' + error.message, 'error');
        }
    }

    // En search-documents.js - reemplaza el método downloadDocument
async downloadDocument(documentId) {
    console.log('📥 INICIANDO DESCARGA CON NUEVO MÉTODO');
    console.log('🔍 documentId:', documentId);
    
    const token = localStorage.getItem('rpg_auth_token');
    if (!token) {
        alert('No estás autenticado');
        return;
    }

    console.log('documentId recibido:', documentId);
    try {
        // ✅ URL CORRECTA - sin .js y con parámetros correctos
        const url = `https://auth-service-eight-mocha.vercel.app/api/documents.js?download=true&documentId=${documentId}`;
        console.log('🌐 URL completa:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Estado HTTP:', response.status);
        console.log('📡 OK:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', errorText);
            alert('Error del servidor: ' + response.status);
            return;
        }

        const data = await response.json();
        console.log('📊 Respuesta del servidor:', data);

        if (data.success && data.signedUrl) {
            console.log('✅ URL firmada recibida, abriendo...');
            window.open(data.signedUrl, '_blank');
        } else {
            console.error('❌ Error en la respuesta:', data);
            alert(data.error || 'Error al generar la descarga');
        }

    } catch (error) {
        console.error('❌ Error de conexión:', error);
        alert('Error de conexión: ' + error.message);
    }

    }

    editDocument(documentId) {
        const doc = this.documents.find(d => d.id === documentId);
        if (doc) {
            document.getElementById('editDocId').value = doc.id;
            document.getElementById('editDocName').value = doc.name;
            document.getElementById('editDocBrand').value = doc.brand;
            document.getElementById('editDocModel').value = doc.model;
            this.showEditModal();
        }
    }

    showDocumentMenu(documentId) {
        // Hide all other menus
        document.querySelectorAll('[id^="menu-"]').forEach(menu => {
            menu.classList.add('hidden');
        });
        
        const menu = document.getElementById(`menu-${documentId}`);
        if (menu) {
            menu.classList.toggle('hidden');
        }
        
        // Close menu when clicking outside
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!e.target.closest(`#menu-${documentId}`) && !e.target.closest(`[onclick*="showDocumentMenu('${documentId}')"]`)) {
                    menu.classList.add('hidden');
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    showLoading(show) {
        const loading = document.getElementById('loadingState');
        const container = document.getElementById('documentsContainer');
        
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
        if (container) {
            container.classList.toggle('hidden', show);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');
        
        if (!toast || !toastMessage || !toastIcon) return;
        
        // Set icon and color based on type
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const colors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-600',
            info: 'bg-gray-800'
        };
        
        toast.className = toast.className.replace(/bg-\w+-\d+/, colors[type]);
        toastIcon.className = `fas ${icons[type]} mr-3`;
        toastMessage.textContent = message;
        
        // Show toast
        toast.classList.remove('translate-x-full');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
        }, 3000);
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return 'Fecha desconocida';
        return new Date(dateString).toLocaleDateString('es-ES');
    }
}

// Modal functions
function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.remove('hidden');
}

function hideUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.add('hidden');
}

function showEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.remove('hidden');
}

function hideEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.classList.add('hidden');
}

function logout() {
    logoutClientSide();
}

function logoutClientSide() {
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

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}



// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.id === 'uploadModal') hideUploadModal();
    if (e.target.id === 'editModal') hideEditModal();
});

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('[id^="menu-"]') && !e.target.closest('[onclick*="showDocumentMenu"]')) {
        document.querySelectorAll('[id^="menu-"]').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});
// ==== AÑADE ESTO AL FINAL DE TU ARCHIVO search-documents.js ====

console.log('🔧 search-documents.js cargado - Verificando...');

// Crear la instancia global
window.docManager = new DocumentsManager();

// Verificar que se creó correctamente
if (window.docManager) {
    console.log('✅ DocumentsManager instanciado');
    
    // Llamar a init después de un pequeño delay
    setTimeout(() => {
        console.log('🚀 Ejecutando init()...');
        window.docManager.init();
    }, 100);
} else {
    console.error('❌ No se pudo crear DocumentsManager');
}

// También para cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM completamente cargado');
});