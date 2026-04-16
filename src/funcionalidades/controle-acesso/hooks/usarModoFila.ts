import { useMemo } from 'react';

/**
 * Hook para obter as configurações de feedback e fila do tablet.
 */
export function usarModoFila() {
    return useMemo(() => ({
        ttsAtivado: true,
        duracaoFeedbackMs: 3000,
        animacoesAtivadas: true
    }), []);
}

