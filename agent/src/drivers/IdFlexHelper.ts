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
  /** Realiza requisição REST para o iDFlex */
  async requisitar(cfg: IdFlexConfig, endpoint: string, dados: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(dados);
      const url = `http://${cfg.ip}/${endpoint}${cfg.token ? `?session=${cfg.token}` : ''}`;

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 4000
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch {
            reject(new Error(`Resposta iDFlex inválida (JSON Malformado): ${body}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout na comunicação com o iDFlex ${cfg.ip}`));
      });

      req.write(payload);
      req.end();
    });
  },

  /** Autentica e retorna o token de sessão */
  async login(cfg: IdFlexConfig, user = 'admin', pass = 'admin'): Promise<string> {
    const res = await this.requisitar(cfg, 'login.fcgi', { login: user, password: pass });
    if (!res.session) throw new Error('Falha na autenticação do iDFlex');
    return res.session;
  }
};
