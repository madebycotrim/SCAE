/**
 * services/worker-endpoint.ts
 * Driver de Comunicacao Hibrido (Cloud-First com Fallback Local Inteligente).
 */
import { config } from '../infra/config';

export class WorkerApi {
  /**
   * Tenta buscar os dados da Nuvem com Headers robustos.
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
    }

    console.info(`[WorkerApi] → Mudando para banco LOCAL de emergência...`);
    try {
        const localResp = await fetch(urlLocal, {
          headers: { 'X-Escola-ID': config.escola_id }
        });
        const localData = await localResp.json();
        return { ...localData, ok: true };
    } catch { }

    return { ok: false };
  }

  /**
   * Envia as presenças coletadas localmente para o sistema web (Cloudflare)
   */
  static async enviarBatida(eventos: any[]) {
    const urlBatch = `${config.endpoint_worker}/api/agente/sync-ponto`;
    
    // ⚡ MAPEAMENTO DE CAMPOS: O Servidor Cloudflare espera nomes de colunas do D1
    // Registros no banco local v3 -> Objetos esperados pelo sync-ponto.ts
    const registrosCloud = eventos.map(e => ({
        id: e.id,
        escola_id: config.escola_id,
        aluno_matricula: e.matricula, // Converte 'matricula' para 'aluno_matricula'
        tipo_movimentacao: e.tipo || 'ENTRADA', // Converte 'tipo' para 'tipo_movimentacao'
        metodo_leitura: 'BIOMETRIA',
        timestamp_acesso: e.timestamp_acesso,
        leitor_id: e.leitor_id,
        id_evento_hardware: e.id.split('-')[1] || '0'
    }));

    try {
      const resp = await fetch(urlBatch, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'X-Escola-ID': config.escola_id,
            'User-Agent': 'SCAE-Agent/1.6.0'
        },
        // O servidor espera a chave 'registros', não 'eventos'
        body: JSON.stringify({ registros: registrosCloud })
      });

      if (resp.ok) {
        return true;
      } else {
        const textoErro = await resp.text();
        console.error(`[WorkerApi] ! SITE RECUSOU AS BATIDAS (Status ${resp.status}): ${textoErro.substring(0, 150)}`);
        return false;
      }
    } catch (e: any) { 
      console.error(`[WorkerApi] ✗ ERRO DE CONEXÃO AO ENVIAR BATIDAS:`, e.message);
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
            'User-Agent': 'SCAE-Agent/1.6.0'
        },
        body: JSON.stringify(corpo)
      });
    } catch { }
  }
}
