/**
 * api/agente/download-alunos.ts
 * Fornece a base de alunos da escola para o Agente Local fazer cache offline.
 * Versão Ultra-Resiliente: Verifica a existência de tabelas via sqlite_master antes de consultar.
 */
import { ContextoCatraki } from '../../tipos/ambiente';
import { validarAgente } from './_agente-seguranca';

export async function onRequestGet(contexto: ContextoCatraki) {
    const { DB_SCAE: db } = contexto.env;
    let etapa = "INICIO";
    
    try {
        etapa = "VALIDAR_AGENTE";
        const escolaId = validarAgente(contexto.request, contexto.env);
        
        // 1. Busca Alunos
        etapa = "BUSCAR_ALUNOS";
        let alunos: any = { results: [] };
        try {
            alunos = await db.prepare(`
                SELECT a.matricula, a.nome_completo, a.turma_id, t.turno, a.ativo, a.biometria_cadastrada
                FROM alunos a
                LEFT JOIN turmas t ON a.turma_id = t.id AND a.escola_id = t.escola_id
                WHERE a.escola_id = ? AND a.ativo = 1
            `).bind(escolaId).all();
        } catch (e: any) {
             // Fallback se biometria_cadastrada não existir
             alunos = await db.prepare(`
                SELECT a.matricula, a.nome_completo, a.turma_id, t.turno, a.ativo
                FROM alunos a
                LEFT JOIN turmas t ON a.turma_id = t.id AND a.escola_id = t.escola_id
                WHERE a.escola_id = ? AND a.ativo = 1
            `).bind(escolaId).all();
        }

        // 2. Busca Configurações da Escola
        etapa = "BUSCAR_CONFIG_ESCOLA";
        let escolaInfo: any = {};
        try {
            escolaInfo = await db.prepare(`
                SELECT nome_escola, tts_ativado, janelas,
                       COALESCE(config_tts_frase_sucesso, '') as config_tts_frase_sucesso, 
                       COALESCE(config_tts_frase_erro, '') as config_tts_frase_erro
                FROM escolas
                WHERE id = ?
            `).bind(escolaId).first();
        } catch (e: any) {
            escolaInfo = await db.prepare(`SELECT nome_escola FROM escolas WHERE id = ?`).bind(escolaId).first();
        }
        escolaInfo = escolaInfo || { nome_escola: 'Escola Central' };

        // 3. Busca Turmas
        etapa = "BUSCAR_TURMAS";
        let turmas: any = { results: [] };
        try {
            turmas = await db.prepare(`SELECT id, serie, letra, turno FROM turmas WHERE escola_id = ?`).bind(escolaId).all();
        } catch {}

        // 4. Busca Terminais (VERIFICAÇÃO DE EXISTÊNCIA VIA METADADOS)
        etapa = "BUSCAR_TERMINAIS_META";
        let leitores: any[] = [];
        const checarTabela = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='terminais'").first();
        
        if (checarTabela) {
            etapa = "BUSCAR_TERMINAIS_EXEC";
            try {
                const terminais = await db.prepare(`SELECT config_leitores FROM terminais WHERE escola_id = ?`).bind(escolaId).first<any>();
                if (terminais?.config_leitores) leitores = JSON.parse(terminais.config_leitores);
            } catch {}
        }

        etapa = "PROCESSAR_JANELAS";
        let janelasProcessadas = [];
        try {
            if (escolaInfo.janelas) {
                janelasProcessadas = typeof escolaInfo.janelas === 'string' ? JSON.parse(escolaInfo.janelas) : escolaInfo.janelas;
            }
        } catch {}

        const dataObj = {
            escola_config: {
                ...escolaInfo,
                janelas: Array.isArray(janelasProcessadas) ? janelasProcessadas : []
            },
            alunos: alunos.results || [],
            turmas: turmas.results || [],
            leitores,
            total: (alunos.results || []).length
        };

        etapa = "FINALIZAR";
        const etag = `W/"${dataObj.total}-${JSON.stringify(dataObj.escola_config).length}"`;
        
        return Response.json({
            ok: true,
            ...dataObj,
            etag,
            timestamp_servidor: new Date().toISOString()
        }, {
            headers: { 'ETag': etag }
        });

    } catch (e: any) {
        console.error(`[Agente] 🚨 ERRO 500 CRÍTICO na etapa ${etapa}:`, e.message);
        return Response.json({
            ok: false,
            erro: `Erro crítico na etapa ${etapa}`,
            detalhe: e.message
        }, { status: 500 });
    }
}
