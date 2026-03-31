import type { ContextoCatraki } from '../../tipos/ambiente';
import { ErroBase, ErroValidacao, ErroNaoEncontrado, ErroPermissao, ErroInterno } from '../erros';
import { verificarAcesso, extrairEscolaId } from '../_seguranca';
import { Permissao } from './rbac';
import { esquemaUsuario } from './usuarios.esquemas';
import { z } from 'zod';
import { ServicoCache } from '../utilitarios/cache';

async function processarBuscaUsuarios(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_USUARIOS);

        try {
            const { results } = await contexto.env.DB_CATRAKI.prepare(
                "SELECT email, escola_id, nome_completo, papel, ativo, criado_por, pendente, criado_em, atualizado_em FROM usuarios WHERE escola_id = ?"
            ).bind(idEscola).all();

            return Response.json({
                dados: results,
                mensagem: 'Lista de usuários carregada com sucesso'
            });
        } catch (dbError) {
            throw new ErroInterno(`Falha ao buscar usuários: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao buscar usuários');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarCriacaoUsuario(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_USUARIOS);

        let corpo;
        try {
            corpo = await contexto.request.json();
        } catch (parseError) {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        const resultadoZod = esquemaUsuario.safeParse(corpo);

        if (!resultadoZod.success) {
            const erroMensagem = `Dados do usuário inválidos. Erros por campo: ${JSON.stringify(resultadoZod.error.flatten().fieldErrors)}`;
            throw new ErroValidacao(erroMensagem, 'USER_VALIDACAO_001', { detalhes: resultadoZod.error.format() });
        }

        const { email, papel, ativo, nome_completo, criado_por, pendente, criado_em } = resultadoZod.data;

        try {
            await contexto.env.DB_CATRAKI.prepare(
                `INSERT INTO usuarios (email, escola_id, papel, ativo, nome_completo, criado_por, pendente, criado_em, atualizado_em)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(email, escola_id) DO UPDATE SET
                    papel = excluded.papel,
                    ativo = excluded.ativo,
                    nome_completo = excluded.nome_completo,
                    pendente = excluded.pendente,
                    atualizado_em = CURRENT_TIMESTAMP`
            ).bind(
                email,
                idEscola,
                papel || 'PORTEIRO',
                ativo ? 1 : 0,
                nome_completo ?? null,
                criado_por ?? contexto.data.user?.email ?? null,
                pendente ? 1 : 0,
                criado_em || new Date().toISOString(),
                new Date().toISOString()
            ).run();
        } catch (dbError) {
            throw new ErroInterno(`Falha ao inserir usuário: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        // Invalida cache KV para refletir mudança imediata (ex: desativação ou troca de papel)
        await ServicoCache.limparCacheUsuario(idEscola, email, contexto.env);

        return Response.json({
            dados: { email },
            mensagem: 'Usuário processado com sucesso'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao criar usuário');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

async function processarAtualizacaoParcial(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_USUARIOS);

        let corpo;
        try {
            corpo = await contexto.request.json();
        } catch (parseError) {
            throw new ErroValidacao('JSON inválido', 'JSON_PARSE_ERROR');
        }

        const { email, ...campos } = corpo;
        if (!email) throw new ErroValidacao('E-mail é obrigatório para atualização', 'USER_ID_AUSENTE');

        const chaves = Object.keys(campos).filter(k => ['papel', 'ativo', 'nome_completo', 'pendente'].includes(k));
        if (chaves.length === 0) throw new ErroValidacao('Nenhum campo válido para atualização enviado', 'USER_ATU_VAZIA');

        const sets = chaves.map(k => `${k} = ?`).join(', ');
        const valores = chaves.map(k => k === 'ativo' || k === 'pendente' ? (campos[k] ? 1 : 0) : campos[k]);

        try {
            const resultado = await contexto.env.DB_CATRAKI.prepare(
                `UPDATE usuarios SET ${sets}, atualizado_em = CURRENT_TIMESTAMP WHERE email = ? AND escola_id = ?`
            ).bind(...valores, email, idEscola).run();

            if (resultado.meta.changes === 0) {
                throw new ErroNaoEncontrado('Usuário não localizado para atualização');
            }
        } catch (dbError) {
            if (dbError instanceof ErroBase) throw dbError;
            throw new ErroInterno(`Falha ao atualizar usuário: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        await ServicoCache.limparCacheUsuario(idEscola, email, contexto.env);

        return Response.json({ mensagem: 'Usuário atualizado com sucesso' });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        return Response.json({ mensagem: 'Erro interno ao atualizar usuário' }, { status: 500 });
    }
}

async function processarRemocaoUsuario(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.GERENCIAR_USUARIOS);

        const url = new URL(contexto.request.url);
        const email = url.searchParams.get("email");

        if (!email) {
            throw new ErroValidacao('E-mail obrigatório para remoção', 'USER_ID_AUSENTE');
        }

        if (email === contexto.data.user?.email) {
            throw new ErroPermissao('Você não pode remover seu próprio acesso administrativo');
        }

        try {
            const resultado = await contexto.env.DB_CATRAKI.prepare(
                "DELETE FROM usuarios WHERE email = ? AND escola_id = ?"
            ).bind(email, idEscola).run();

            if (resultado.meta.changes === 0) {
                throw new ErroNaoEncontrado('Usuário não encontrado para exclusão');
            }
        } catch (dbError) {
            if (dbError instanceof ErroBase) throw dbError;
            throw new ErroInterno(`Falha ao remover usuário: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
        }

        // Invalida cache KV
        await ServicoCache.limparCacheUsuario(idEscola, email, contexto.env);

        return Response.json({
            mensagem: 'Usuário removido com sucesso'
        });
    } catch (erro) {
        if (erro instanceof ErroBase) {
            return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
        }
        const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro ao remover usuário');
        return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export {
    processarBuscaUsuarios as onRequestGet,
    processarCriacaoUsuario as onRequestPost,
    processarAtualizacaoParcial as onRequestPatch,
    processarRemocaoUsuario as onRequestDelete
};
