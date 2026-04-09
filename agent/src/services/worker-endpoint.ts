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
   * Suporta Sincronização Delta via timestamp 'desde'.
   */
  static async buscarSincronizacaoAlunos(lastEtag?: string, desde?: string) {
    let urlCloud = `${config.endpoint_worker}/api/agente/download-alunos`;
    let urlLocal = `http://localhost:8788/api/agente/download-alunos`;
    
    if (desde) {
        const query = `?desde=${encodeURIComponent(desde)}`;
        urlCloud += query;
        urlLocal += query;
    }
    
    const headers: any = { 
        'X-Escola-ID': config.escola_id,
        'X-Agente-Token': config.agente_secret, 
        'Content-Type': 'application/json',
        'User-Agent': 'SCAE-Agent/1.6.2-FINAL'
    };

    if (lastEtag && !desde) headers['If-None-Match'] = lastEtag;

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
    const registrosCloud = eventos.map(e => {
        // Extrai o ID numérico final do ID único 
        const partes = e.id.split('-');
        const rawHardwareId = partes[partes.length - 1] || '0';
        const hardwareIdNum = parseInt(rawHardwareId, 10) || 0;

        // Garante que o timestamp esteja em formato ISO para o Worker (YYYY-MM-DDTHH:MM:SSZ)
        let dataIso = e.timestamp_acesso;
        if (dataIso && !dataIso.includes('T')) {
            dataIso = dataIso.replace(' ', 'T') + 'Z';
        }

        // Sanitização total para evitar 500 na Nuvem (D1)
        // O servidor espera exatamente: id, escola_id, aluno_matricula, tipo_movimentacao, metodo_leitura, timestamp_acesso, leitor_id, id_evento_hardware
        const idLimpo = (e.id || `TEMP-${Date.now()}`).replace(/\s+/g, '-').replace(/[^\w-]/g, '');

        return {
            id: idLimpo,
            escola_id: String(config.escola_id || '').toLowerCase().trim(),
            aluno_matricula: String(e.matricula || '0'),
            tipo_movimentacao: String(e.tipo || 'ENTRADA').toUpperCase(),
            metodo_leitura: 'BIOMETRIA',
            timestamp_acesso: dataIso || new Date().toISOString(),
            leitor_id: String(e.leitor_id || 'manual').replace(/\s+/g, '-'),
            id_evento_hardware: hardwareIdNum
        };
    });

    const options = {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'X-Escola-ID': config.escola_id,
            'X-Agente-Token': config.agente_secret,
            'User-Agent': 'SCAE-Agent/1.6.2-FINAL'
        },
        body: JSON.stringify({ registros: registrosCloud }),
        signal: AbortSignal.timeout(15000)
    };

    try {
      const resp = await fetch(urlCloud, options as any);
      if (resp.ok) return true;

      // Se deu erro, queremos ler o PORQUÊ antes de desistir
      const detalheErro = await resp.text().catch(() => 'Erro sem corpo');
      console.warn(`[WorkerApi] Nuvem recusou as batidas (Status ${resp.status}): ${detalheErro.substring(0, 160)}`);
    } catch { 
      // Silencioso
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
