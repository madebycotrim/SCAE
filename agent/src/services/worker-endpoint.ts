/**
 * services/worker-endpoint.ts
 * Canal de comunicação criptografado com o sistema central na nuvem.
 */

import { config } from '../infra/config';

export const WorkerApi = {
  online: false,

  /** Envia múltiplos registros coletados localmente em um único lote (batch) para eficiência */
  async enviarBatida(registros: any[]): Promise<boolean> {
    if (registros.length === 0) {
        // Se não tem nada p/ enviar, faz um ping rápido usando o heartbeat oficial para checar conexão
        try {
            await this.enviarStatus([]);
        } catch { this.online = false; }
        return true;
    }

    
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/sync-ponto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Escola-ID': config.escola_id,
          'Authorization': `Bearer ${config.agente_token}`
        },
        body: JSON.stringify({ registros })
      });

      this.online = resp.ok;
      if (!resp.ok) {
        const erroJson = await resp.json() as any;
        throw new Error(`Cloudflare Worker Error: ${erroJson.detalhe || resp.statusText}`);
      }

      return true;
    } catch (e: any) {
      this.online = false;
      console.error('[WorkerApi] Falha no envio para nuvem:', e.message);
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
      
      this.online = resp.ok;
      if (!resp.ok) return [];

      const dados = await resp.json() as any;
      return dados.alunos || [];
    } catch (e) {
      this.online = false;
      console.error('[WorkerApi] Erro ao sincronizar alunos:', e);
      return [];
    }
  },

  /** Reporta que o agente está online e o status de seus leitores */
  async enviarStatus(leitores: any[]): Promise<boolean> {
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/heartbeat`, {
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
      this.online = resp.ok;
      return resp.ok;
    } catch { 
      this.online = false;
      return false; 
    }
  }
};
