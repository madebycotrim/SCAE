import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ContextoSCAE, DadosTokenFirebase, UsuarioDB } from '../tipos/ambiente';
import { ErroBase, ErroInterno, ErroNaoAutenticado, ErroPermissao } from './erros';
import { ServicoCache } from './utilitarios/cache';
import { EMAIL_ROOT } from './_seguranca';

const ID_PROJETO_FIREBASE = 'scae-b7f8c';

// Cached at module level — reused across requests within the same Worker instance
const CONJUNTO_CHAVES_JSON = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

async function processarRequisicao(contexto: ContextoSCAE): Promise<Response> {
    const { request: requisicao, next: proximo } = contexto;

    try {
        // Permitir OPTIONS (Preverificação CORS)
        if (requisicao.method === 'OPTIONS') {
            return proximo();
        }

        const url = new URL(requisicao.url);
        const rotaResponsavel = url.pathname.startsWith('/api/responsavel/');
        const ehPublicaGet = url.pathname.startsWith('/api/publico/') && requisicao.method === 'GET';

        if (rotaResponsavel || ehPublicaGet) {
            return proximo();
        }

        const cabecalhoAutenticacao = requisicao.headers.get('Authorization');

        // DEV BYPASS
        const ehAmbienteLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const bypassHabilitado = contexto.env?.DEV_AUTH_BYPASS === '1';

        if (ehAmbienteLocal && bypassHabilitado && !cabecalhoAutenticacao) {
            return proximo();
        }

        if (!cabecalhoAutenticacao || !cabecalhoAutenticacao.startsWith('Bearer ')) {
            throw new ErroNaoAutenticado('Cabeçalho de autorização ausente ou inválido');
        }

        const token = cabecalhoAutenticacao.split(' ')[1];

        const { payload: dadosToken } = await jwtVerify(token, CONJUNTO_CHAVES_JSON, {
            issuer: `https://securetoken.google.com/${ID_PROJETO_FIREBASE}`,
            audience: ID_PROJETO_FIREBASE,
        });

        const email = (dadosToken.email as string) || '';
        const eAdminGlobal = [EMAIL_ROOT].includes(email);
        const idEscola = requisicao.headers.get('X-Escola-ID');

        if (eAdminGlobal && !idEscola) {
            contexto.data.user = dadosToken as DadosTokenFirebase;
            return proximo();
        }

        if (!idEscola) {
            throw new ErroBase('ID da Escola (X-Escola-ID) obrigatório.', 'AUTH_ID_AUSENTE', 400);
        }

        // 6. Whitelist de Domínios de Email (Via KV)
        const dominiosPermitidos = await ServicoCache.buscarDominios(idEscola, contexto.env);

        if (dominiosPermitidos.length > 0 && !eAdminGlobal) {
            const emailValido = dominiosPermitidos.some(d => email.endsWith(`@${d}`));
            if (!emailValido) {
                // Fornecer feedback sobre o domínio esperado se houver apenas um
                const msg = dominiosPermitidos.length === 1 
                    ? `Use sua conta institucional @${dominiosPermitidos[0]}.`
                    : `Use sua conta institucional permitida pela escola.`;
                throw new ErroPermissao(msg);
            }
        }

        // Tentar buscar usuário no Cache (KV) para evitar 2ª query por request
        let usuarioScae = await contexto.env.KV_SCAE.get(`user:${idEscola}:${email}`, 'json');

        if (!usuarioScae) {
            usuarioScae = await contexto.env.DB_SCAE.prepare(
                "SELECT * FROM usuarios WHERE email = ? AND escola_id = ? AND ativo = 1"
            ).bind(email, idEscola).first();

            if (usuarioScae) {
                await contexto.env.KV_SCAE.put(`user:${idEscola}:${email}`, JSON.stringify(usuarioScae), { expirationTtl: 600 }); // Cache curto de 10 min
            }
        }

        if (!usuarioScae && !eAdminGlobal) {
            throw new ErroPermissao('Usuário não vinculado ou inativo.', 'AUTH_USER_RESTRICTED');
        }

        contexto.data.user = dadosToken as DadosTokenFirebase;
        contexto.data.usuarioScae = usuarioScae as UsuarioDB | null;

        const resposta = await proximo();

        // Adicionar headers de segurança em todas as respostas
        resposta.headers.set('X-Content-Type-Options', 'nosniff');
        resposta.headers.set('X-Frame-Options', 'DENY');
        resposta.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        resposta.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        return resposta;

    } catch (erro) {
        if (erro instanceof ErroBase) {
            return new Response(JSON.stringify(erro.toJSON()), {
                status: erro.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Logging detalhado apenas para o runtime da Cloudflare
        console.error('[CRÍTICO/Middleware]', erro instanceof Error ? erro.stack || erro.message : erro);
        
        // Resposta higienizada genérica para o frontend/cliente (Security By Design)
        const erroInterno = new ErroInterno('Falha interna no processamento de autorização.');
        return new Response(JSON.stringify(erroInterno.toJSON()), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export { processarRequisicao as onRequest };
