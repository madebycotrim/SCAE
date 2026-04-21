/**
 * drivers/IdFlexHelper.ts
 * Utilitários para comunicação com leitores ControlID iDFlex.
 */

import http from 'http';

export interface IdFlexConfig {
  ip: string;
  token?: string;
}

// Filas de requisição por IP para garantir serialização por hardware
const filasPorIp = new Map<string, Promise<any>>();
// Registro de cool-down (espera) para IPs que retornaram 503 (Busy)
const cooldownsPorIp = new Map<string, number>();

export const IdFlexHelper = {
  /** 
   * Converte valor de cartão (Ex: 123,45678) para o formato da API (BigInt).
   * @param area Código de área (antes da vírgula)
   * @param numero Número do cartão (depois da vírgula)
   */
  converterCartaoParaApi(area: number, numero: number): string {
    // Cálculo: area * 2^32 + numero
    return (BigInt(area) * BigInt(4294967296) + BigInt(numero)).toString();
  },

  /**
   * Converte valor da API para o formato legível de cartão (Ex: 123,45678).
   */
  converterApiParaCartao(valor: string): string {
    const v = BigInt(valor);
    const divisor = BigInt(4294967296);
    const area = v / divisor;
    const numero = v - (area * divisor);
    return `${area},${numero}`;
  },

  /** Realiza requisição REST para o iDFlex com gerenciamento de fila por IP */
  async requisitar(cfg: IdFlexConfig, endpoint: string, dados: any = {}, msTimeout = 5000): Promise<any> {
    const ip = cfg.ip;

    // 1. Aguarda a fila atual deste IP para evitar sobrecarga
    const filaAtual = filasPorIp.get(ip) || Promise.resolve();
    
    const novaPromessa = (async () => {
      try {
        await filaAtual; // Espera a anterior terminar
      } catch { /* ignoramos falha da anterior */ }

      // 2. Verifica se este IP está em tempo de resfriamento (Busy/503)
      const agora = Date.now();
      const tempoRestante = (cooldownsPorIp.get(ip) || 0) - agora;
      if (tempoRestante > 0) {
          await new Promise(r => setTimeout(r, tempoRestante));
      }

      return this._executarRequisicaoHttp(cfg, endpoint, dados, msTimeout);
    })();

    // Registra a nova promessa como o topo da fila
    filasPorIp.set(ip, novaPromessa);
    
    // Limpeza suave da fila (opcional)
    novaPromessa.finally(() => {
        if (filasPorIp.get(ip) === novaPromessa) {
           // No-op ou limpeza futura
        }
    }).catch(() => {});

    return novaPromessa;
  },

  /** 
   * Execução real do HTTP (Internal Use)
   */
  async _executarRequisicaoHttp(cfg: IdFlexConfig, endpoint: string, dados: any, msTimeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const isBinario = Buffer.isBuffer(dados);
      const payload = isBinario ? dados : JSON.stringify(dados);
      
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `http://${cfg.ip}/${endpoint}${cfg.token ? `${separator}session=${cfg.token}` : ''}`;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': isBinario ? 'application/octet-stream' : 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: msTimeout
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            // TRATAMENTO 503 (Busy): Ativa cool-down de 2 segundos para este IP
            if (res.statusCode === 503) {
                cooldownsPorIp.set(cfg.ip, Date.now() + 2000);
            }

            const err = new Error(`Erro HTTP ${res.statusCode} do iDFlex em ${endpoint}: ${body.slice(0, 150)}`);
            (err as any).code = 'HTTP_ERROR';
            (err as any).statusCode = res.statusCode;
            (err as any).body = body;
            return reject(err);
          }
          
          try {
            if (!body) return resolve({});
            if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
                const json = JSON.parse(body);
                return resolve(json);
            }
            resolve({ status: 'ok', body });
          } catch {
            if (body.toLowerCase().includes('ok')) return resolve({ status: 'ok' });
            resolve({ status: 'ok', body });
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => {
        req.destroy();
        const err = new Error(`Timeout na comunicação com o iDFlex ${cfg.ip} em ${endpoint}`);
        (err as any).code = 'ETIMEDOUT';
        reject(err);
      });

      req.write(payload);
      req.end();
    });
  },

  /** Autentica e retorna o token de sessão */
  async login(cfg: IdFlexConfig, user = 'admin', pass = 'admin'): Promise<string> {
    try {
      const res = await this.requisitar(cfg, 'login.fcgi', { login: user, password: pass });
      if (!res.session) throw new Error('Falha na autenticação do iDFlex: Session não retornada');
      return res.session;
    } catch (e: any) {
      console.error(`[iDFlex][${cfg.ip}] ❌ ERRO LOGIN: ${e.message}`);
      if (e.code === 'HTTP_ERROR' && e.statusCode === 401) {
        throw new Error('Usuário ou senha do iDFlex inválidos.');
      }
      throw e;
    }
  }
};

