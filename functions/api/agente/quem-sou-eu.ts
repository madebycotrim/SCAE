/**
 * api/agente/quem-sou-eu.ts
 * Endpoint de auto-descoberta para o Agente Local (D1 Docker via Túnel).
 * O Agente bate aqui para descobrir quem ele é baseado no banco de dados remoto.
 */
import { ContextoCatraki } from '../../tipos/ambiente';

export async function onRequestGet({ env }: ContextoCatraki) {
    const { DB_SCAE: db } = env;

    try {
        // Tenta descobrir a escola ativa baseada em quem tiver o maior número de alunos ou a primeira cadastrada
        const configEscola = await db.prepare(`
            SELECT id, nome_escola, tts_ativado, config_tts_frase_sucesso, config_tts_frase_erro
            FROM escolas
            LIMIT 1
        `).first();

        if (!configEscola) {
            return Response.json({ 
                ok: false, 
                erro: 'Nenhuma escola configurada na nuvem. Logue no painel web primeiro para cadastrar.' 
            }, { status: 404 });
        }

        let terminais: any = null;
        try {
            terminais = await db.prepare(`
                SELECT config_leitores FROM terminais WHERE escola_id = ?
            `).bind((configEscola as any).id).first<any>();
        } catch (e) {
            // Tabela ainda não existe, apenas ignora
        }

        return Response.json({
            ok: true,
            identidade: {
                ...configEscola,
                leitores: terminais?.config_leitores ? JSON.parse(terminais.config_leitores) : []
            }
        });

    } catch (e: any) {
        return Response.json({ erro: e.message }, { status: 500 });
    }
}
