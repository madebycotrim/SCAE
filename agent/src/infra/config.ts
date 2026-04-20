/**
 * infra/config.ts
 * Central de Configuração do Agente com Persistência Definitiva.
 */
require('dotenv').config();
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
  agente_secret: string; // Token de autenticação entre Agente <-> Cloudflare
  janelas?: any[]; // Regras de horário para classificação entrada/saída
  ultimo_sinc_alunos?: string; // ISO 8601 do último aluno sincronizado (Delta Sync)
  porta_agente?: number; // Porto local para recebimento de eventos (Padrão 1912)
  url_agente?: string; // URL pública para acesso remoto (Ex: Túnel Cloudflare)
  mensagens_no_hardware?: boolean; // Se deve exibir saudações (BOM DIA, NOME) no visor
}

// Configuração padrão de fábrica
const configPadrao: AgenteConfig = {
  escola_id: process.env.ESCOLA_ID || 'aguardando-identidade',
  nome_escola: 'STANDBY (SINAL RESTRITO)',
  total_alunos: 0,
  tts_ativado: false,
  tts_sucesso: '',
  tts_erro: '',
  leitores: [],
  janelas: [],
  intervalo_polling_ms: 2000,
  intervalo_sync_ms: 10000,
  endpoint_worker: process.env.CATRAKI_API_URL || 'https://www.catraki.com.br',
  admin_pin: '123456',
  agente_secret: process.env.AGENTE_SECRET || 'agente-secret-token',
  porta_agente: 1912,
  url_agente: process.env.CATRAKI_AGENTE_URL || ''
};

// Singleton em memória
export let config: AgenteConfig = { ...configPadrao };

/**
 * Lê o arquivo do disco e atualiza a variável global 'config'
 */
export function carregarConfiguracaoHardware() {
    console.log('[Config] 🛠️ Carregando motor de configuração...');
    console.log(`[Config] 🔗 Nuvem Alvo: ${config.endpoint_worker}`);
    console.log(`[Config] 🔑 Escola ID: ${config.escola_id}`);
    
    try {
        const configPath = getLocalConfigPath();
        
        // Prioridade 1: .env (para desenvolvedores/live)
        if (process.env.CATRAKI_API_URL) config.endpoint_worker = process.env.CATRAKI_API_URL;
        if (process.env.ESCOLA_ID) config.escola_id = process.env.ESCOLA_ID;
        if (process.env.AGENTE_SECRET) config.agente_secret = process.env.AGENTE_SECRET;
        if (process.env.CATRAKI_AGENTE_URL) config.url_agente = process.env.CATRAKI_AGENTE_URL;

        // Prioridade 2: Persistência em disco (configurações via UI do Agente)
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            const data = JSON.parse(raw);
            if (data.leitores) {
                config.leitores = data.leitores.map((l: any) => {
                    // ID Determinístico baseado no IP para evitar duplicatas órfãs
                    const ipClean = l.ip?.replace(/\W/g, '') || '0000';
                    return {
                        ...l,
                        ip: l.ip ? l.ip.split(':')[0].trim() : '',
                        id: l.id || `idflex-${ipClean}`
                    };
                });
                if (data.ip_agente !== undefined) config.ip_agente = data.ip_agente;
                if (data.agente_secret !== undefined) config.agente_secret = data.agente_secret;
                if (data.escola_id !== undefined) config.escola_id = data.escola_id;
                if (data.nome_escola !== undefined) config.nome_escola = data.nome_escola;
                if (data.ultimo_sinc_alunos !== undefined) config.ultimo_sinc_alunos = data.ultimo_sinc_alunos;
                if (data.janelas !== undefined) config.janelas = data.janelas;
                if (data.tts_ativado !== undefined) config.tts_ativado = data.tts_ativado;
                if (data.tts_sucesso !== undefined) config.tts_sucesso = data.tts_sucesso;
                if (data.tts_erro !== undefined) config.tts_erro = data.tts_erro;
                if (data.endpoint_worker !== undefined) config.endpoint_worker = data.endpoint_worker;
                if (data.url_agente !== undefined) config.url_agente = data.url_agente;

                console.log(`[Config] 📂 Estado carregado: ${config.leitores.length} leitores | Escola: ${config.escola_id}`);
            }
        } else {
            console.log('[Config] local-config.json não existe. Usando padrões e .env.');
        }
    } catch (e: any) {
        console.error('[Config] Erro ao carregar hardware:', e.message);
    }
}

/**
 * Grava o estado completo da configuração no disco.
 */
export function salvarConfiguracaoCompleta() {
    try {
        const configPath = getLocalConfigPath();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (e) {
        console.error('[Config] Erro ao salvar configuração completa:', e);
        return false;
    }
}

/**
 * Grava apenas a lista de leitores e o IP (interface legada v3.0)
 */
export function salvarLeitoresNoDisco(leitores: any[], ip_agente?: string) {
  config.leitores = leitores;
  
  // ⚡ SANITIZAÇÃO: Remove portas acidentais (:80, :1912) se o usuário digitou no campo de IP
  if (ip_agente !== undefined) {
      config.ip_agente = ip_agente.split(':')[0].trim();
  }

  // Sanitiza também os IPs dos leitores
  config.leitores = (leitores || []).map(l => ({
      ...l,
      ip: l.ip ? l.ip.split(':')[0].trim() : ''
  }));
  
  return salvarConfiguracaoCompleta();
}

// Carga Inicial Automática
carregarConfiguracaoHardware();
