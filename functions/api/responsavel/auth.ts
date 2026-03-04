/**
 * API de Autenticação do Responsável (Login).
 * Endpoint: POST /api/responsavel/auth
 */
import { SignJWT } from 'jose';
import type { ContextoSCAE } from '../../tipos/ambiente';

function obterChaveSecreta(env: { JWT_SECRET: string }): Uint8Array {
    const segredo = env.JWT_SECRET;
    if (!segredo) {
        throw new Error('JWT_SECRET não configurado nas variáveis de ambiente.');
    }
    return new TextEncoder().encode(segredo);
}

export async function onRequestPost(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = contexto.request.headers.get('X-Escola-ID');

    if (!idEscola) {
        return new Response(JSON.stringify({ error: 'Tenant ID ausente' }), { status: 400 });
    }

    try {
        const { email, aluno_matricula }: { email: string; aluno_matricula: string } = await contexto.request.json();

        if (!email || !aluno_matricula) throw new Error('Campos incompletos');

        // Validar vínculo Exato (Responsável <-> Aluno)
        const consulta = await contexto.env.DB_SCAE.prepare(`
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
        const chave = obterChaveSecreta(contexto.env);

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

    } catch (erro) {
        return new Response(JSON.stringify({ error: 'Falha durante o Login: ' + (erro instanceof Error ? erro.message : 'Erro desconhecido') }), { status: 400 });
    }
}
