import { ErroPermissao } from '../erros';
import { extrairEscolaId } from '../_seguranca';

/**
 * Valida se a requisição veio de um Agente Local autorizado.
 * Usa um token fixo compartilhado definido no Environment.
 */
export function validarAgente(request: Request, env: any) {
    const authHeader = request.headers.get('Authorization');
    const tokenEsperado = env.SCAE_AGENTE_TOKEN;

    if (!tokenEsperado) {
        console.error('[Agente] Erro de Servidor: SCAE_AGENTE_TOKEN não está configurado na Cloudflare.');
        throw new Error('Erro de configuração de segurança central.');
    }

    if (!authHeader || authHeader !== `Bearer ${tokenEsperado}`) {
        throw new ErroPermissao('Token de Agente inválido ou ausente.');
    }

    return extrairEscolaId(request);
}
