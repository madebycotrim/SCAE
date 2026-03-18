import { ContextoSCAE } from '../../tipos/ambiente';
import { extrairEscolaId, verificarPermissao } from '../_seguranca';
import { CALENDARIO_SEEDF_2026, obterDiasNaoLetivos } from './calendario.compartilhado';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    
    try {
        // 1. Busca os dias usando a lógica inteligente (Manuais ou SEEDF)
        const dias = await obterDiasNaoLetivos(contexto.env.DB_SCAE, idEscola);
        
        // Se quisermos os objetos completos para a API (com descrição)
        // Precisamos de um pequeno ajuste na lógica compartilhada ou aqui
        const { results: diasManuais } = await contexto.env.DB_SCAE.prepare(
            `SELECT * FROM calendario_letivo WHERE escola_id = ? ORDER BY data ASC`
        ).bind(idEscola).all();

        if (diasManuais && diasManuais.length > 0) {
            return Response.json(diasManuais);
        }

        const escola = await contexto.env.DB_SCAE.prepare(
            `SELECT dominio_email FROM escolas WHERE id = ?`
        ).bind(idEscola).first() as any;

        if (escola?.dominio_email?.includes('se.df.gov.br')) {
            return Response.json(CALENDARIO_SEEDF_2026.map(d => ({ ...d, escola_id: idEscola })));
        }
        
        return Response.json([]);
    } catch (error) {
        console.error('Erro ao buscar calendário inteligente:', error);
        return Response.json({ error: 'Falha ao buscar calendário' }, { status: 500 });
    }
}

export async function onRequestPost(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);
    
    try {
        const { searchParams } = new URL(contexto.request.url);
        const acao = searchParams.get('acao');

        if (acao === 'sincronizar_seedf') {
            const batch = contexto.env.DB_SCAE.prepare(
                `INSERT OR REPLACE INTO calendario_letivo (data, escola_id, descricao, tipo)
                 VALUES (?, ?, ?, ?)`
            );
            
            await contexto.env.DB_SCAE.batch(
                CALENDARIO_SEEDF_2026.map(d => batch.bind(d.data, idEscola, d.descricao, d.tipo))
            );

            return Response.json({ success: true, total: CALENDARIO_SEEDF_2026.length });
        }

        const dados = await contexto.request.json() as any;
        const { data, descricao, tipo } = dados;
        
        if (!data) return Response.json({ error: 'Data é obrigatória' }, { status: 400 });
        
        await contexto.env.DB_SCAE.prepare(
            `INSERT OR REPLACE INTO calendario_letivo (data, escola_id, descricao, tipo)
             VALUES (?, ?, ?, ?)`
        ).bind(data, idEscola, descricao || '', tipo || 'FERIADO').run();
        
        return Response.json({ success: true });
    } catch (error) {
        console.error('Erro no calendário:', error);
        return Response.json({ error: 'Falha ao salvar no calendário' }, { status: 500 });
    }
}

export async function onRequestDelete(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);
    
    try {
        const { searchParams } = new URL(contexto.request.url);
        const data = searchParams.get('data');
        
        if (!data) return Response.json({ error: 'Data é obrigatória' }, { status: 400 });
        
        await contexto.env.DB_SCAE.prepare(
            `DELETE FROM calendario_letivo WHERE data = ? AND escola_id = ?`
        ).bind(data, idEscola).run();
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: 'Falha ao remover do calendário' }, { status: 500 });
    }
}
