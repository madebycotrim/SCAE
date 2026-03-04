/**
 * API de Dados do Responsável (Timeline e LGPD).
 * Endpoint: GET /api/responsavel/dados
 */
import { jwtVerify, type JWTPayload } from 'jose';
import type { ContextoSCAE } from '../../tipos/ambiente';

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

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = contexto.request.headers.get('X-Escola-ID');

    if (!idEscola) {
        return new Response(JSON.stringify({ error: 'Tenant ID ausente' }), { status: 400 });
    }

    const authHeader = contexto.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    try {
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

        // Validação adicional de Segurança JWT
        const check = await contexto.env.DB_SCAE.prepare(`
            SELECT 1 FROM vinculos_responsavel_aluno 
            WHERE responsavel_id = ? AND aluno_matricula = ? AND escola_id = ?
        `).bind(responsavelId, alunoMatricula, idEscola).first();
        if (!check) throw new Error('Vínculo rompido');

        // Puxar cadastro do Responsável
        const respRow = await contexto.env.DB_SCAE.prepare(
            `SELECT nome_completo, email FROM responsaveis WHERE id=? AND escola_id=?`
        ).bind(responsavelId, idEscola).first();

        // Puxar cadastro do Estudante + Nome Turma
        const alunoRow = await contexto.env.DB_SCAE.prepare(`
            SELECT a.nome_completo, a.matricula, t.id as turma_nome 
            FROM alunos a 
            LEFT JOIN turmas t ON a.turma_id = t.id AND a.escola_id = t.escola_id
            WHERE a.matricula=? AND a.escola_id=?
        `).bind(alunoMatricula, idEscola).first();

        // Puxar Histórico de Acesso (Limitado aos últimos 100 por performance)
        const { results: acessos } = await contexto.env.DB_SCAE.prepare(`
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
        return new Response(JSON.stringify({ error: 'Erro ao buscar dossiê de dados.' }), { status: 403 });
    }
}
