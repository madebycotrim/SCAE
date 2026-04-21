/**
 * Opções de configuração do leitor biométrico digital.
 */
interface OpcoesLeitorDigital {
    /** ID do elemento HTML de referência */
    elementoId: string;
    /** ID da escola contextuada */
    escolaId: string;
    /** Callback chamado ao identificar uma biometria válida */
    aoIdentificar: (matricula: string) => void;
}

/**
 * Gancho para integração com hardware de impressão digital (WebUSB/WebHID).
 * @status Protótipo operacional aguardando drivers específicos.
 */
export function usarLeitorDigital({ elementoId, escolaId, aoIdentificar }: OpcoesLeitorDigital) {
    // Nota: A implementação real depende do driver WebUSB/serial fornecido pelo fabricante do leitor.
    return {
        statusCamera: 'INICIALIZANDO' as const,
        mensagem: 'O leitor digital está em fase de homologação de hardware.'
    };
}
