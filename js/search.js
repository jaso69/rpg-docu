// search-documents.js - VERSIÓN CORREGIDA
class DocumentSearch {
    constructor() {
        this.API_BASE = 'https://auth-service-eight-mocha.vercel.app/api'; // Tu backend
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Ya no necesitamos loadAvailableDocuments() porque lo maneja el backend
    }

    setupEventListeners() {
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        // Búsqueda en tiempo real con debounce
        const searchInput = document.getElementById('searchQuery');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                if (searchInput.value.length > 2) {
                    this.handleSearch(null, true);
                }
            }, 500));
        }
    }

    async handleSearch(event, isRealTime = false) {
        if (event) event.preventDefault();
        
        const query = document.getElementById('searchQuery').value.trim();
        if (!query && !isRealTime) {
            this.showMessage('Por favor, ingresa un término de búsqueda', 'error');
            return;
        }

        if (query.length < 2 && !isRealTime) {
            this.showMessage('Ingresa al menos 2 caracteres', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // ✅ LLAMADA CORREGIDA al endpoint correcto
            const results = await this.searchDocuments(query);
            this.displayResults(results, query);
        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.showMessage('Error al realizar la búsqueda: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async searchDocuments(query) {
        const token = localStorage.getItem('rpg_auth_token');
        if (!token) {
            throw new Error('No estás autenticado. Por favor, inicia sesión.');
        }

        // ✅ CORREGIDO: Endpoint correcto (sin .js) y estructura de datos simplificada
        const response = await fetch(`${this.API_BASE}/documents.js`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: query
                // El backend ya tiene los documentos, no necesitamos enviarlos
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en la búsqueda');
        }

        const data = await response.json();
        
        // ✅ Devolvemos los resultados directamente
        return data.results || [];
    }

    displayResults(results, query) {
        const container = document.getElementById('resultsContainer');
        
        if (!results || results.length === 0) {
            container.innerHTML = this.getNoResultsHTML(query);
            return;
        }

        let html = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">Resultados para "${query}"</h3>
                <span class="text-gray-500">${results.length} documento(s) encontrado(s)</span>
            </div>
        `;

        results.forEach(doc => {
            const icon = this.getDocumentIcon(doc.type);
            html += `
                <div class="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition duration-200">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <span class="text-blue-600">${icon}</span>
                                <h4 class="font-semibold text-gray-900">${doc.name}</h4>
                                <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full capitalize">
                                    ${doc.type}
                                </span>
                                ${doc.confidence ? `
                                    <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                        ${Math.round(doc.confidence * 100)}% coincidencia
                                    </span>
                                ` : ''}
                            </div>
                            <p class="text-gray-600 text-sm mb-3">${doc.description || 'Documento técnico del equipo'}</p>
                            <div class="flex items-center space-x-4 text-sm text-gray-500">
                                <span><i class="fas fa-file-pdf mr-1"></i> PDF</span>
                                <span><i class="fas fa-weight-hanging mr-1"></i> ${this.formatFileSize(doc.file_size)}</span>
                                <span><i class="fas fa-tag mr-1"></i> ${doc.brand} ${doc.model}</span>
                            </div>
                            ${doc.matchReason ? `
                                <div class="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    ${doc.matchReason}
                                </div>
                            ` : ''}
                        </div>
                        <div class="flex space-x-2">
                            <a href="${doc.file_url}" 
                               class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center space-x-2"
                               target="_blank">
                                <i class="fas fa-download"></i>
                                <span>Descargar</span>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    getNoResultsHTML(query) {
        return `
            <div class="text-center py-8">
                <i class="fas fa-search text-gray-400 text-4xl mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">No se encontraron resultados</h3>
                <p class="text-gray-500">No encontramos documentos para "${query}" en nuestra base de datos.</p>
                <div class="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <p class="text-yellow-800 mb-3">
                        <i class="fas fa-lightbulb mr-2"></i>
                        <strong>Sugerencia:</strong> Prueba buscar en internet o contáctanos para agregar este documento.
                    </p>
                    <button onclick="documentSearch.searchOnline('${query}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200">
                        <i class="fas fa-external-link-alt mr-2"></i>
                        Buscar en internet
                    </button>
                </div>
            </div>
        `;
    }

    getDocumentIcon(type) {
        const icons = {
            'manual': '<i class="fas fa-book"></i>',
            'specs': '<i class="fas fa-list-alt"></i>',
            'diagram': '<i class="fas fa-project-diagram"></i>',
            'firmware': '<i class="fas fa-microchip"></i>',
            'guide': '<i class="fas fa-graduation-cap"></i>'
        };
        return icons[type] || '<i class="fas fa-file"></i>';
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Tamaño desconocido';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    searchOnline(query) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' manual especificaciones documento técnico audiovisual')}`;
        window.open(searchUrl, '_blank');
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const results = document.getElementById('resultsContainer');
        
        if (show) {
            loading.classList.remove('hidden');
            results.innerHTML = '';
        } else {
            loading.classList.add('hidden');
        }
    }

    showMessage(message, type = 'info') {
        // Eliminar mensajes anteriores
        const existingMessage = document.querySelector('.search-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `search-message p-4 rounded-lg mb-4 ${
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

        const container = document.querySelector('.max-w-4xl');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.documentSearch = new DocumentSearch();
});