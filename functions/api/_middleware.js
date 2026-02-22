import { createRemoteJWKSet, jwtVerify } from 'jose';

const ID_PROJETO_FIREBASE = 'scae-b7f8c';

async function processarRequisicao(contexto) {
    const { request: requisicao, next: proximo } = contexto;

    // Permitir OPTIONS (Preverificação CORS)
    if (requisicao.method === 'OPTIONS') {
        return proximo();
    }

    try {
        const cabecalhoAutenticacao = requisicao.headers.get('Authorization');

        // DEV BYPASS: Permitir localhost pular checagens de autenticação se necessário para testes rápidos
        const url = new URL(requisicao.url);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            // Em dev, se não tiver token, deixa passar (mas sem contexto de usuário)
            if (!cabecalhoAutenticacao) {
                console.warn('MODO DEV: Bypass de Auth para Localhost');
                return proximo();
            }
        }

        if (!cabecalhoAutenticacao || !cabecalhoAutenticacao.startsWith('Bearer ')) {
            // Rejeitar se não houver token (exceto no bypass acima)
            throw new Error('Cabeçalho de autorização ausente ou inválido');
        }

        const token = cabecalhoAutenticacao.split(' ')[1];

        // 1. Verificar Assinatura do Token e Reivindicações (Claims)
        const CONJUNTO_CHAVES_JSON = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

        const { payload: dadosToken } = await jwtVerify(token, CONJUNTO_CHAVES_JSON, {
            issuer: `https://securetoken.google.com/${ID_PROJETO_FIREBASE}`,
            audience: ID_PROJETO_FIREBASE,
        });

        // 2. Impor Restrição de Domínio
        const email = dadosToken.email || '';

        // Permitir APENAS domínios específicos ou emails de admin/dev
        const dominiosPermitidos = ['@edu.se.df.gov.br'];
        const emailsPermitidos = ['madebycotrim@gmail.com'];

        const acessoPermitido = dominiosPermitidos.some(dominio => email.endsWith(dominio)) || emailsPermitidos.includes(email);

        if (!acessoPermitido) {
            // Registrar tentativa bloqueada
            console.warn(`Tentativa de login bloqueada de: ${email}`);
            throw new Error('Email não autorizado. Use uma conta institucional.');
        }

        // Anexar usuário ao contexto para funções subsequentes
        contexto.data.user = dadosToken;

        return proximo();

    } catch (erro) {
        console.error('Erro de Autenticação:', erro.message);
        return new Response(JSON.stringify({ erro: erro.message }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Exportação com Alias para o Framework
export { processarRequisicao as onRequest };
