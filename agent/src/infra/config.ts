/**
 * infra/config.ts
 * Gestão de configurações do agente local.
 */

import { TipoLeitor, LeitorConfig, LeitorTcpConfig } from '../drivers/ILeitor';

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
  escola_id: process.env.SCAE_ESCOLA_ID || 'cem03-taguatinga',
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
  endpoint_worker: process.env.SCAE_API_URL || 'https://scae-api.se-df.workers.dev',
  agente_token: process.env.SCAE_AGENTE_TOKEN || 'scae_dev_token'
};
