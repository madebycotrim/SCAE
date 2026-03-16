import { ContextoSCAE } from '../../tipos/ambiente';
import { extrairEscolaId, verificarPermissao } from '../seguranca';

export async function onRequestGet(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    
    try {
        const { results } = await contexto.env.DB_SCAE.prepare(
            `SELECT * FROM calendario_letivo WHERE escola_id = ? ORDER BY data ASC`
        ).bind(idEscola).all();
        
        return Response.json(results);
    } catch (error) {
        return Response.json({ error: 'Falha ao buscar calendário' }, { status: 500 });
    }
}

export async function onRequestPost(contexto: ContextoSCAE): Promise<Response> {
    const idEscola = extrairEscolaId(contexto.request);
    verificarPermissao(contexto, ['ADMIN', 'COORDENACAO']);
    
    try {
        const dados = await contexto.request.json() as any;
        const { data, descricao, tipo } = dados;
        
        if (!data) return Response.json({ error: 'Data é obrigatória' }, { status: 400 });
        
        await contexto.env.DB_SCAE.prepare(
            `INSERT OR REPLACE INTO calendario_letivo (data, escola_id, descricao, tipo)
             VALUES (?, ?, ?, ?)`
        ).bind(data, idEscola, descricao || '', tipo || 'FERIADO').run();
        
        return Response.json({ success: true });
    } catch (error) {
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
