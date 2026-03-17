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

    // 4. Gerar QR Payload Assinado (Formato: matricula|timestamp|assinatura)
    let qrPayload = '';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadParaAssinar = `${aluno.matricula}|${timestamp}`;
    
    try {
        if (aluno.chave_privada_ecdsa) {
            const encoder = new TextEncoder();
            const data = encoder.encode(payloadParaAssinar);
            
            const rawSignature = await crypto.subtle.sign(
                { name: 'ECDSA', hash: { name: 'SHA-256' } },
                await crypto.subtle.importKey(
                    'pkcs8',
                    new Uint8Array(atob(aluno.chave_privada_ecdsa.replace(/-+BEGIN PRIVATE KEY-+\s?|-+END PRIVATE KEY-+\s?|\s/g, '')).split('').map(c => c.charCodeAt(0))),
                    { name: 'ECDSA', namedCurve: 'P-256' },
                    false,
                    ['sign']
                ),
                data
            );
            
            const assinaturaB64 = btoa(String.fromCharCode(...new Uint8Array(rawSignature)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
                
            qrPayload = `${payloadParaAssinar}|${assinaturaB64}`;
        } else {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(contexto.env.JWT_SECRET || 'secret-key-scae');
            const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadParaAssinar));
            const assinaturaB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            qrPayload = `${payloadParaAssinar}|${assinaturaB64}`;
        }
    } catch (erro) {
        console.error('Erro ao assinar QR:', erro);
        qrPayload = `${aluno.matricula}|${timestamp}|ASSINATURA_FALHOU`;
    }

    return Response.json({
        dados: {
            matricula: aluno.matricula,
            nome_completo: aluno.nome_completo,
            turma_id: aluno.turma_id,
            qrPayload,
            qrDinamico: configsEscola?.qrDinamico || false
        },
        mensagem: 'Cartão digital gerado com sucesso'
    });
}
