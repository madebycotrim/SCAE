/**
 * services/worker-endpoint.ts
 * Driver de Comunicação Online do Agente (Cloudflare Worker Real).
 * Mantém o Agente sincronizado com o Dashboard em agente.catraki.com.br.
 */
import { config } from '../infra/config';

export class WorkerApi {
  /**
   * Busca a base de alunos e configurações do D1 Online.
   * Implementa retries exponenciais para garantir funcionamento em redes instáveis.
   */
  static async buscarSincronizacaoAlunos() {
    const url = `${config.endpoint_worker}/api/agente/download-alunos`;
    
    // Tenta até 3 vezes com backoff
    for (let i = 0; i < 3; i++) {
        try {
            const resp = await fetch(url, {
                headers: { 'X-Escola-ID': config.escola_id }
            });

            if (resp.ok) {
                const data = await resp.json();
                return { ...data, ok: true };
            }

            console.error(`[WorkerApi] Erro na nuvem (${resp.status}):`, await resp.text());
        } catch (e: any) {
            console.warn(`[WorkerApi] Falha na conexão online (Tentativa ${i+1}):`, e.message);
        }
        
        // Espera um pouco antes de tentar de novo (1s, 2s, 4s...)
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }

    // Se falhar de vez na internet, tenta o servidor local de segurança (se estiver rodando)
    console.warn('[WorkerApi] Mudando para modo offline/local temporário...');
    try {
        const localResp = await fetch(`http://localhost:8788/api/agente/download-alunos`, {
          headers: { 'X-Escola-ID': config.escola_id }
        });
        if (localResp.ok) return { ...(await localResp.json()), ok: true };
    } catch { /* Sem servidor local */ }

    return { ok: false };
  }

  /** Envia os eventos de presença para o banco de dados online */
  static async enviarBatida(eventos: any[]) {
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/presenca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Escola-ID': config.escola_id },
        body: JSON.stringify({ eventos })
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  /** Envia status de saúde do agente para o monitor online */
  static async enviarStatus(corpo: any) {
    try {
      await fetch(`${config.endpoint_worker}/api/agente/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Escola-ID': config.escola_id },
        body: JSON.stringify(corpo)
      });
    } catch { /* Ignora falha de status */ }
  }
}
