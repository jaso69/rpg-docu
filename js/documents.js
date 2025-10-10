// upload-documents.js - VERSIÓN CORREGIDA PARA R2 CON DESCARGA
class DocumentUpload {
    constructor() {
        this.API_BASE = 'https://auth-service-eight-mocha.vercel.app/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserInfo();
    }

    setupEventListeners() {
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }

        // Mostrar nombre del archivo seleccionado
        const fileInput = document.getElementById('file');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Auto-generar nombre del documento
        const brandInput = document.getElementById('brand');
        const modelInput = document.getElementById('model');
        const typeInput = document.getElementById('type');
        const nameInput = document.getElementById('name');

        if (brandInput && modelInput && typeInput && nameInput) {
            [brandInput, modelInput, typeInput].forEach(input => {
                input.addEventListener('input', () => this.generateDocumentName());
            });
        }
    }

    loadUserInfo() {
        const userData = localStorage.getItem('rpg_user_data');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const userNameElement = document.getElementById('userName');
                if (userNameElement) {
                    userNameElement.textContent = user.name || user.email;
                }
            } catch (error) {
                console.error('Error loading user info:', error);
            }
        }
    }

    generateDocumentName() {
        const brand = document.getElementById('brand').value.trim();
        const model = document.getElementById('model').value.trim();
        const type = document.getElementById('type').value;
        const nameInput = document.getElementById('name');

        if (brand && model && type && !nameInput.value) {
            const typeNames = {
                'manual': 'Manual de Usuario',
                'specs': 'Especificaciones Técnicas',
                'diagram': 'Diagrama de Conexiones',
                'firmware': 'Firmware y Actualizaciones',
                'guide': 'Guía Rápida'
            };

            const generatedName = `${typeNames[type] || 'Documento'} ${brand} ${model}`;
            nameInput.value = generatedName;
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        const fileNameElement = document.getElementById('fileName');
        
        if (file) {
            // Validar tipo de archivo
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                this.showMessage('Solo se permiten archivos PDF, DOC y DOCX', 'error');
                event.target.value = '';
                fileNameElement.classList.add('hidden');
                return;
            }

            // Validar tamaño (25MB para R2)
            if (file.size > 25 * 1024 * 1024) {
                this.showMessage('El archivo no puede ser mayor a 25MB', 'error');
                event.target.value = '';
                fileNameElement.classList.add('hidden');
                return;
            }

            fileNameElement.textContent = `Archivo seleccionado: ${file.name}`;
            fileNameElement.classList.remove('hidden');
        } else {
            fileNameElement.classList.add('hidden');
        }
    }

    async handleUpload(event) {
        event.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        this.setButtonState(submitBtn, true, 'Subiendo...');

        try {
            const result = await this.uploadDocument();
            this.handleUploadSuccess(result);
        } catch (error) {
            this.handleUploadError(error);
        } finally {
            this.setButtonState(submitBtn, false, 'Subir Documento');
        }
    }

    validateForm() {
        const requiredFields = ['brand', 'model', 'name', 'type', 'category', 'file'];
        
        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                this.showMessage(`El campo ${field.labels[0]?.textContent || fieldId} es obligatorio`, 'error');
                field.focus();
                return false;
            }
        }

        const file = document.getElementById('file').files[0];
        if (file && file.size > 25 * 1024 * 1024) {
            this.showMessage('El archivo no puede ser mayor a 25MB', 'error');
            return false;
        }

        return true;
    }

    async uploadDocument() {
        const token = localStorage.getItem('rpg_auth_token');
        if (!token) {
            throw new Error('No estás autenticado. Por favor, inicia sesión.');
        }

        const file = document.getElementById('file').files[0];
        
        // Crear FormData para enviar archivo + metadata
        const formData = new FormData();
        
        // Datos del documento como JSON string
        const documentData = {
            name: document.getElementById('name').value.trim(),
            type: document.getElementById('type').value,
            category: document.getElementById('category').value,
            brand: document.getElementById('brand').value.trim(),
            model: document.getElementById('model').value.trim(),
            description: document.getElementById('description').value.trim(),
            keywords: this.parseKeywords(document.getElementById('keywords').value)
        };

        // Agregar datos y archivo al FormData
        formData.append('document', JSON.stringify(documentData));
        formData.append('file', file);
        const form = documentData;
        const response = await fetch(`${this.API_BASE}/upload-url.js?fileType=' + encodeURIComponent(file.type)`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
                // No Content-Type para FormData - el navegador lo establece automáticamente
            },
        });

        const { signedUrl, publicUrl, key, documentId } = await response.json();

        const putRes = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file
        });

        const meta = {
            name: form.name,
            brand: form.brand,
            model: form.model,
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type
        };

        const res2 = await fetch(`${this.API_BASE}/documents.js`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(meta)
        });
        const data = await res2.json();
        console.log(data)
        if (!putRes.ok) throw new Error('Falló la subida a R2');

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al subir el documento');
        }

        return await data;
    }


// Método fallback con URL pública
async tryPublicUrlFallback(documentId) {
    try {
        console.log('🔄 Intentando fallback con URL pública...');
        
        const document = await this.getDocumentInfo(documentId);
        if (document && document.file_url) {
            console.log('🔗 Usando URL pública como fallback:', document.file_url);
            window.open(document.file_url, '_blank');
            this.showMessage('Descarga iniciada (URL pública)', 'info');
        }
    } catch (fallbackError) {
        console.error('❌ Fallback también falló:', fallbackError);
    }
}

    // 🔽 MÉTODO AUXILIAR PARA OBTENER INFORMACIÓN DEL DOCUMENTO
    async getDocumentInfo(documentId) {
        const token = localStorage.getItem('rpg_auth_token');
        
        const response = await fetch(`${this.API_BASE}/documents.js`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status} al obtener documentos`);
        }

        const data = await response.json();
        
        if (data.success && data.documents) {
            // Buscar el documento específico por ID
            const document = data.documents.find(doc => doc.id === documentId);
            return document || null;
        }
        
        return null;
    }

    // 🔽 MÉTODO PARA DESCARGAR DIRECTAMENTE DESDE URL (más simple)
    downloadDocumentFromURL(fileUrl, fileName = 'documento') {
        if (!fileUrl) {
            this.showMessage('URL del documento no disponible', 'error');
            return;
        }

        try {
            console.log('📥 Descargando desde URL:', fileUrl);
            
            // Crear un enlace temporal para la descarga
            const link = document.createElement('a');
            link.href = fileUrl;
            link.target = '_blank';
            link.download = fileName;
            
            // Simular click para iniciar descarga
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('Descarga iniciada', 'success');
            
        } catch (error) {
            console.error('Error en descarga directa:', error);
            this.showMessage('Error al descargar: ' + error.message, 'error');
        }
    }

    parseKeywords(keywordsString) {
        if (!keywordsString.trim()) return [];
        
        return keywordsString.split(',')
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 0);
    }

    handleUploadSuccess(result) {
        this.showMessage('¡Documento subido exitosamente a Cloudflare R2!', 'success');
        
        // Mostrar información del documento subido
        if (result.document) {
            const doc = result.document;
            this.showMessage(
                `✅ <strong>${doc.name}</strong> subido correctamente.<br>
                 📁 Archivo: ${doc.file_name}<br>
                 🔗 URL: <a href="${doc.file_url}" target="_blank" class="underline">Ver documento</a>`, 
                'success'
            );
        }
        
        // Limpiar formulario
        document.getElementById('uploadForm').reset();
        document.getElementById('fileName').classList.add('hidden');
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
            window.location.href = 'search-documents.html';
        }, 3000);
    }

    handleUploadError(error) {
        console.error('Upload error:', error);
        
        if (error.message.includes('autenticado') || error.message.includes('Token')) {
            this.showMessage('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        } else if (error.message.includes('Tipo de archivo')) {
            this.showMessage('Tipo de archivo no permitido. Solo se aceptan PDF, DOC y DOCX.', 'error');
        } else if (error.message.includes('demasiado grande')) {
            this.showMessage('El archivo es demasiado grande. Máximo 25MB.', 'error');
        } else {
            this.showMessage(error.message, 'error');
        }
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        // Limpiar mensajes anteriores
        container.innerHTML = '';

        const messageDiv = document.createElement('div');
        messageDiv.className = `p-4 rounded-lg mb-4 ${
            type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 
            type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 
            'bg-blue-100 text-blue-700 border border-blue-200'
        }`;
        messageDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                    <span>${message}</span>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(messageDiv);

        // Auto-remove success messages después de 8 segundos (más tiempo para leer la info)
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 8000);
        }
    }

    setButtonState(button, loading, text) {
        if (button) {
            button.disabled = loading;
            button.innerHTML = loading ? 
                `<span class="loading-spinner"></span> ${text}` : 
                `<i class="fas fa-upload"></i><span>${text}</span>`;
        }
    }

    // En tu search-documents.js - USA ESTE MÉTODO EXACTO
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
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.documentUpload = new DocumentUpload();
});