import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// O interceptador global DEVE ser o primeiro a carregar
import '@/compartilhado/utils/registrarLocal';
import { registerSW } from 'virtual:pwa-register';

// --- GATILHO DE CURA (SELF-HEAL) DE CACHES ANTIGOS ---
// Desregistra SW antigos que ficaram presos em regras de CORS/COOP passadas.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
    }).catch(function(err) {
        console.log('SW Unregister Error: ', err);
    });
}
// -----------------------------------------------------

// Lida com erros de chunks ao atualizar a versão (Vite SPA cache issue)
window.addEventListener('vite:preloadError', () => {
    window.location.reload();
});

// Registra o Service Worker do PWA
registerSW({ immediate: true });

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
