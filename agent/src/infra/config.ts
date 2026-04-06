/**
 * infra/config.ts
 * Central de Configuração do Agente com Persistência Definitiva.
 */
import fs from 'fs';
import path from 'path';
import { TipoLeitor, LeitorConfig, LeitorTcpConfig } from '../drivers/ILeitor';
import { app } from 'electron';

// ⚡ LOCALIZADOR DE CONFIGURAÇÃO PERSISTENTE
const getLocalConfigPath = () => {
    // No Windows: C:\Users\nome\AppData\Roaming\catraki-agent\data\local-config.json
    const userData = app.getPath('userData');
    const dataDir = path.join(userData, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    return path.join(dataDir, 'local-config.json');
};

export interface AgenteConfig {
  escola_id: string;
  nome_escola?: string;
  total_alunos?: number;
  tts_ativado?: boolean;
  tts_sucesso?: string;
  tts_erro?: string;
  leitores: (LeitorConfig | LeitorTcpConfig)[];
  ip_agente?: string;
  intervalo_polling_ms: number;
  intervalo_sync_ms: number;
  endpoint_worker: string;
  admin_pin: string;
}

// Configuração padrão de fábrica
const configPadrao: AgenteConfig = {
  escola_id: 'aguardando-identidade',
  nome_escola: 'STANDBY (SINAL RESTRITO)',
  total_alunos: 0,
  tts_ativado: false,
  tts_sucesso: '',
  tts_erro: '',
  leitores: [],
  intervalo_polling_ms: 2000,
  intervalo_sync_ms: 10000,
  endpoint_worker: 'https://catraki.com.br',
  admin_pin: '123456'
};

// Singleton em memória
export let config: AgenteConfig = { ...configPadrao };

/**
 * Lê o arquivo do disco e atualiza a variável global 'config'
 */
export function carregarConfiguracaoHardware() {
    try {
        const configPath = getLocalConfigPath();
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            const data = JSON.parse(raw);
            if (data.leitores) {
                config.leitores = data.leitores.map((l: any) => ({
                    ...l,
                    id: l.id || `idflex-${l.ip?.replace(/\W/g, '') || Date.now()}`
                }));
                if (data.ip_agente) config.ip_agente = data.ip_agente;
                console.log(`[Config] ${config.leitores.length} leitores e IP Configurado: ${config.ip_agente || 'Automático'}`);
            }
        } else {
            console.log('[Config] local-config.json não existe. Usando padrão.');
        }
    } catch (e: any) {
        console.error('[Config] Erro ao carregar hardware:', e.message);
    }
}

/**
 * Grava a lista de leitores fisicamente no disco e atualiza a memória
 */
export function salvarLeitoresNoDisco(leitores: any[], ip_agente?: string) {
  try {
    const configPath = getLocalConfigPath();
    const data = { 
        leitores, 
        ip_agente: ip_agente || undefined 
    };
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    
    // Atualiza a referência global
    config.leitores = leitores;
    if (ip_agente !== undefined) config.ip_agente = ip_agente;
    
    console.log(`[Config] CONFIGURAÇÃO SALVA COM SUCESSO EM: ${configPath}`);
    return true;
  } catch (e) {
    console.error('[Config] Falha crítica ao salvar no disco:', e);
    return false;
  }
}

// Carga Inicial Automática
carregarConfiguracaoHardware();
