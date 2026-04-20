import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// O interceptador global DEVE ser o primeiro a carregar
import '@/compartilhado/utils/registrarLocal';

// Lida com erros de chunks ao atualizar a versão (Vite SPA cache issue)
window.addEventListener('vite:preloadError', () => {
    window.location.reload();
});

// Limpeza de Service Workers antigos (Evita erros de cache fantasma do Workbox)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
            // Remove antigos SWs (mantendo o do Firebase se for adicionado no futuro)
            if (!registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
                console.info('[App] Desregistrando Service Worker antigo:', registration.active?.scriptURL);
                registration.unregister().then(() => {
                    // Força a recarga para limpar caches presos do Workbox
                    window.location.reload();
                });
            }
        }
    });
}

import './index.css';
import App from './App';

const container = document.getElementById('root');

if (container) {
    const root = createRoot(container);
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}
