/**
 * Middleware de Autenticação — Intercepta TODAS as rotas /api/*.
 * Valida JWT Firebase via JWKS (jose) e impõe restrição de domínio dinâmica.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ContextoSCAE, DadosTokenFirebase } from '../tipos/ambiente';

const ID_PROJETO_FIREBASE = 'scae-b7f8c';

async function processarRequisicao(contexto: ContextoSCAE): Promise<Response> {
    const { request: requisicao, next: proximo } = contexto;

    // Permitir OPTIONS (Preverificação CORS)
    if (requisicao.method === 'OPTIONS') {
        return proximo();
    }

    try {
        const cabecalhoAutenticacao = requisicao.headers.get('Authorization');

        // DEV BYPASS
        const url = new URL(requisicao.url);
        const ehAmbienteLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const bypassHabilitado = contexto.env?.DEV_AUTH_BYPASS === '1';

        if (ehAmbienteLocal && bypassHabilitado) {
            if (!cabecalhoAutenticacao) {
                return proximo();
            }
        }

        if (!cabecalhoAutenticacao || !cabecalhoAutenticacao.startsWith('Bearer ')) {
            throw new Error('Cabeçalho de autorização ausente ou inválido');
        }

        const token = cabecalhoAutenticacao.split(' ')[1];

        // 1. Verificar Assinatura
        const CONJUNTO_CHAVES_JSON = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

        const { payload: dadosToken } = await jwtVerify(token, CONJUNTO_CHAVES_JSON, {
            issuer: https://securetoken.google.com/,
            audience: ID_PROJETO_FIREBASE,
        });

        const email = (dadosToken.email as string) || '';
        const emailsPermitidos = ['madebycotrim@gmail.com'];
        const eAdminGlobal = emailsPermitidos.includes(email);

        // 2. Validar Escola e Buscar Domínio
        const idEscola = requisicao.headers.get('X-Escola-ID');

        if (eAdminGlobal && !idEscola) {
            contexto.data.user = dadosToken as DadosTokenFirebase;
            return proximo();
        }

        if (!idEscola) {
            throw new Error('ID da Escola (X-Escola-ID) obrigatório para esta operação.');
        }

        const escola = await contexto.env.DB_SCAE.prepare(
            "SELECT dominio_email FROM escolas WHERE id = ?"
        ).bind(idEscola).first<{ dominio_email: string | null }>();

        if (!escola) {
            throw new Error('Escola não cadastrada ou inválida.');
        }

        // 3. Impor Restrição de Domínio
        const dominioEscola = escola.dominio_email;
        const temRelacaoComDominio = dominioEscola && email.endsWith(@);

        if (!temRelacaoComDominio && !eAdminGlobal) {
            throw new Error(Email não autorizado para esta escola. Use sua conta institucional @.);
        }

        // 4. Validar usuário NAQUELA escola
        const usuarioScae = await contexto.env.DB_SCAE.prepare(
            "SELECT * FROM usuarios WHERE email = ? AND escola_id = ? AND ativo = 1"
        ).bind(email, idEscola).first();

        if (!usuarioScae && !eAdminGlobal) {
            return new Response(JSON.stringify({ erro: 'Usuário não vinculado a esta escola ou inativo.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        contexto.data.user = dadosToken as DadosTokenFirebase;
        contexto.data.usuarioScae = usuarioScae as any;

        return proximo();

    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro de autenticação';
        return new Response(JSON.stringify({ erro: mensagem }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export { processarRequisicao as onRequest };

