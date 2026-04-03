/**
 * functions/api/agente/login-pin.ts
 * Autenticação de Agente Local via PIN Exclusivo da Escola.
 * Identifica a escola automaticamente pelo PIN secreto de 6 dígitos.
 */

import type { ContextoCatraki } from '../../tipos/ambiente';

export async function onRequestPost(contexto: ContextoCatraki): Promise<Response> {
    try {
        const { pin } = await contexto.request.json() as any;

        if (!pin || pin.length < 6) {
            return Response.json({ ok: false, mensagem: 'PIN inválido. Mínimo 6 dígitos.' }, { status: 400 });
        }

        // 1. Buscar escola e configuração de terminais pelo PIN
        let dados;
        try {
            dados = await contexto.env.DB_SCAE.prepare(
                `SELECT e.id, e.nome_escola, t.config_leitores 
                 FROM escolas e 
                 LEFT JOIN terminais t ON t.escola_id = e.id
                 WHERE e.agente_pin = ? LIMIT 1`
            ).bind(pin).first<any>();
        } catch (dbError: any) {
            if (dbError.message && dbError.message.includes('no such table')) {
                console.log('[D1] Banco de dados vazio detectado. Criando tabelas base...');
                await contexto.env.DB_SCAE.exec(`
                    CREATE TABLE IF NOT EXISTS escolas (id TEXT PRIMARY KEY, nome_escola TEXT, agente_pin TEXT, agente_api_key TEXT);
                    CREATE TABLE IF NOT EXISTS terminais (id TEXT PRIMARY KEY, escola_id TEXT NOT NULL, config_leitores TEXT, status TEXT DEFAULT 'OFFLINE', ultima_comunicacao DATETIME);
                    CREATE TABLE IF NOT EXISTS alunos (matricula TEXT PRIMARY KEY, nome_completo TEXT, turma_id TEXT, ativo INTEGER, escola_id TEXT);
                    
                    CREATE TABLE IF NOT EXISTS registros_acesso (id TEXT PRIMARY KEY, escola_id TEXT, aluno_matricula TEXT, tipo_movimentacao TEXT, metodo_leitura TEXT, timestamp_acesso DATETIME, leitor_id TEXT, id_evento_hardware TEXT, sincronizado INTEGER DEFAULT 1, processado_presenca INTEGER DEFAULT 0, criado_em DATETIME);
                    INSERT OR IGNORE INTO escolas (id, nome_escola, agente_pin, agente_api_key) VALUES ('cem03-taguatinga', 'CEM 03 - Taguatinga', '123456', 'catraki_dev_token');
                    INSERT OR IGNORE INTO terminais (id, escola_id, config_leitores) VALUES ('terminal-principal', 'cem03-taguatinga', '[]');
                `);
                
                // Tenta novamente após a criação
                dados = await contexto.env.DB_SCAE.prepare(
                    `SELECT e.id, e.nome_escola, t.config_leitores 
                     FROM escolas e 
                     LEFT JOIN terminais t ON t.escola_id = e.id
                     WHERE e.agente_pin = ? LIMIT 1`
                ).bind(pin).first<any>();
            } else {
                throw dbError;
            }
        }


        if (!dados) {
            return Response.json({ ok: false, mensagem: 'PIN não encontrado ou expirado.' }, { status: 401 });
        }

        // 2. Definir Configuração de Hardware Remota (Se o terminal não estiver no banco, manda padrão)
        const configLeitores = dados.config_leitores ? JSON.parse(dados.config_leitores) : [];

        // 3. Gerar Token de Sessão (Automatizado)
        const tokenAgente = `CATRAKI_AUTO_${btoa(dados.id)}_${Date.now()}`;

        return Response.json({
            ok: true,
            escola_id: dados.id,
            nome_escola: dados.nome_escola,
            config_hardware: configLeitores,
            token: tokenAgente,
            mensagem: 'Terminal ativado com sucesso!'
        });

    } catch (e: any) {
        console.error('[Login API Error]', e);
        return Response.json({ ok: false, mensagem: 'Erro interno na validação.', detalhe: e.message }, { status: 500 });
    }
}
