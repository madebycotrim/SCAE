/**
 * drivers/IdFlexHelper.ts
 * Utilitários para comunicação com leitores ControlID iDFlex.
 */

import http from 'http';

export interface IdFlexConfig {
  ip: string;
  token?: string;
}

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

  /** Realiza requisição REST para o iDFlex */
  async requisitar(cfg: IdFlexConfig, endpoint: string, dados: any = {}, msTimeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const isBinario = Buffer.isBuffer(dados);
      const payload = isBinario ? dados : JSON.stringify(dados);
      
      // Ajusta a concatenação da sessão (usa & se já houver ? no endpoint)
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
            const err = new Error(`Erro HTTP ${res.statusCode} do iDFlex em ${endpoint}: ${body.slice(0, 150)}`);
            (err as any).code = 'HTTP_ERROR';
            (err as any).statusCode = res.statusCode;
            (err as any).body = body;
            return reject(err);
          }
          
          try {
            if (!body) return resolve({});
            // Se a resposta começar com { ou [ tenta JSON, senão resolve o body bruto
            if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
                const json = JSON.parse(body);
                return resolve(json);
            }
            resolve({ status: 'ok', body });
          } catch {
            if (body.toLowerCase().includes('ok')) return resolve({ status: 'ok' });
            resolve({ status: 'ok', body }); // Fallback para não quebrar fluxos binários
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

