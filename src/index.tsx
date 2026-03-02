import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// O interceptador global DEVE ser o primeiro a carregar
import '@compartilhado/utils/registrarLocal';

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
