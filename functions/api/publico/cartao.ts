import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroValidacao, ErroNaoEncontrado, ErroPermissao } from '../erros';
import { ServicoCache } from '../utilitarios/cache';
import { SignJWT, importPKCS8, importJWK } from 'jose';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const url = new URL(contexto.request.url);
    const slug = url.searchParams.get('slug');
    const matriculaInput = url.searchParams.get('matricula');
    const nascimentoInput = url.searchParams.get('nascimento');

    if (!slug || !matriculaInput || !nascimentoInput) {
        throw new ErroValidacao('Dados incompletos para acessar o cartão');
    }

    // 1. Resolver ID pelo Slug
    const idEscola = await ServicoCache.buscarIdPorSlug(slug, contexto.env);
    if (!idEscola) {
        throw new ErroNaoEncontrado('Escola não encontrada');
    }

    // 2. Buscar Aluno e Validar
    const aluno = await contexto.env.DB_SCAE.prepare(
        "SELECT a.*, e.chave_privada_ecdsa, e.nome_escola FROM alunos a JOIN escolas e ON a.escola_id = e.id WHERE a.matricula = ? AND a.escola_id = ? AND a.ativo = 1"
    ).bind(matriculaInput, idEscola).first<any>();

    if (!aluno) {
        throw new ErroNaoEncontrado('Aluno não encontrado ou inativo nesta escola');
    }

    // Validar Nascimento (Simples check de string para evitar problemas de fuso no momento)
    // No banco o formato é YYYY-MM-DD
    if (aluno.data_nascimento && aluno.data_nascimento !== nascimentoInput) {
        throw new ErroPermissao('Dados de validação incorretos (Data de Nascimento não confere)');
    }

    // 3. Buscar configurações de expiração (QR Dinâmico ou Fixo)
    const configsEscola = await ServicoCache.buscarConfiguracoes(idEscola, contexto.env);
    const expiraEm = configsEscola?.qrDinamico ? '24h' : '365d';

    // 4. Gerar QR Payload Assinado
    let qrPayload = '';
    
    try {
        const payload = {
            m: aluno.matricula,
            e: idEscola,
            v: 1
        };

        if (aluno.chave_privada_ecdsa) {
            const privateKey = await importPKCS8(aluno.chave_privada_ecdsa, 'ES256');
            qrPayload = await new SignJWT(payload)
                .setProtectedHeader({ alg: 'ES256' })
                .setIssuedAt()
                .setExpirationTime(expiraEm)
                .sign(privateKey);
        } else {
            const secret = new TextEncoder().encode(contexto.env.JWT_SECRET);
            qrPayload = await new SignJWT(payload)
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime(expiraEm)
                .sign(secret);
        }
    } catch (erro) {
        console.error('Erro ao assinar QR:', erro);
        // Se falhar a assinatura robusta, retornamos o ID puro (menos seguro, mas evita bloqueio total no piloto)
        // Em produção real, lançaríamos ErroInterno
        qrPayload = `SCAE:${aluno.matricula}:${idEscola}`;
    }

    return Response.json({
        dados: {
            matricula: aluno.matricula,
            nome_completo: aluno.nome_completo,
            turma_id: aluno.turma_id,
            qrPayload
        },
        mensagem: 'Cartão digital gerado com sucesso'
    });
}
