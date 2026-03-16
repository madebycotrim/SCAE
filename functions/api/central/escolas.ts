import type { ContextoSCAE } from '../../tipos/ambiente';
import { ErroBase, ErroInterno } from '../erros';
import { verificarPermissao } from '../seguranca';

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

        const dados = await contexto.request.json() as { 
            nome_escola: string, 
            id: string, 
            email_admin: string, 
            nome_admin: string 
        };

        if (!dados.id || !dados.nome_escola || !dados.email_admin) {
            throw new ErroBase('Dados incompletos para criação da unidade.', 'VALIDACAO_FALLA', 400);
        }

        // 1. Gerar Chaves ECDSA P-256 para a escola (Modo Offline-First)
        const chaves = (await crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign", "verify"]
        )) as CryptoKeyPair;

        const privadaPKCS8 = await crypto.subtle.exportKey("pkcs8", chaves.privateKey);
        const publicaSPKI = await crypto.subtle.exportKey("spki", chaves.publicKey);

        // Converter para Base64 para armazenamento
        const b64Privada = btoa(String.fromCharCode(...new Uint8Array(privadaPKCS8 as ArrayBuffer)));
        const b64Publica = btoa(String.fromCharCode(...new Uint8Array(publicaSPKI as ArrayBuffer)));

        // 2. Transação no D1 (Escola + Usuário Inicial)
        const queries = [
            contexto.env.DB_SCAE.prepare(`
                INSERT INTO escolas (id, nome_escola, chave_privada_ecdsa, chave_publica_ecdsa)
                VALUES (?, ?, ?, ?)
            `).bind(dados.id, dados.nome_escola, b64Privada, b64Publica),

            contexto.env.DB_SCAE.prepare(`
                INSERT INTO usuarios (email, escola_id, nome_completo, papel, ativo, pendente, criado_por)
                VALUES (?, ?, ?, 'ADMIN', 1, 0, 'SISTEMA_CENTRAL')
            `).bind(dados.email_admin, dados.id, dados.nome_admin || 'Administrador Inicial')
        ];

        await contexto.env.DB_SCAE.batch(queries);

        return new Response(JSON.stringify({ 
            mensagem: 'Unidade escolar criada com sucesso!',
            id: dados.id 
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (erro) {
        console.error('Erro ao criar escola:', erro);
        if (erro instanceof ErroBase) {
            return new Response(JSON.stringify(erro.toJSON()), { 
                status: erro.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ erro: 'Falha interna ao criar unidade.' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
