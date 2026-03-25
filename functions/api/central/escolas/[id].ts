import type { ContextoSCAE } from '../../../tipos/ambiente';
import { ErroBase, ErroInterno, ErroNaoEncontrado, ErroValidacao } from '../../erros';
import { verificarPermissao } from '../../_seguranca';
import { ServicoCache } from '../../utilitarios/cache';
import { z } from 'zod';

/** Schema Zod para atualização parcial de escola */
const esquemaUpdateEscola = z.object({
    nome_escola: z.string().min(3).max(200).optional(),
    dominio_email: z.string().min(1).optional(),
    provedor_auth: z.enum(['google', 'microsoft']).optional(),
    cor_primaria: z.string().optional(),
    cor_secundaria: z.string().optional(),
    logo_url: z.string().nullable().optional(),
    config_qr_dinamico: z.boolean().optional(),
    tts_ativado: z.boolean().optional(),
    saida_obrigatoria: z.boolean().optional(),
    metodo_acesso: z.string().optional(),
    limite_alunos: z.number().int().positive().optional(),
    limite_terminais: z.number().int().positive().optional(),
    retencao_dados: z.number().int().positive().optional(),
    contato_suporte: z.string().nullable().optional(),
    status: z.enum(['ATIVA', 'SUSPENSA', 'PENDENTE']).optional(),
}).strip(); // Silently remove unrecognized fields (e.g. 'id' sent by frontend)

/**
 * GET /api/central/escolas/[id]
 * Recupera todos os dados de uma unidade para edição (excluindo chave privada).
 */
export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);
        const { id } = contexto.params;

        const escola = await contexto.env.DB_SCAE.prepare(`
            SELECT id, nome_escola, dominio_email, provedor_auth, cor_primaria, cor_secundaria, logo_url,
                   chave_publica_ecdsa, config_qr_dinamico, tts_ativado, saida_obrigatoria,
                   metodo_acesso, limite_alunos, limite_terminais, retencao_dados,
                   contato_suporte, status, janelas, criado_em
            FROM escolas WHERE id = ?
        `).bind(id).first();

        if (!escola) {
            throw new ErroNaoEncontrado('Unidade não encontrada na infraestrutura.');
        }

        return Response.json({
            dados: escola,
            mensagem: 'Escola carregada com sucesso'
        });

    } catch (erro) {
        return tratarErro(erro);
    }
}

/**
 * PATCH /api/central/escolas/[id]
 * Atualiza diretrizes ou status da unidade com validação Zod.
 */
export async function onRequestPatch(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);
        const { id } = contexto.params;

        let corpo: unknown;
        try {
            corpo = await contexto.request.json();
        } catch {
            throw new ErroValidacao('JSON inválido no corpo da requisição', 'JSON_PARSE_ERROR');
        }

        const resultadoZod = esquemaUpdateEscola.safeParse(corpo);
        if (!resultadoZod.success) {
            throw new ErroValidacao(
                'Dados de atualização inválidos',
                'ESCOLA_VALIDACAO_001',
                { detalhes: resultadoZod.error.format() }
            );
        }

        const dados = resultadoZod.data;

        // Montar query dinâmica baseada nos campos validados
        const campos: string[] = [];
        const valores: (string | number | null)[] = [];

        if (dados.nome_escola !== undefined) { campos.push('nome_escola = ?'); valores.push(dados.nome_escola); }
        if (dados.dominio_email !== undefined) { campos.push('dominio_email = ?'); valores.push(dados.dominio_email); }
        if (dados.provedor_auth !== undefined) { campos.push('provedor_auth = ?'); valores.push(dados.provedor_auth); }
        if (dados.cor_primaria !== undefined) { campos.push('cor_primaria = ?'); valores.push(dados.cor_primaria); }
        if (dados.cor_secundaria !== undefined) { campos.push('cor_secundaria = ?'); valores.push(dados.cor_secundaria); }
        if (dados.logo_url !== undefined) { campos.push('logo_url = ?'); valores.push(dados.logo_url); }
        if (dados.config_qr_dinamico !== undefined) { campos.push('config_qr_dinamico = ?'); valores.push(dados.config_qr_dinamico ? 1 : 0); }
        if (dados.tts_ativado !== undefined) { campos.push('tts_ativado = ?'); valores.push(dados.tts_ativado ? 1 : 0); }
        if (dados.saida_obrigatoria !== undefined) { campos.push('saida_obrigatoria = ?'); valores.push(dados.saida_obrigatoria ? 1 : 0); }
        if (dados.metodo_acesso !== undefined) { campos.push('metodo_acesso = ?'); valores.push(dados.metodo_acesso); }
        if (dados.limite_alunos !== undefined) { campos.push('limite_alunos = ?'); valores.push(dados.limite_alunos); }
        if (dados.limite_terminais !== undefined) { campos.push('limite_terminais = ?'); valores.push(dados.limite_terminais); }
        if (dados.retencao_dados !== undefined) { campos.push('retencao_dados = ?'); valores.push(dados.retencao_dados); }
        if (dados.contato_suporte !== undefined) { campos.push('contato_suporte = ?'); valores.push(dados.contato_suporte); }
        if (dados.status !== undefined) { campos.push('status = ?'); valores.push(dados.status); }

        if (campos.length === 0) {
            throw new ErroValidacao('Nenhum dado para atualizar.', 'SEM_DADOS');
        }

        valores.push(id as string);

        const resultado = await contexto.env.DB_SCAE.prepare(`
            UPDATE escolas SET ${campos.join(', ')} WHERE id = ?
        `).bind(...valores).run();

        if (resultado.meta.changes === 0) {
            throw new ErroNaoEncontrado('Escola não encontrada para atualizar.');
        }

        // Invalida cache da escola
        await ServicoCache.limparCacheEscola(id as string, contexto.env);

        return Response.json({
            dados: { id },
            mensagem: 'Diretrizes atualizadas com sucesso.'
        });

    } catch (erro) {
        return tratarErro(erro);
    }
}

/**
 * DELETE /api/central/escolas/[id]
 * Remove uma unidade do sistema.
 */
export async function onRequestDelete(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);
        const { id } = contexto.params;

        const resultado = await contexto.env.DB_SCAE.prepare(
            `DELETE FROM escolas WHERE id = ?`
        ).bind(id).run();

        if (resultado.meta.changes === 0) {
            throw new ErroNaoEncontrado('Escola não encontrada para remoção.');
        }

        return Response.json({
            dados: { id },
            mensagem: 'Unidade removida definitivamente.'
        });

    } catch (erro) {
        return tratarErro(erro);
    }
}

function tratarErro(erro: unknown): Response {
    if (erro instanceof ErroBase) {
        return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
    }
    const msg = erro instanceof Error ? erro.message : 'Erro desconhecido';
    console.error('[Central/Escolas ID Error]', erro);
    const erroInterno = new ErroInterno(msg);
    return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
}
