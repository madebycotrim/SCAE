/**
 * services/poller.ts
 * Coletor de eventos contínuo para hardware em rede (TCP/IP).
 */

import { config } from '../infra/config';
import { getDb } from '../infra/db';
import { LeitorFactory } from '../drivers/LeitorFactory';
import { ILeitor } from '../drivers/ILeitor';
import { NotificadorVoz } from './notificador-voz';

const leitoresAtivos: ILeitor[] = config.leitores.map(c => LeitorFactory.criarLeitor(c));
let notificadorGlobal: NotificadorVoz | null = null;

/** Inicia o loop infinito de coleta de hardware */
export async function iniciarPolling(notificador?: NotificadorVoz | null) {
  if (notificador) notificadorGlobal = notificador;
  console.log(`[Poller] Iniciando coleta contínua de ${leitoresAtivos.length} equipamentos...`);
  
  // Executa o primeiro ciclo imediatamente
  executarCiclo();
  
  // Agenda os próximos ciclos com base no intervalo de configuração
  setInterval(executarCiclo, config.intervalo_polling_ms);
}

async function executarCiclo() {
  const db = getDb();

  for (const leitor of leitoresAtivos) {
    try {
      // 1. Recuperar o último ID processado para este leitor específico
      const registroCursor = db.prepare('SELECT ultimo_evento_id FROM cursores_leitura WHERE leitor_id = ?').get(leitor.id) as any;
      const ultimoId = registroCursor ? registroCursor.ultimo_evento_id : '0';

      // 2. Buscar novos eventos no hardware (ControlID ou Anviz)
      const novosEventos = await leitor.buscarEventos(ultimoId);
      
      if (novosEventos.length === 0) continue;

      console.log(`[Poller][${leitor.id}] Capturadas ${novosEventos.length} novas batidas.`);

      // 3. Persistir os novos registros no SQLite local para posterior sincronização
      const insertRegistro = db.prepare(`
        INSERT OR IGNORE INTO registros_acesso (
          id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, 
          timestamp_acesso, leitor_id, id_evento_hardware
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const stmtBuscaNome = db.prepare('SELECT nome_completo FROM alunos_cache WHERE matricula = ?');

      const upsertCursor = db.prepare(`
        INSERT INTO cursores_leitura (leitor_id, ultimo_evento_id)
        VALUES (?, ?)
        ON CONFLICT(leitor_id) DO UPDATE SET 
          ultimo_evento_id = excluded.ultimo_evento_id,
          atualizado_em = datetime('now', 'localtime')
      `);

      // Executa transação para garantir integridade e performance
      db.transaction((eventos: any[]) => {
        let maxId = ultimoId;
        for (const ev of eventos) {
          const idUnico = `EVT_${leitor.id}_${ev.id}`;
          insertRegistro.run(
            idUnico, 
            config.escola_id, 
            ev.idUsuario, 
            ev.tipo, 
            leitor.tipo, 
            ev.timestamp.toISOString(), 
            leitor.id, 
            ev.id
          );

          // Feedback de Voz Contextual
          if (notificadorGlobal) {
            const aluno = stmtBuscaNome.get(ev.idUsuario) as any;
            if (aluno?.nome_completo) {
              notificadorGlobal.anunciarAcesso(aluno.nome_completo, ev.tipo);
            }
          }
          
          // Mantém o rastro do maior ID para o próximo ciclo
          if (parseInt(ev.id, 10) > parseInt(maxId, 10)) {
            maxId = ev.id;
          }
        }
        upsertCursor.run(leitor.id, maxId);
      })(novosEventos);

    } catch (e) {
      console.warn(`[Poller][${leitor.id}] Falha momentânea na coleta:`, (e as Error).message);
    }
  }
}
