import fs from 'fs';
import path from 'path';
import { TipoLeitor, LeitorConfig, LeitorTcpConfig } from '../drivers/ILeitor';

// Caminho para o arquivo de persistência local das configurações de hardware
const CONFIG_LOCAL_PATH = path.resolve(__dirname, '../../local-config.json');


// Carregar variáveis de ambiente do .env na raiz do SCAE
try {
  const dotenv = require('dotenv');
  // Procura no diretório raiz do projeto (../../../.env porque estamos em dist/infra/)
  const rootEnv = path.resolve(__dirname, '../../../.env');
  const agentEnv = path.resolve(__dirname, '../../.env');
  
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else {
    dotenv.config({ path: agentEnv });
  }
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
  admin_pin: string; // Senha mestre para acesso local/configuração
}


// Configuração padrão in-memory
let configBase: AgenteConfig = {
  escola_id: process.env.CATRAKI_ESCOLA_ID || 'cem03-taguatinga',
  leitores: [
    {
      id: 'idflex-real',
      nome: 'iDFlex Portaria (Físico)',
      tipo: TipoLeitor.ID_FLEX,
      ip: '192.168.1.34:8080',
      porta: 8080
    } as LeitorTcpConfig

  ],
  intervalo_polling_ms: 1000,
  intervalo_sync_ms: 10000,
  endpoint_worker: process.env.CATRAKI_API_URL || 'http://localhost:8788',

  agente_token: process.env.CATRAKI_AGENTE_TOKEN || 'catraki_dev_token',
  admin_pin: process.env.CATRAKI_ADMIN_PIN || '123456'
};

// Tenta carregar persistência do disco para o hardware
try {
  if (fs.existsSync(CONFIG_LOCAL_PATH)) {
    const data = JSON.parse(fs.readFileSync(CONFIG_LOCAL_PATH, 'utf-8'));
    if (data.leitores) configBase.leitores = data.leitores;
    console.log('[Config] Hardware carregado do disco com sucesso.');
  }
} catch (e) {
  console.log('[Config] Usando configurações padrão (disco não encontrado).');
}

// Exporta a config e função para salvar fisicamente
export const config = configBase;

export const salvarLeitoresNoDisco = (leitores: any[]) => {
  try {
    const data = { leitores };
    fs.writeFileSync(CONFIG_LOCAL_PATH, JSON.stringify(data, null, 2));
    config.leitores = leitores; // Atualiza em memória também
    console.log('[Config] Novas configurações de hardware salvas no disco.');
  } catch (e) {
    console.error('[Config] Erro ao persistir no disco:', e);
  }
};


