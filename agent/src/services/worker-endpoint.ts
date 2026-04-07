/**
 * services/worker-endpoint.ts
 * Driver de Comunicacao Hibrido (Cloud-First com Fallback Local Inteligente).
 */
import { config } from '../infra/config';

export class WorkerApi {
  /**
   * Pergunta na nuvem quem é a escola de verdade que ele deve operar.
   * Usado no boot para não precisar de IDs chumbados (MOCK).
   */
  static async descobrirIdentidade() {
      const urlCloud = `${config.endpoint_worker}/api/agente/quem-sou-eu`;
      const urlLocal = `http://localhost:8788/api/agente/quem-sou-eu`;
      
      const options = {
          headers: { 
              'Content-Type': 'application/json',
              'X-Agente-Token': config.agente_secret,
              'User-Agent': 'SCAE-Agent/1.6.2-FINAL'
          },
          signal: AbortSignal.timeout(10000)
      };

      try {
          console.log(`[WorkerApi] >>> DESCUBRINDO IDENTIDADE ATRAVÉS DO TÚNEL: ${urlCloud}`);
          const resp = await fetch(urlCloud, options as any);
          if (resp.ok) return await resp.json();
      } catch (e) {
          console.warn(`[WorkerApi] Falha no Túnel Identity. Tentando Localhost...`);
      }

      try {
          const localResp = await fetch(urlLocal, options as any);
          if (localResp.ok) return await localResp.json();
      } catch {}

      return { ok: false };
  }

  /**
   * Tenta buscar os dados da Nuvem com Headers robustos.
   */
  static async buscarSincronizacaoAlunos(lastEtag?: string) {
    const urlCloud = `${config.endpoint_worker}/api/agente/download-alunos`;
    const urlLocal = `http://localhost:8788/api/agente/download-alunos`;
    
    const headers: any = { 
        'X-Escola-ID': config.escola_id,
        'X-Agente-Token': config.agente_secret, // Segurança: Token compartilhado
        'Content-Type': 'application/json',
        'User-Agent': 'SCAE-Agent/1.6.2-FINAL'
    };

    if (lastEtag) headers['If-None-Match'] = lastEtag;

    const options = { headers, signal: AbortSignal.timeout(10000) };

    try {
        const resp = await fetch(urlCloud, options as any);
        
        if (resp.status === 304) return { ok: true, mudou: false };

        if (resp.ok) {
            const data = await resp.json();
            const etag = resp.headers.get('ETag');
            return { ...data, ok: true, mudou: true, etag };
        } else {
            console.error(`[WorkerApi] ! SITE RESPONDEU MAS DEU ERRO (${resp.status})`);
        }
    } catch (e: any) {
        console.warn(`[WorkerApi] !!! FALHA NA NUVEM: ${e.name} - ${e.message}`);
    }

    console.info(`[WorkerApi] → Mudando para banco LOCAL de emergência...`);
    try {
        const localResp = await fetch(urlLocal, options as any);
        if (localResp.ok) {
           const localData = await localResp.json();
           return { ...localData, ok: true };
        }
    } catch { }

    return { ok: false };
  }

  /**
   * Envia as presenças coletadas localmente para o sistema web (Cloudflare)
   */
  static async enviarBatida(eventos: any[]) {
    const urlCloud = `${config.endpoint_worker}/api/agente/sync-ponto`;
    const urlLocal = `http://localhost:8788/api/agente/sync-ponto`;
    
    // ⚡ MAPEAMENTO DE CAMPOS: O Servidor Cloudflare espera nomes de colunas do D1
    // Registros no banco local v3 -> Objetos esperados pelo sync-ponto.ts
    const registrosCloud = eventos.map(e => ({
        id: e.id,
        escola_id: config.escola_id,
        aluno_matricula: e.matricula, // Converte 'matricula' para 'aluno_matricula'
        tipo_movimentacao: e.tipo || 'ENTRADA', // Converte 'tipo' para 'tipo_movimentacao'
        metodo_validacao: 'BIOMETRIA',
        timestamp: e.timestamp_acesso, // O campo no WorkerApi.enviarBatida deve ser 'timestamp'
        leitor_id: e.leitor_id,
        id_evento_hardware: e.id.split('-')[1] || '0'
    }));

    const options = {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'X-Escola-ID': config.escola_id,
            'X-Agente-Token': config.agente_secret,
            'User-Agent': 'SCAE-Agent/1.6.2-FINAL'
        },
        body: JSON.stringify({ registros: registrosCloud }),
        signal: AbortSignal.timeout(10000)
    };

    try {
      const resp = await fetch(urlCloud, options as any);
      if (resp.ok) return true;
      console.warn(`[WorkerApi] Site recusou as batidas (Status ${resp.status}). Tentando banco local...`);
    } catch (e: any) { 
      console.warn(`[WorkerApi] Falha na Nuvem (${e.message}). Tentando localhost...`);
    }

    // Fallback: Tentativa via localhost (wrangler)
    try {
        const localResp = await fetch(urlLocal, options as any);
        if (localResp.ok) {
            console.log(`[WorkerApi] ✓ Batidas enviadas via Localhost de emergência.`);
            return true;
        } else {
            const erroLocal = await localResp.text();
            console.error(`[WorkerApi] ! Localhost recusou (Status ${localResp.status}): ${erroLocal.substring(0, 150)}`);
            return false;
        }
    } catch (err: any) {
        console.error(`[WorkerApi] ✗ ERRO FATAL: Nuvem e Localhost falharam. (${err.message})`);
        return false;
    }
  }

  static async enviarStatus(corpo: any) {
    try {
      await fetch(`${config.endpoint_worker}/api/agente/status`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'X-Escola-ID': config.escola_id,
            'X-Agente-Token': config.agente_secret,
            'User-Agent': 'SCAE-Agent/1.6.2-FINAL'
        },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(5000)
      });
    } catch { }
  }

  /**
   * Remove um comando da fila da nuvem após execução bem-sucedida.
   */
  static async confirmarComando(comandoId: string) {
    try {
      await fetch(`${config.endpoint_worker}/api/agente/comandos?id=${comandoId}`, {
        method: 'DELETE',
        headers: { 
            'X-Escola-ID': config.escola_id,
            'X-Agente-Token': config.agente_secret,
            'User-Agent': 'SCAE-Agent/1.6.2-FINAL'
        },
        signal: AbortSignal.timeout(5000)
      });
      return true;
    } catch { return false; }
  }

  /**
   * Telemetria de Erros (Item 4): Envia alertas de falhas críticas para o dashboard.
   */
  static async reportarErroCritico(detalhes: string, contexto: string = 'GERAL') {
    try {
      const payload = {
          escola_id: config.escola_id,
          escola_nome: config.nome_escola,
          contexto,
          erro: detalhes,
          timestamp: new Date().toISOString(),
          versao: '1.1.0'
      };
      
      console.warn(`[WorkerApi] 🚩 AGENTE EMITINDO SINAL DE FUMAÇA (ERRO CRÍTICO): ${detalhes}`);
      await fetch(`${config.endpoint_worker}/api/agente/reportar-erro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000)
      });
    } catch { /* Telemetria nunca pode travar o Agente */ }
  }
}
