import { useState, useEffect } from 'react';

/**
 * Hook para lidar com a instalação do PWA (Botão de 'Download').
 */
export function usarInstalacaoPWA() {
    const [eventoInstalacao, setEventoInstalacao] = useState<any>(null);
    const [podeInstalar, setPodeInstalar] = useState(false);

    useEffect(() => {
        const lidarComPrompt = (e: any) => {
            // Impede o navegador de mostrar o prompt automático
            e.preventDefault();
            // Guarda o evento para disparar depois
            setEventoInstalacao(e);
            setPodeInstalar(true);
        };

        window.addEventListener('beforeinstallprompt', lidarComPrompt);

        // Verifica se já está instalado (modo standalone)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setPodeInstalar(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', lidarComPrompt);
    }, []);

    const instalarApp = async () => {
        if (!eventoInstalacao) return;

        // Mostra o prompt de instalação
        eventoInstalacao.prompt();

        // Aguarda a escolha do usuário
        const { outcome } = await eventoInstalacao.userChoice;

        if (outcome === 'accepted') {
            setPodeInstalar(false);
            setEventoInstalacao(null);
        }
    };

    return { podeInstalar, instalarApp };
}
