import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroInterno } from '../erros';
import { verificarPermissao } from '../seguranca';
import { ServicoCache } from '../utilitarios/cache';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);

        const { results } = await contexto.env.DB_SCAE.prepare(`
            SELECT 
                id, 
                nome_escola as nome, 
                id as slug, 
                (SELECT COUNT(*) FROM alunos WHERE escola_id = escolas.id) as totalAlunos,
                'ATIVA' as status,
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
        if (erro instanceof ErroBase) {
            return new Response(JSON.stringify(erro.toJSON()), { 
                status: erro.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro interno ao buscar escolas');
        return new Response(JSON.stringify(erroInterno.toJSON()), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);

        let dados;
        try {
            dados = await contexto.request.json() as any;
            console.log('Dados recebidos na criação de escola:', JSON.stringify(dados, null, 2));
        } catch (e) {
            console.error('Falha ao processar JSON da requisição:', e);
            throw new ErroBase('Corpo da requisição inválido ou vazio.', 'JSON_INVALIDO', 400);
        }

        const { nome_escola, id, dominio_email } = dados;

        if (!id || !nome_escola || !dominio_email) {
            console.warn('Campos obrigatórios ausentes:', { id, nome_escola, dominio_email });
            throw new ErroBase(`Campos obrigatórios ausentes: ${[!id && 'ID', !nome_escola && 'Nome', !dominio_email && 'Domínio'].filter(Boolean).join(', ')}`, 'VALIDACAO_FALLA', 400);
        }

        // 1. Gerar Chaves ECDSA P-256 para a escola (Modo Offline-First)
        const chaves = (await crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign", "verify"]
        )) as CryptoKeyPair;

        const privadaPKCS8 = await crypto.subtle.exportKey("pkcs8", chaves.privateKey);
        const publicaSPKI = await crypto.subtle.exportKey("spki", chaves.publicKey);

        // Função segura para Base64 em Workers
        const arrayParaB64 = (array: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(array)));
        
        const b64Privada = arrayParaB64(privadaPKCS8 as ArrayBuffer);
        const b64Publica = arrayParaB64(publicaSPKI as ArrayBuffer);

        // 2. Inserção no D1 seguindo o Schema Completo
        console.log('Iniciando inserção no D1 para id:', id);
        
        await contexto.env.DB_SCAE.prepare(`
            INSERT INTO escolas (
                id, nome_escola, dominio_email, 
                cor_primaria, cor_secundaria, logo_url, 
                chave_privada_ecdsa, chave_publica_ecdsa,
                config_qr_dinamico, tts_ativado, janelas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, 
            nome_escola, 
            dominio_email,
            dados.cor_primaria || '#000000',
            dados.cor_secundaria || '#ffffff',
            dados.logo_url || null,
            b64Privada,
            b64Publica,
            dados.config_qr_dinamico ? 1 : 0,
            dados.tts_ativado ? 1 : 0,
            '[]'
        ).run();

        // 3. Warm-up do Cache KV (Tudo que era para estar no KV já nasce lá)
        try {
            // Isso popula o mapeamento Slug -> ID e as Configurações Básicas
            await ServicoCache.buscarIdPorSlug(id, contexto.env);
            await ServicoCache.buscarConfiguracoes(id, contexto.env);
            await ServicoCache.buscarPubKey(id, contexto.env);
        } catch (cacheWarmupError) {
            console.warn('Escola criada, mas falha ao pré-popular cache KV:', cacheWarmupError);
        }

        console.log('Unidade escolar inserida com sucesso:', id);

        return new Response(JSON.stringify({ 
            mensagem: 'Unidade operacional inicializada com sucesso!',
            id: id 
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (erro) {
        console.error('Erro detalhado ao criar escola:', erro);
        if (erro instanceof ErroBase) {
            return new Response(JSON.stringify(erro.toJSON()), { 
                status: erro.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Trata erros de banco de dados (duplicidade, etc)
        const erroMsg = erro instanceof Error ? erro.message : 'Erro desconhecido';
        const status = erroMsg.includes('UNIQUE constraint failed') ? 409 : 500;
        
        return new Response(JSON.stringify({ 
            erro: erroMsg,
            codigo: status === 409 ? 'CONFLITO_ID' : 'ERRO_INTERNO'
        }), { 
            status: status, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
