import { extrairEscolaId } from '../_seguranca';

/**
 * Valida se a requisição veio de um Agente Local Autorizado OU de um Usuário do Dashboard.
 * Verifica o cabeçalho X-Escola-ID e o X-Agente-Token assinado.
 */
export function validarAgente(request: Request, env: any, data?: any) {
    const escolaId = request.headers.get('X-Escola-ID');
    const tokenAgente = request.headers.get('X-Agente-Token');

    if (!escolaId) {
        throw new Error('Identidade da escola ausente (X-Escola-ID).');
    }

    // --- ROTA DE SERVIÇO (Agente Local) ---
    if (tokenAgente) {
        const secretEsperado = env.AGENTE_SECRET || 'catraki-secret-token-default';
        if (tokenAgente === secretEsperado) return escolaId;

        console.warn(`[Seguranca] Bloqueio: Token Agente Inválido para Escola ${escolaId}`);
        throw new Error('Acesso do Agente Local negado: Token de Segurança Inválido.');
    }

    // --- ROTA ADMINISTRATIVA (Web Dashboard) ---
    // Se não há token de agente, verificamos se o usuário está logado e se pertence a esta escola
    if (data?.usuarioCatraki) {
        // Validação adicional: O X-Escola-ID da request deve bater com o da conta logada (Prevenção de Injeção de Escola)
        if (data.usuarioCatraki.escola_id !== escolaId && data.usuarioCatraki.papel !== 'CENTRAL') {
             throw new Error('Conflito de Identidade: Você não tem permissão para esta unidade.');
        }
        return escolaId;
    }

    throw new Error('Acesso negado: Autenticação do Agente ou do Usuário não encontrada.');
}
