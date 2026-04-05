/**
 * services/worker-endpoint.ts
 * Driver de Comunicacao Hibrido (Cloud-First com Fallback Local Inteligente).
 */
import { config } from '../infra/config';

export class WorkerApi {
  /**
   * Tenta buscar os dados da Nuvem com Headers mais robustos para evitar bloqueio da Cloudflare.
   */
  static async buscarSincronizacaoAlunos() {
    const urlCloud = `${config.endpoint_worker}/api/agente/download-alunos`;
    const urlLocal = `http://localhost:8788/api/agente/download-alunos`;
    
    console.log(`[WorkerApi] >>> TENTANDO NUVEM: ${urlCloud}`);

    try {
        const resp = await fetch(urlCloud, {
            method: 'GET',
            headers: { 
                'X-Escola-ID': config.escola_id,
                'Content-Type': 'application/json',
                // User-Agent real para não ser bloqueado como BOT pela Cloudflare
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SCAE-Agent/1.6.0'
            }
        });

        if (resp.ok) {
            const data = await resp.json();
            console.log(`[WorkerApi] ✓ SUCESSO NUVEM: Dados da Cloudflare carregados.`);
            return { ...data, ok: true };
        } else {
            console.error(`[WorkerApi] ! SITE RESPONDEU MAS DEU ERRO (${resp.status})`);
        }
    } catch (e: any) {
        console.warn(`[WorkerApi] !!! FALHA NA NUVEM: ${e.name} - ${e.message}`);
        if (e.message.includes('fetch failed')) {
            console.error('[WorkerApi] » Causa provável: O Firewall do Windows ou Anti-vírus está bloqueando o Agente de acessar o site.');
        }
    }

    console.info(`[WorkerApi] → Mudando para banco LOCAL...`);
    try {
        const localResp = await fetch(urlLocal, {
          headers: { 'X-Escola-ID': config.escola_id }
        });
        
        if (localResp.ok) {
            const localData = await localResp.json();
            return { ...localData, ok: true };
        }
    } catch (e: any) {
        console.error('[WorkerApi] ✗ Falha local:', e.message);
    }

    return { ok: false };
  }

  static async enviarBatida(eventos: any[]) {
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/presenca`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'X-Escola-ID': config.escola_id,
            'User-Agent': 'SCAE-Agent/1.6.0'
        },
        body: JSON.stringify({ eventos })
      });
      return resp.ok;
    } catch { return false; }
  }

  static async enviarStatus(corpo: any) {
    try {
      await fetch(`${config.endpoint_worker}/api/agente/status`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'X-Escola-ID': config.escola_id,
            'User-Agent': 'SCAE-Agent/1.6.0'
        },
        body: JSON.stringify(corpo)
      });
    } catch { }
  }
}
