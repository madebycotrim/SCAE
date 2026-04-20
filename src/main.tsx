import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// O interceptador global DEVE ser o primeiro a carregar
import '@/compartilhado/utils/registrarLocal';
import { registerSW } from 'virtual:pwa-register';

// --- GATILHO DE CURA AGRESSIVA (SELF-HEAL V2) ---
// Destrói SW antigos e o CacheStorage corrompido que prende as páginas no modo COOP antigo.
const purificarCaches = async () => {
    if ('serviceWorker' in navigator) {
        const registros = await navigator.serviceWorker.getRegistrations();
        let precisaRecarregar = false;
        
        for (const sw of registros) {
            await sw.unregister();
            precisaRecarregar = true;
        }

        if ('caches' in window) {
            const chaves = await caches.keys();
            for (const chave of chaves) {
                await caches.delete(chave);
                precisaRecarregar = true;
            }
        }

        if (precisaRecarregar) {
            window.location.reload();
        }
    }
};
purificarCaches().catch(() => {});
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
