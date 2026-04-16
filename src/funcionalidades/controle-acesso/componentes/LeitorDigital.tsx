/**
 * LeitorDigital — Hook filho do quiosque para leitura de impressao digital.
 *
 * STATUS: Placeholder — aguardando definicao de hardware (WebUSB/WebHID).
 *
 * Responsabilidades futuras:
 * - Comunicar com leitor USB de impressao digital
 * - Comparar template contra cache local
 * - Chamar aoIdentificar(matricula) quando reconhecido
 */

interface OpcoesLeitorDigital {
    elementoId: string;
    escolaId: string;
    aoIdentificar: (matricula: string) => void;
}

export function usarLeitorDigital({ elementoId, escolaId, aoIdentificar }: OpcoesLeitorDigital) {
    // Placeholder — sem implementacao real por enquanto
    return {
        statusCamera: 'INICIALIZANDO' as const,
        mensagem: 'Leitor digital ainda nao implementado. Aguardando definicao de hardware.'
    };
}
