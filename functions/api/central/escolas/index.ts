import type { ContextoCatraki } from '../../../tipos/ambiente';
import { ErroBase, ErroInterno } from '../../erros';
import { verificarPermissao } from '../../_seguranca';
import { ServicoCache } from '../../utilitarios/cache';
import { z } from 'zod';

/** Schema Zod para criação de escola */
const esquemaCriacaoEscola = z.object({
    id: z.string().min(1, 'ID é obrigatório').max(100),
    nome_escola: z.string().min(3, 'Nome muito curto').max(200, 'Nome muito longo'),
    dominio_email: z.string().min(1, 'Domínio é obrigatório'),
    provedor_auth: z.enum(['google', 'microsoft']).default('google'),
    cor_primaria: z.string().default('#030712'),
    cor_secundaria: z.string().default('#ffffff'),
    logo_url: z.string().nullable().optional(),
    config_qr_dinamico: z.boolean().default(false),
    tts_ativado: z.boolean().default(true),
    saida_obrigatoria: z.boolean().default(true),
    metodo_acesso: z.string().default('QRCODE'),
    limite_alunos: z.number().int().positive().default(1000),
    limite_terminais: z.number().int().positive().default(5),
    retencao_dados: z.number().int().positive().default(730),
    contato_suporte: z.string().nullable().optional(),
});

/**
 * Converte ArrayBuffer para Base64 de forma segura (sem stack overflow).
 * Usa iteração manual em vez de spread operator para Uint8Array.
 */
function arrayParaB64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binario = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binario += String.fromCharCode(bytes[i]);
    }
    return btoa(binario);
}

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);

        const { results } = await contexto.env.DB_CATRAKI.prepare(`
            SELECT 
                id, 
                nome_escola as nome, 
                id as slug, 
                dominio_email as dominioEmail,
                provedor_auth as provedorAuth,
                limite_alunos as limiteAlunos,
                limite_terminais as limiteTerminais,
                contato_suporte as contatoSuporte,
                (SELECT COUNT(*) FROM alunos WHERE escola_id = escolas.id AND ativo = 1) as totalAlunos,
                status,
                criado_em as criadoEm
            FROM escolas
            ORDER BY criado_em DESC
        `).all();

        return Response.json({
            dados: results,
            mensagem: 'Escolas carregadas'
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            }
        });

    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar escolas');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function onRequestPost(contexto: ContextoCatraki): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);

        let corpo: unknown;
        try {
            corpo = await contexto.request.json();
        } catch {
            throw new ErroBase('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR', 400);
        }

        const resultadoZod = esquemaCriacaoEscola.safeParse(corpo);
        if (!resultadoZod.success) {
            const errs = resultadoZod.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            throw new ErroBase(`Dados da escola inválidos: ${errs}`, 'VALIDACAO_FALHA', 400);
        }

        const dados = resultadoZod.data;

        // ECDSA P-256 Key Generation
        const chaves = (await crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign", "verify"]
        )) as CryptoKeyPair;

        const privadaPKCS8 = await crypto.subtle.exportKey("pkcs8", chaves.privateKey) as ArrayBuffer;
        const publicaSPKI = await crypto.subtle.exportKey("spki", chaves.publicKey) as ArrayBuffer;

        await contexto.env.DB_CATRAKI.prepare(`
            INSERT INTO escolas (
                id, nome_escola, dominio_email, provedor_auth,
                cor_primaria, cor_secundaria, logo_url, 
                chave_privada_ecdsa, chave_publica_ecdsa,
                config_qr_dinamico, tts_ativado, 
                saida_obrigatoria, metodo_acesso,
                limite_alunos, limite_terminais,
                retencao_dados, contato_suporte,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            dados.id, dados.nome_escola, dados.dominio_email, dados.provedor_auth,
            dados.cor_primaria,
            dados.cor_secundaria,
            dados.logo_url ?? null,
            arrayParaB64(privadaPKCS8),
            arrayParaB64(publicaSPKI),
            dados.config_qr_dinamico ? 1 : 0,
            dados.tts_ativado ? 1 : 0,
            dados.saida_obrigatoria ? 1 : 0,
            dados.metodo_acesso,
            dados.limite_alunos,
            dados.limite_terminais,
            dados.retencao_dados,
            dados.contato_suporte ?? null,
            'ATIVA'
        ).run();

        // Warm-up Cache — log errors instead of swallowing silently
        try {
            await ServicoCache.buscarIdPorSlug(dados.id, contexto.env);
            await ServicoCache.buscarConfiguracoes(dados.id, contexto.env);
        } catch (cacheErro) {
            console.error('[Central/Escolas] Falha no warm-up de cache (não-bloqueante):', cacheErro);
        }

        return Response.json({
            dados: { id: dados.id },
            mensagem: 'Unidade inicializada com sucesso!'
        }, { status: 201 });

    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const msg = erro instanceof Error ? erro.message : 'Erro desconhecido';
        const status = msg.includes('UNIQUE') ? 409 : 500;
        const erroInterno = new ErroInterno(msg);
        return Response.json(erroInterno.toJSON(), { status, headers: { 'Content-Type': 'application/json' } });
    }
}
