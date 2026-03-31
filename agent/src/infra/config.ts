/**
 * infra/config.ts
 * Gestão de configurações do agente local.
 */

import path from 'path';
import { TipoLeitor, LeitorConfig, LeitorTcpConfig } from '../drivers/ILeitor';

// Carregar variáveis de ambiente do .env na raiz do agent/
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch {
  console.warn('[Config] dotenv não encontrado, usando variáveis de ambiente do sistema.');
}

export interface AgenteConfig {
  escola_id: string;
  leitores: (LeitorConfig | LeitorTcpConfig)[];
  intervalo_polling_ms: number;
  intervalo_sync_ms: number;
  endpoint_worker: string;
  agente_token: string;
}

// Configuração carregada por variável de ambiente ou arquivo local
export const config: AgenteConfig = {
  escola_id: process.env.CATRAKI_ESCOLA_ID || 'cem03-taguatinga',
  leitores: [
    {
      id: 'portaria-principal',
      nome: 'iDFlex Portaria Principal',
      tipo: TipoLeitor.ID_FLEX,
      ip: '192.168.1.10',
      porta: 80
    } as LeitorTcpConfig,
    {
      id: 'portaria-secundaria',
      nome: 'Anviz Portaria Norte',
      tipo: TipoLeitor.ANVIZ,
      ip: '192.168.1.11',
      porta: 5010
    } as LeitorTcpConfig
  ],
  intervalo_polling_ms: 1000,   // Coleta a cada 1 segundo
  intervalo_sync_ms: 5000,      // Sincroniza com a nuvem a cada 5 segundos
  endpoint_worker: process.env.CATRAKI_TUNNEL_URL || process.env.CATRAKI_API_URL || 'https://catraki.workers.dev',
  agente_token: process.env.CATRAKI_AGENTE_TOKEN || 'catraki_dev_token'
};
