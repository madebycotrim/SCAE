/**
 * API do Portal do Titular (LGPD Art. 18).
 * Permite aos responsáveis acesso aos dados de seus dependentes de forma autônoma.
 * Operações: Auth (via telefone+matricula), Exportar Dados, Ver Timeline, Revogar.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { ContextoSCAE, PayloadAutenticacaoPortal } from '../types/ambiente';

/**
 * Obtém a chave secreta JWT do ambiente.
 * Em produção DEVE ser configurada via variável de ambiente JWT_SECRET.
 */
function obterChaveSecreta(env: { JWT_SECRET: string }): Uint8Array {
    const segredo = env.JWT_SECRET;
    if (!segredo) {
        throw new Error('JWT_SECRET não configurado nas variáveis de ambiente.');
    }
    return new TextEncoder().encode(segredo);
}

interface PayloadPortalJWT extends JWTPayload {
    responsavel_id: string;
    aluno_matricula: string;
    tenant_id: string;
}

export async function onRequest(contexto: ContextoSCAE): Promise<Response> {
    const tenantId = contexto.request.headers.get('X-Tenant-ID') || contexto.env.DEFAULT_TENANT_ID;

    if (!tenantId) {
        return new Response(JSON.stringify({ error: 'Tenant ID ausente' }), { status: 400 });
    }

    try {
        const url = new URL(contexto.request.url);
        const path = url.pathname;
        const method = contexto.request.method;

        // 1. AUTENTICAÇÃO E GERAÇÃO DE JWT
        if (method === 'POST' && path.endsWith('/auth')) {
            return await autenticarResponsavel(contexto.request, contexto.env.DB_SCAE, tenantId, contexto.env);
        }

        // 2. VERIFICAÇÃO CRIPTOGRÃFICA DO TOKEN JWT
        const authHeader = contexto.request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let payloadToken: PayloadPortalJWT;

        try {
            const chave = obterChaveSecreta(contexto.env);
            const { payload } = await jwtVerify(token, chave, {
                issuer: 'scae:portal-titular',
                audience: tenantId,
            });
            payloadToken = payload as PayloadPortalJWT;
        } catch (erroJwt) {
            const codigo = (erroJwt as { code?: string }).code;
            const mensagem = codigo === 'ERR_JWT_EXPIRED' ? 'Sessão expirada' : 'Token inválido';
            return new Response(JSON.stringify({ error: mensagem }), { status: 401 });
        }

        const responsavelId = payloadToken.responsavel_id;
        const alunoMatricula = payloadToken.aluno_matricula;

        // 3. RECUPERAR DADOS DO ALUNO E HISTÓRICO DE ACESSOS (TIMELINE / EXPORTAR LGPD)
        if (method === 'GET' && path.endsWith('/dados')) {
            return await buscarDadosTitular(contexto.env.DB_SCAE, tenantId, responsavelId, alunoMatricula);
        }

        // 4. REVOGAR PARCIAL (REMOVER PUSH FCM)
        if (method === 'POST' && path.endsWith('/revogar-notificacoes')) {
            return await revogarFCM(contexto.env.DB_SCAE, tenantId, responsavelId);
        }

        return new Response(JSON.stringify({ error: 'Endpoint não implementado' }), { status: 404 });

    } catch {
        return new Response(JSON.stringify({ error: 'Erro de processamento' }), { status: 500 });
    }
}

/**
 * Autentica o Responsável via validação de Telefone + Matrícula.
 * Gera JWT assinado com HMAC-SHA256 via jose.
 */
async function autenticarResponsavel(
    request: Request,
    db: D1Database,
    tenantId: string,
    env: { JWT_SECRET: string }
): Promise<Response> {
    try {
        const { telefone, aluno_matricula }: PayloadAutenticacaoPortal = await request.json();

        // Formatar telefone mantendo apenas números
        const telLimpo = telefone.replace(/\D/g, '');

        // Validar vínculo Exato (Responsável <-> Aluno)
        const consulta = await db.prepare(`
            SELECT r.id 
            FROM responsaveis r 
            INNER JOIN vinculos_responsavel_aluno v ON r.id = v.responsavel_id AND r.tenant_id = v.tenant_id
            WHERE r.tenant_id = ? 
              AND v.aluno_matricula = ? 
              AND REPLACE(REPLACE(REPLACE(REPLACE(r.telefone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?
            LIMIT 1
        `).bind(tenantId, aluno_matricula, `%${telLimpo}%`).first<{ id: string }>();

        if (!consulta) {
            return new Response(JSON.stringify({ error: 'Credenciais inválidas ou vínculo não encontrado' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }

        // Criar JWT assinado com HMAC-SHA256 (expira em 1 hora)
        const chave = obterChaveSecreta(env);

        const token = await new SignJWT({
            responsavel_id: consulta.id,
            aluno_matricula,
            tenant_id: tenantId,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('scae:portal-titular')
            .setAudience(tenantId)
            .setExpirationTime('1h')
            .sign(chave);

        return new Response(JSON.stringify({
            success: true,
            token,
            mensagem: 'Sessão verificada. Redirecionando...'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch {
        return new Response(JSON.stringify({ error: 'Falha durante o Login' }), { status: 400 });
    }
}

/**
 * Agrupa os dados públicos permitidos e os últimos logs de acesso de portaria do Estudante.
 */
async function buscarDadosTitular(
    db: D1Database,
    tenantId: string,
    responsavelId: string,
    alunoMatricula: string
): Promise<Response> {
    try {
        // Validação adicional de Segurança JWT
        const check = await db.prepare(`
            SELECT 1 FROM vinculos_responsavel_aluno 
            WHERE responsavel_id = ? AND aluno_matricula = ? AND tenant_id = ?
        `).bind(responsavelId, alunoMatricula, tenantId).first();
        if (!check) throw new Error('Vínculo rompido');

        // Puxar cadastro do Responsável
        const { results: [respRow] } = await db.prepare(
            `SELECT nome_completo, telefone, email, fcm_token, id_consentimento FROM responsaveis WHERE id=? AND tenant_id=?`
        ).bind(responsavelId, tenantId).all();

        // Puxar cadastro do Estudante + Nome Turma
        const { results: [alunoRow] } = await db.prepare(`
            SELECT a.nome_completo, a.matricula, t.id as turma_nome 
            FROM alunos a 
            LEFT JOIN turmas t ON a.turma_id = t.id AND a.tenant_id = t.tenant_id
            WHERE a.matricula=? AND a.tenant_id=?
        `).bind(alunoMatricula, tenantId).all();

        // Puxar Histórico de Acesso (Limitado aos últimos 100 por performance)
        const { results: acessos } = await db.prepare(`
            SELECT tipo_movimentacao, metodo_leitura, timestamp_acesso 
            FROM registros_acesso 
            WHERE aluno_matricula=? AND tenant_id=? 
            ORDER BY timestamp_acesso DESC 
            LIMIT 100
        `).bind(alunoMatricula, tenantId).all();

        const dataResponse = {
            responsavel: respRow,
            aluno: alunoRow,
            acessos: acessos
        };

        return new Response(JSON.stringify(dataResponse), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch {
        return new Response(JSON.stringify({ error: 'Erro ao buscar dossiê de dados. Contate a secretaria.' }), { status: 403 });
    }
}

/**
 * Permite ao pai cancelar os spams do PWA Notifications sem excluir sua Conta.
 */
async function revogarFCM(db: D1Database, tenantId: string, responsavelId: string): Promise<Response> {
    await db.prepare(
        `UPDATE responsaveis SET fcm_token = NULL WHERE id=? AND tenant_id=?`
    ).bind(responsavelId, tenantId).run();

    return new Response(JSON.stringify({ success: true, mensagem: 'Notificações revogadas com sucesso.' }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
