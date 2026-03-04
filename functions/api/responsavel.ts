/**
 * API do Responsável (LGPD Art. 18).
 * Permite aos responsáveis acesso aos dados de seus dependentes de forma autônoma.
 * Operações: Auth (via e-mail+matricula), Exportar Dados, Ver Timeline.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { ContextoSCAE } from '../tipos/ambiente';

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

interface PayloadResponsavelJWT extends JWTPayload {
    responsavel_id: string;
    aluno_matricula: string;
    escola_id: string;
}

export async function onRequest(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = contexto.request.headers.get('X-Escola-ID');

    if (!idEscola) {
        return new Response(JSON.stringify({ error: 'Tenant ID ausente' }), { status: 400 });
    }

    try {
        const url = new URL(contexto.request.url);
        const path = url.pathname;
        const method = contexto.request.method;

        // 1. AUTENTICAÇÃO E GERAÇÃO DE JWT
        if (method === 'POST' && path.endsWith('/auth')) {
            return await autenticarResponsavel(contexto.request, contexto.env.DB_SCAE, idEscola, contexto.env);
        }

        // 2. VERIFICAÇÃO CRIPTOGRÁFICA DO TOKEN JWT
        const authHeader = contexto.request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let payloadToken: PayloadResponsavelJWT;

        try {
            const chave = obterChaveSecreta(contexto.env);
            const { payload } = await jwtVerify(token, chave, {
                issuer: 'scae:responsavel',
                audience: idEscola,
            });
            payloadToken = payload as PayloadResponsavelJWT;
        } catch (erroJwt) {
            const codigo = (erroJwt as { code?: string }).code;
            const mensagem = codigo === 'ERR_JWT_EXPIRED' ? 'Sessão expirada' : 'Token inválido';
            return new Response(JSON.stringify({ error: mensagem }), { status: 401 });
        }

        const responsavelId = payloadToken.responsavel_id;
        const alunoMatricula = payloadToken.aluno_matricula;

        // 3. RECUPERAR DADOS DO ALUNO E HISTÓRICO DE ACESSOS (TIMELINE / EXPORTAR LGPD)
        if (method === 'GET' && path.endsWith('/dados')) {
            return await buscarDadosResponsavel(contexto.env.DB_SCAE, idEscola, responsavelId, alunoMatricula);
        }

        return new Response(JSON.stringify({ error: 'Endpoint não implementado' }), { status: 404 });

    } catch {
        return new Response(JSON.stringify({ error: 'Erro de processamento' }), { status: 500 });
    }
}

/**
 * Autentica o Responsável via validação de Email + Matrícula.
 * Gera JWT assinado com HMAC-SHA256 via jose.
 */
async function autenticarResponsavel(
    request: Request,
    db: D1Database,
    idEscola: string,
    env: { JWT_SECRET: string }
): Promise<Response> {
    try {
        const { email, aluno_matricula }: { email: string; aluno_matricula: string } = await request.json();

        if (!email || !aluno_matricula) throw new Error('Campos incompletos');

        // Validar vínculo Exato (Responsável <-> Aluno)
        const consulta = await db.prepare(`
            SELECT r.id 
            FROM responsaveis r 
            INNER JOIN vinculos_responsavel_aluno v ON r.id = v.responsavel_id AND r.escola_id = v.escola_id
            WHERE r.escola_id = ? 
              AND v.aluno_matricula = ? 
              AND r.email = ?
            LIMIT 1
        `).bind(idEscola, aluno_matricula, email.trim().toLowerCase()).first<{ id: string }>();

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
            escola_id: idEscola,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('scae:responsavel')
            .setAudience(idEscola)
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
async function buscarDadosResponsavel(
    db: D1Database,
    idEscola: string,
    responsavelId: string,
    alunoMatricula: string
): Promise<Response> {
    try {
        // Validação adicional de Segurança JWT
        const check = await db.prepare(`
            SELECT 1 FROM vinculos_responsavel_aluno 
            WHERE responsavel_id = ? AND aluno_matricula = ? AND escola_id = ?
        `).bind(responsavelId, alunoMatricula, idEscola).first();
        if (!check) throw new Error('Vínculo rompido');

        // Puxar cadastro do Responsável
        const { results: [respRow] } = await db.prepare(
            `SELECT nome_completo, email, id_ FROM responsaveis WHERE id=? AND escola_id=?`
        ).bind(responsavelId, idEscola).all();

        // Puxar cadastro do Estudante + Nome Turma
        const { results: [alunoRow] } = await db.prepare(`
            SELECT a.nome_completo, a.matricula, t.id as turma_nome 
            FROM alunos a 
            LEFT JOIN turmas t ON a.turma_id = t.id AND a.escola_id = t.escola_id
            WHERE a.matricula=? AND a.escola_id=?
        `).bind(alunoMatricula, idEscola).all();

        // Puxar Histórico de Acesso (Limitado aos últimos 100 por performance)
        const { results: acessos } = await db.prepare(`
            SELECT tipo_movimentacao, metodo_leitura, timestamp_acesso 
            FROM registros_acesso 
            WHERE aluno_matricula=? AND escola_id=? 
            ORDER BY timestamp_acesso DESC 
            LIMIT 100
        `).bind(alunoMatricula, idEscola).all();

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

