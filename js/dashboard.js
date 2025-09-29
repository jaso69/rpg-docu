// Proteger el dashboard - verificar autenticación
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.authClient) {
        window.location.href = '/index.html';
        return;
    }

    // Verificar si está autenticado
    if (!window.authClient.isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    // Cargar datos del usuario
    const user = window.authClient.getCurrentUser();
    
    if (user.isVerified && user.rol === 'admin') {
        document.body.classList.remove('hidden');
    }

    if (user) {
        document.getElementById('userWelcome').textContent = `${user.name || user.email}`;
    }

    if (!user.isVerified) {
        window.location.href = './verify-email.html';
    }

    if(user.rol === 'guest'){
        window.location.href = './guest.html';
    }

    if (user && user.rol === 'admin') {
        document.getElementById('adminPanel').style.display = 'block';
    }
    console.log(user)
    // Cargar documentos técnicos (aquí integrarías con tu API)
    loadTechnicalDocuments();
});

async function loadTechnicalDocuments() {
    // Aquí cargarías la lista de documentos desde tu API
    console.log('Cargando documentos técnicos...');
}