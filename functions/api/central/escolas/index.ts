import type { ContextoSCAE } from '../../../tipos/ambiente';
import { ErroBase, ErroInterno } from '../../erros';
import { verificarPermissao } from '../../_seguranca';
import { ServicoCache } from '../../utilitarios/cache';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);

        const { results } = await contexto.env.DB_SCAE.prepare(`
            SELECT 
                id, 
                nome_escola as nome, 
                id as slug, 
                dominio_email as dominioEmail,
                limite_alunos as limiteAlunos,
                limite_terminais as limiteTerminais,
                contato_suporte as contatoSuporte,
                (SELECT COUNT(*) FROM alunos WHERE escola_id = escolas.id AND ativo = 1) as totalAlunos,
                status,
                criado_em as criadoEm
            FROM escolas
            ORDER BY criado_em DESC
        `).all();

        return new Response(JSON.stringify({ dados: results }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            }
        });

    } catch (erro) {
        console.error('Erro ao buscar escolas central:', erro);
        return tratarErro(erro);
    }
}

export async function onRequestPost(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);
        let dados = await contexto.request.json() as any;

        const { nome_escola, id, dominio_email } = dados;

        if (!id || !nome_escola || !dominio_email) {
            throw new ErroBase('Campos obrigatorios ausentes: ID, Nome ou Dominio.', 'VALIDACAO_FALHA', 400);
        }

        // ECDSA Generation
        const chaves = (await crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign", "verify"]
        )) as CryptoKeyPair;

        const privadaPKCS8 = await crypto.subtle.exportKey("pkcs8", chaves.privateKey);
        const publicaSPKI = await crypto.subtle.exportKey("spki", chaves.publicKey);

        const arrayParaB64 = (array: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(array)));
        
        await contexto.env.DB_SCAE.prepare(`
            INSERT INTO escolas (
                id, nome_escola, dominio_email, 
                cor_primaria, cor_secundaria, logo_url, 
                chave_privada_ecdsa, chave_publica_ecdsa,
                config_qr_dinamico, tts_ativado, 
                saida_obrigatoria, metodo_acesso,
                limite_alunos, limite_terminais,
                retencao_dados, contato_suporte,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, nome_escola, dominio_email,
            dados.cor_primaria || '#030712',
            dados.cor_secundaria || '#ffffff',
            dados.logo_url || null,
            arrayParaB64(privadaPKCS8 as ArrayBuffer),
            arrayParaB64(publicaSPKI as ArrayBuffer),
            dados.config_qr_dinamico ? 1 : 0,
            dados.tts_ativado !== false ? 1 : 0,
            dados.saida_obrigatoria !== false ? 1 : 0,
            dados.metodo_acesso || 'QRCODE',
            dados.limite_alunos || 1000,
            dados.limite_terminais || 5,
            dados.retencao_dados || 730,
            dados.contato_suporte || null,
            'ATIVA'
        ).run();

        // Warm-up Cache
        try {
            await ServicoCache.buscarIdPorSlug(id, contexto.env);
            await ServicoCache.buscarConfiguracoes(id, contexto.env);
        } catch (e) {}

        return new Response(JSON.stringify({ mensagem: 'Unidade inicializada!' }), { status: 201 });

    } catch (erro) {
        return tratarErro(erro);
    }
}

function tratarErro(erro: any) {
    if (erro instanceof ErroBase) {
        return new Response(JSON.stringify(erro.toJSON()), { 
            status: erro.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const msg = erro instanceof Error ? erro.message : 'Erro desconhecido';
    const status = msg.includes('UNIQUE') ? 409 : 500;
    return new Response(JSON.stringify({ erro: msg }), { status });
}
