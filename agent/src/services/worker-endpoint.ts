/**
 * services/worker-endpoint.ts
 * Driver de Comunicação Híbrido (Cloud-First com Fallback Local Inteligente).
 * Prioriza a nuvem, mas muda para o banco local em 1.5s se houver lentidão ou queda.
 */
import { config } from '../infra/config';

export class WorkerApi {
  /**
   * Busca a base de alunos e configurações.
   * Prioriza 'agente.catraki.com.br' (Cloud), mas usa 'localhost:8788' (Local)
   * se a internet estiver lenta (Timeout > 1.5s) ou offline.
   */
  static async buscarSincronizacaoAlunos() {
    const urlCloud = `${config.endpoint_worker}/api/agente/download-alunos`;
    const urlLocal = `http://localhost:8788/api/agente/download-alunos`;
    
    // 1. TENTA A NUVEM (CLOUD) com Timeout Curto para evitar filas em pico
    try {
        console.log(`[WorkerApi] Tentando Cloud: ${urlCloud}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s de tolerância

        const resp = await fetch(urlCloud, {
            headers: { 'X-Escola-ID': config.escola_id },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (resp.ok) {
            const data = await resp.json();
            console.log('[WorkerApi] ✓ Conectado à Nuvem (Online)');
            return { ...data, ok: true };
        }
    } catch (e: any) {
        if (e.name === 'AbortError') {
            console.warn('[WorkerApi] ! Lentidão detectada na Nuvem (Timeout 1.5s).');
        } else {
            console.warn('[WorkerApi] ! Nuvem indisponível (Offline).');
        }
    }

    // 2. FALLBACK PARA O BANCO LOCAL (LOCAL D1)
    // Se a nuvem falhou ou demorou, usamos o servidor local que está no seu computador.
    try {
        console.log(`[WorkerApi] → Mudando para Banco LOCAL: ${urlLocal}`);
        const localResp = await fetch(urlLocal, {
          headers: { 'X-Escola-ID': config.escola_id }
        });
        
        if (localResp.ok) {
            const localData = await localResp.json();
            console.info('[WorkerApi] ✓ Usando Banco Local (Modo de Segurança)');
            return { ...localData, ok: true };
        }
    } catch {
        console.error('[WorkerApi] ✗ Nenhuma conexão disponível (Nuvem ou Local).');
    }

    return { ok: false };
  }

  /** Envia os eventos de presença (Prioridade Cloud) */
  static async enviarBatida(eventos: any[]) {
    try {
      const resp = await fetch(`${config.endpoint_worker}/api/agente/presenca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Escola-ID': config.escola_id },
        body: JSON.stringify({ eventos })
      });
      return resp.ok;
    } catch {
      // Se a nuvem falhar, o Agente guarda no SQLite local (gerenciado pelo sync.ts)
      return false;
    }
  }

  /** Envia status de saúde do agente */
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
