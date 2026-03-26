/**
 * services/poller.ts
 * Monitor de hardware - Coleta eventos de leitores (Anviz, iDFlex, USB).
 * Versão Assíncrona (SQLite3).
 */

import { config } from '../infra/config';
import { getSql, runSql } from '../infra/db';
import { LeitorFactory } from '../drivers/LeitorFactory';
import { ILeitor } from '../drivers/ILeitor';
import { NotificadorVoz } from './notificador-voz';

export let leitoresAtivos: ILeitor[] = config.leitores.map(c => LeitorFactory.criarLeitor(c));
let notificadorGlobal: NotificadorVoz | null = null;

/** Reinicializa os leitores após uma mudança de config */
export function recarregarLeitores() {
  console.log('[Hardware] Recarregando drivers de biometria...');
  leitoresAtivos = config.leitores.map(c => LeitorFactory.criarLeitor(c));
}

/** Inicia o loop infinito de coleta de hardware */
export async function iniciarPolling(notificador?: NotificadorVoz | null) {
  if (notificador) notificadorGlobal = notificador;
  console.log(`[Poller] Iniciando coleta contínua de ${leitoresAtivos.length} equipamentos...`);
  
  // Executa o primeiro ciclo imediatamente
  executarCicloColeta();
  
  // Agendar próximos ciclos (Assíncronos e Seguros)
  setInterval(async () => {
    try {
      await executarCicloColeta();
    } catch (e) {
      console.error('[Poller] Erro no ciclo:', e);
    }
  }, config.intervalo_polling_ms);
}

/** Varre cada equipamento, busca novos eventos e salva no SQLite local */
async function executarCicloColeta() {
  for (const leitor of leitoresAtivos) {
    try {
      // 1. Onde paramos a leitura neste equipamento?
      const cursor = await getSql<{ ultimo_evento_id: string }>(
        'SELECT ultimo_evento_id FROM cursores_leitura WHERE leitor_id = ?',
        [leitor.id]
      );
      const ultimoId = cursor?.ultimo_evento_id || '0';

      // 2. Busca novos eventos no hardware (TCP/USB/REST)
      const novosEventos = await leitor.buscarEventos(ultimoId);
      if (novosEventos.length === 0) continue;

      console.log(`[Poller] ${leitor.nome}: Coletou ${novosEventos.length} novas presenças.`);

      // 3. Persistir os novos registros no SQLite local
      let maxId = ultimoId;
      for (const ev of novosEventos) {
        const idUnico = `EVT_${leitor.id}_${ev.id}`;
        
        await runSql(`
          INSERT OR IGNORE INTO registros_acesso (
            id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, 
            timestamp_acesso, leitor_id, id_evento_hardware
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          idUnico, 
          config.escola_id, 
          ev.idUsuario, 
          ev.tipo, 
          leitor.tipo, 
          ev.timestamp.toISOString(), 
          leitor.id, 
          ev.id
        ]);

        // Feedback de Voz Contextual (Premium TTS)
        if (notificadorGlobal) {
          const aluno = await getSql('SELECT nome_completo FROM alunos_cache WHERE matricula = ?', [ev.idUsuario]);
          if (aluno?.nome_completo) {
            notificadorGlobal.anunciarAcesso(aluno.nome_completo, ev.tipo);
          }
        }
        
        // Mantém o rastro do maior ID para o próximo ciclo
        const idNum = parseInt(ev.id, 10);
        if (!isNaN(idNum) && idNum > parseInt(maxId, 10)) {
          maxId = ev.id;
        }
      }

      // 4. Atualizar o cursor de leitura do equipamento
      await runSql(`
        INSERT INTO cursores_leitura (leitor_id, ultimo_evento_id)
        VALUES (?, ?)
        ON CONFLICT(leitor_id) DO UPDATE SET 
          ultimo_evento_id = excluded.ultimo_evento_id,
          atualizado_em = datetime('now', 'localtime')
      `, [leitor.id, maxId]);

    } catch (e) {
      console.error(`[Poller] Erro na coleta do equipamento ${leitor.id}:`, e);
    }
  }
}
