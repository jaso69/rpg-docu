const API_BASE = 'https://auth-service-eight-mocha.vercel.app/api';
const allowedRoles = ['guest', 'user', 'moderator', 'admin'];

export async function updateRol(userId, newRol, userEmail) {
    const token = getToken();
    if (!token) {
        alert('No hay token de autenticación');
        return null;
    }

    try {
        console.log('🔄 Enviando solicitud de actualización...');
        
        const response = await fetch(`${API_BASE}/updateRol.js`, { // 🔥 Quita .js
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                userId: userId,  // 🔥 Añade userId
                rol: newRol,
                email: userEmail 
            })
        });

        console.log('Respuesta recibida:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Rol actualizado:', data);
            return data;
        } else {
            const errorData = await response.json();
            console.error('❌ Error del servidor:', errorData);
            throw new Error(errorData.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('❌ Error en la petición:', error);
        throw error;
    }
}

function getToken() {
    return localStorage.getItem('rpg_auth_token') || 
           sessionStorage.getItem('rpg_auth_token');
}

// 🔥 MEJORA: Manejo más robusto del evento
document.addEventListener('DOMContentLoaded', function() {
    const buttonUpdate = document.querySelector('#updatedButton');
    const newRolInput = document.querySelector('#newRol');
    const email = document.querySelector('#email');
    if (buttonUpdate && newRolInput) {
        buttonUpdate.addEventListener('click', async () => {
            const userId = getUserIdFromToken(getToken()).id
            const newRol = newRolInput.value;
            console.log(!userId || !newRol);

            if (!newRol) {
                alert('Por favor, ingresa el nuevo rol', newRol);
                return;
            }
            if (!email.value) {
                alert('Por favor, ingresa el email del usuario');
                return;
            }

            try {
                const result = await updateRol(userId, newRol, email.value);
                if (result && result.success) {
                    const { rol, name } = result.user;
                    updateTrue(rol, name);
                } else {
                    alert('❌ Error al actualizar el rol');
                }
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            }
        });
    } else {
        console.error('❌ Elementos del DOM no encontrados');
    }
});

function getUserIdFromToken(token) {
    try {
        if (!token) return null;
        
        // Decodificar el token JWT
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        
        return payload;
    } catch (error) {
        console.error('Error decodificando token:', error);
        return null;
    }
}

function updateTrue(rol, name) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.innerHTML = `✅ Rol actualizado a <strong>${rol}</strong> para el usuario <strong>${name}</strong>`;
        messageDiv.style.color = 'green';
    }
}

// Validar rol
const rol = getUserIdFromToken(getToken())
if (rol.rol !== 'admin') {
    window.location.href = '/dashboard.html';
}

if (rol.rol === 'admin') {
    document.body.classList.remove('hidden');
}

// Redirigir si no está autenticado
if (!getToken()) {
    window.location.href = '/index.html';
}