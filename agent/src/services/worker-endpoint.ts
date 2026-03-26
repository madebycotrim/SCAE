/**
 * services/worker-endpoint.ts
 * Canal de comunicação criptografado com o sistema central na nuvem.
 */

import { config } from '../infra/config';

export const WorkerApi = {
  /** Envia múltiplos registros coletados localmente em um único lote (batch) para eficiência */
  async enviarBatida(registros: any[]): Promise<boolean> {
    if (registros.length === 0) return true;
    
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/sync-ponto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Escola-ID': config.escola_id,
          'Authorization': `Bearer ${config.agente_token}` // Token centralizado
        },
        body: JSON.stringify({ registros })
      });

      if (!resp.ok) {
        throw new Error(`Cloudfalre Worker respondeu com erro ${resp.status}`);
      }

      return true;
    } catch (e) {
      console.error('[WorkerApi] Falha no envio para nuvem:', e);
      return false;
    }
  },

  /** Busca atualizações de alunos do servidor para o cache local */
  async buscarSincronizacaoAlunos(): Promise<any[]> {
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/download-alunos`, {
        headers: {
          'X-Escola-ID': config.escola_id,
          'Authorization': `Bearer ${config.agente_token}`
        }
      });
      
      const dados = await resp.json() as any;
      return dados.alunos || [];
    } catch (e) {
      console.error('[WorkerApi] Erro ao sincronizar alunos:', e);
      return [];
    }
  },

  /** Reporta que o agente está online e o status de seus leitores */
  async enviarStatus(leitores: any[]): Promise<boolean> {
    try {
      await fetch(`${config.endpoint_worker}/api/agente/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Escola-ID': config.escola_id,
          'Authorization': `Bearer ${config.agente_token}`
        },
        body: JSON.stringify({ 
          timestamp: new Date().toISOString(),
          leitores 
        })
      });
      return true;
    } catch { return false; }
  }
};
