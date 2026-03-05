import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ContextoSCAE, DadosTokenFirebase } from '../tipos/ambiente';
import { ErroBase, ErroInterno, ErroNaoAutenticado, ErroPermissao } from './erros';

const ID_PROJETO_FIREBASE = 'scae-b7f8c';

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
        const CONJUNTO_CHAVES_JSON = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

        const { payload: dadosToken } = await jwtVerify(token, CONJUNTO_CHAVES_JSON, {
            issuer: `https://securetoken.google.com/${ID_PROJETO_FIREBASE}`,
            audience: ID_PROJETO_FIREBASE,
        });

        const email = (dadosToken.email as string) || '';
        const eAdminGlobal = ['madebycotrim@gmail.com'].includes(email);
        const idEscola = requisicao.headers.get('X-Escola-ID');

        if (eAdminGlobal && !idEscola) {
            contexto.data.user = dadosToken as DadosTokenFirebase;
            return proximo();
        }

        if (!idEscola) {
            throw new ErroBase('ID da Escola (X-Escola-ID) obrigatório.', 'AUTH_ID_AUSENTE', 400);
        }

        const escola = await contexto.env.DB_SCAE.prepare(
            "SELECT dominio_email FROM escolas WHERE id = ?"
        ).bind(idEscola).first<{ dominio_email: string | null }>();

        if (!escola) {
            throw new ErroBase('Escola não cadastrada ou inválida.', 'AUTH_ESCOLA_INVALIDA', 404);
        }

        if (!eAdminGlobal && escola.dominio_email && !email.endsWith(`@${escola.dominio_email}`)) {
            throw new ErroPermissao(`Use sua conta institucional @${escola.dominio_email}.`);
        }

        const usuarioScae = await contexto.env.DB_SCAE.prepare(
            "SELECT * FROM usuarios WHERE email = ? AND escola_id = ? AND ativo = 1"
        ).bind(email, idEscola).first();

        if (!usuarioScae && !eAdminGlobal) {
            throw new ErroPermissao('Usuário não vinculado ou inativo.', 'AUTH_USER_RESTRICTED');
        }

        contexto.data.user = dadosToken as DadosTokenFirebase;
        contexto.data.usuarioScae = usuarioScae as any;

        const response = await proximo();
        return response;

    } catch (erro) {
        if (erro instanceof ErroBase) {
            return new Response(JSON.stringify(erro.toJSON()), {
                status: erro.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.error('[Middleware Error]:', erro);
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro crítico no middleware');
        return new Response(JSON.stringify(erroInterno.toJSON()), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export { processarRequisicao as onRequest };

