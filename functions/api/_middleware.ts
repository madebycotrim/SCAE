/**
 * Middleware de AutenticaÃ§Ã£o â€” Intercepta TODAS as rotas /api/*.
 * Valida JWT Firebase via JWKS (jose) e impÃµe restriÃ§Ã£o de domÃ­nio.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ContextoSCAE, DadosTokenFirebase } from '../types/ambiente';

const ID_PROJETO_FIREBASE = 'scae-b7f8c';

async function processarRequisicao(contexto: ContextoSCAE): Promise<Response> {
    const { request: requisicao, next: proximo } = contexto;

    // Permitir OPTIONS (PreverificaÃ§Ã£o CORS)
    if (requisicao.method === 'OPTIONS') {
        return proximo();
    }

    try {
        const cabecalhoAutenticacao = requisicao.headers.get('Authorization');

        // DEV BYPASS: SÃ³ permite bypass se DEV_AUTH_BYPASS=1 estiver explicitamente configurado
        const url = new URL(requisicao.url);
        const ehAmbienteLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const bypassHabilitado = contexto.env?.DEV_AUTH_BYPASS === '1';

        if (ehAmbienteLocal && bypassHabilitado) {
            if (!cabecalhoAutenticacao) {
                return proximo();
            }
        }

        if (!cabecalhoAutenticacao || !cabecalhoAutenticacao.startsWith('Bearer ')) {
            // Rejeitar se nÃ£o houver token (exceto no bypass acima)
            throw new Error('CabeÃ§alho de autorizaÃ§Ã£o ausente ou invÃ¡lido');
        }

        const token = cabecalhoAutenticacao.split(' ')[1];

        // 1. Verificar Assinatura do Token e ReivindicaÃ§Ãµes (Claims)
        const CONJUNTO_CHAVES_JSON = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

        const { payload: dadosToken } = await jwtVerify(token, CONJUNTO_CHAVES_JSON, {
            issuer: `https://securetoken.google.com/${ID_PROJETO_FIREBASE}`,
            audience: ID_PROJETO_FIREBASE,
        });

        // 2. Impor RestriÃ§Ã£o de DomÃ­nio
        const email = (dadosToken.email as string) || '';

        // Permitir APENAS domÃ­nios especÃ­ficos ou emails de admin/dev
        const dominiosPermitidos = ['@edu.se.df.gov.br'];
        const emailsPermitidos = ['madebycotrim@gmail.com'];

        const acessoPermitido = dominiosPermitidos.some(dominio => email.endsWith(dominio)) || emailsPermitidos.includes(email);

        if (!acessoPermitido) {
            // Registrar tentativa bloqueada
            console.warn(`Tentativa de login bloqueada de: ${email}`);
            throw new Error('Email nÃ£o autorizado. Use uma conta institucional.');
        }

        // Anexar usuÃ¡rio ao contexto para funÃ§Ãµes subsequentes
        contexto.data.user = dadosToken as DadosTokenFirebase;

        return proximo();

    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro de autenticaÃ§Ã£o';
        console.error('Erro de AutenticaÃ§Ã£o:', mensagem);
        return new Response(JSON.stringify({ erro: mensagem }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ExportaÃ§Ã£o com Alias para o Framework
export { processarRequisicao as onRequest };
