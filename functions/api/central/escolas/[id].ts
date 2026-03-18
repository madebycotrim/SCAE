import type { ContextoSCAE } from '../../../tipos/ambiente';
import { ErroBase, ErroInterno, ErroNaoEncontrado } from '../../erros';
import { verificarPermissao } from '../../_seguranca';

/**
 * GET /api/central/escolas/[id]
 * Recupera todos os dados de uma unidade para edicao.
 */
export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);
        const { id } = contexto.params;

        const escola = await contexto.env.DB_SCAE.prepare(`
            SELECT * FROM escolas WHERE id = ?
        `).bind(id).first();

        if (!escola) {
            throw new ErroNaoEncontrado('Unidade nao encontrada na infraestrutura.');
        }

        return new Response(JSON.stringify({ dados: escola }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (erro) {
        return tratarErro(erro);
    }
}

/**
 * PATCH /api/central/escolas/[id]
 * Atualiza diretrizes ou status da unidade.
 */
export async function onRequestPatch(contexto: ContextoSCAE): Promise<Response> {
    try {
        verificarPermissao(contexto, ['CENTRAL']);
        const { id } = contexto.params;
        const dados = await contexto.request.json() as any;

        // Montar query dinamica baseada nos campos enviados
        const campos: string[] = [];
        const valores: any[] = [];

        if (dados.nome_escola) { campos.push('nome_escola = ?'); valores.push(dados.nome_escola); }
        if (dados.dominio_email) { campos.push('dominio_email = ?'); valores.push(dados.dominio_email); }
        if (dados.cor_primaria) { campos.push('cor_primaria = ?'); valores.push(dados.cor_primaria); }
        if (dados.cor_secundaria) { campos.push('cor_secundaria = ?'); valores.push(dados.cor_secundaria); }
        if (dados.logo_url !== undefined) { campos.push('logo_url = ?'); valores.push(dados.logo_url); }
        if (dados.config_qr_dinamico !== undefined) { campos.push('config_qr_dinamico = ?'); valores.push(dados.config_qr_dinamico ? 1 : 0); }
        if (dados.tts_ativado !== undefined) { campos.push('tts_ativado = ?'); valores.push(dados.tts_ativado ? 1 : 0); }
        if (dados.saida_obrigatoria !== undefined) { campos.push('saida_obrigatoria = ?'); valores.push(dados.saida_obrigatoria ? 1 : 0); }
        if (dados.metodo_acesso !== undefined) { campos.push('metodo_acesso = ?'); valores.push(dados.metodo_acesso); }
        if (dados.limite_alunos !== undefined) { campos.push('limite_alunos = ?'); valores.push(dados.limite_alunos); }
        if (dados.limite_terminais !== undefined) { campos.push('limite_terminais = ?'); valores.push(dados.limite_terminais); }
        if (dados.retencao_dados !== undefined) { campos.push('retencao_dados = ?'); valores.push(dados.retencao_dados); }
        if (dados.contato_suporte !== undefined) { campos.push('contato_suporte = ?'); valores.push(dados.contato_suporte); }
        if (dados.status) { campos.push('status = ?'); valores.push(dados.status); }

        if (campos.length === 0) {
            throw new ErroBase('Nenhum dado para atualizar.', 'SEM_DADOS', 400);
        }

        valores.push(id); // Para o WHERE

        await contexto.env.DB_SCAE.prepare(`
            UPDATE escolas SET ${campos.join(', ')} WHERE id = ?
        `).bind(...valores).run();

        return new Response(JSON.stringify({ mensagem: 'Diretrizes atualizadas com sucesso.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
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

        await contexto.env.DB_SCAE.prepare(`DELETE FROM escolas WHERE id = ?`).bind(id).run();

        return new Response(JSON.stringify({ mensagem: 'Unidade removida definitivamente.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (erro) {
        return tratarErro(erro);
    }
}

function tratarErro(erro: any) {
    console.error('[API Central/Escolas/[id]] Erro:', erro);
    if (erro instanceof ErroBase) {
        return new Response(JSON.stringify(erro.toJSON()), { 
            status: erro.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const erroInterno = new ErroInterno(erro instanceof Error ? erro.message : 'Erro interno no detalhe da escola');
    return new Response(JSON.stringify(erroInterno.toJSON()), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
    });
}
