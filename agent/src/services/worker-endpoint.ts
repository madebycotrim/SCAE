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
          'X-Escola-ID': config.escola_id
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
  async buscarSincronizacaoAlunos(): Promise<any> {
    try {
      const url = `${config.endpoint_worker}/api/agente/download-alunos?t=${Date.now()}`;
      const resp = await fetch(url, {
        headers: {
          'X-Escola-ID': config.escola_id
        }
      });
      
      this.online = resp.ok;
      if (!resp.ok) return null;

      const data = await resp.json();
      return { ...data, ok: true }; 
    } catch (e) {
      this.online = false;
      console.warn('[WorkerApi] Tentando fallback para servidor local (8788)...');
      try {
        const localResp = await fetch(`http://localhost:8788/api/agente/download-alunos`, {
          headers: { 'X-Escola-ID': config.escola_id }
        });
        if (localResp.ok) {
           const localData = await localResp.json();
           return { ...localData, ok: true };
        }
      } catch {}
      console.error('[WorkerApi] Erro total de sincronização:', e);
      return null;
    }
  },

  /** Reporta que o agente está online e o status de seus leitores */
  async enviarStatus(leitores: any[]): Promise<boolean> {
    try {
      // 1. Notifica a nuvem oficial
      await fetch(`${config.endpoint_worker}/api/agente/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Escola-ID': config.escola_id
        },
        body: JSON.stringify({ 
          timestamp: new Date().toISOString(),
          leitores 
        })
      });
      
      // 2. Notifica o localhost (para o dashboard dev ver também)
      try {
        await fetch(`http://localhost:8788/api/agente/heartbeat`, {
          method: 'POST',
          headers: { 'X-Escola-ID': config.escola_id },
          body: JSON.stringify({ leitores })
        });
      } catch {}

      this.online = true;
      return true;
    } catch (e) {
      this.online = false;
      return false;
    }
  },

  /** Notifica que um aluno cadastrou a digital com sucesso no hardware */
  async confirmarBiometria(matricula: string): Promise<boolean> {
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/confirmar-biometria`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Escola-ID': config.escola_id
        },
        body: JSON.stringify({ matricula })
      });
      return resp.ok;
    } catch (e: any) {
      console.error('[WorkerApi] Erro ao confirmar biometria na nuvem:', e.message);
      return false;
    }
  },

  /** Recupera as configurações globais da unidade na Cloudflare */
  async buscarConfiguracoesUnidade(): Promise<any | null> {
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/configuracoes`, {
        headers: {
          'X-Escola-ID': config.escola_id
        }
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      console.error('[WorkerApi] Erro ao buscar configurações:', e);
      return null;
    }
  }
};
