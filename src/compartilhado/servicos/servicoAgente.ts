/**
 * servicoAgente.ts - Comunicação com o Agente local (Catraki Edge Agent).
 * Responsável por detectar a presença do Agente na máquina local e 
 * delegar comandos de hardware.
 */

import { storageEscola } from '../utils/utilidades-slug';

const PORTA_AGENTE = '1912';

export interface StatusAgente {
    online: boolean;
    versao?: string;
    nomeEscola?: string;
    leitores?: any[];
    leitoresAtivos?: number;
    stats?: any;
    erroPin?: boolean;
}

// --- CIRCUIT BREAKER PARA EVITAR SPAM DE ERROS NO CONSOLE ---
let agenteCircuitoAbertoAte = 0;
const TEMPO_ESPERA_CIRCUITO_MS = 30000; // 30 segundos silenciado
// -------------------------------------------------------------

async function fetchAgente(endpoint: string, options: any = {}) {
    // Se o circuito estiver aberto, devolvemos falha silenciosamente
    if (Date.now() < agenteCircuitoAbertoAte) {
        throw new Error('Agente Inacessível (Circuito em Repouso)');
    }

    // URLs Alvo: 
    // 1. localhost (Prioritário para quem está na mesma máquina)
    // 2. URL do Túnel (Fallback para acesso de outras máquinas da rede)
    const urls: string[] = [];
    
    // 🚩 PRIORIDADE 1: O Túnel configurado (agente.catraki.com.br)
    const perfil = storageEscola.get<any>('perfil', null);
    if (perfil?.urlAgente) {
        urls.push(perfil.urlAgente);
    }

    // 🚩 PRIORIDADE 2: O Localhost (Apenas fallback)
    urls.push(`http://localhost:${PORTA_AGENTE}`);
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    for (const baseUrl of urls) {
        try {
            console.log(`[Agente] 📡 Tentando: ${baseUrl}${endpoint}...`);
            const resp = await fetch(`${baseUrl}${endpoint}`, {
                ...options,
                headers,
                signal: AbortSignal.timeout(options.timeout || 5000),
                mode: 'cors'
            });
            
            if (resp.ok) {
                console.log(`[Agente] ✅ Sucesso via: ${baseUrl}`);
                agenteCircuitoAbertoAte = 0;
                return resp;
            }
            console.warn(`[Agente] ⚠️ Resposta inválida de ${baseUrl}: ${resp.status}`);
        } catch (e: any) {
            console.error(`[Agente] ❌ Falha em ${baseUrl}:`, e.name === 'TimeoutError' ? 'Timeout' : e.message);
        }
    }
    
    if (!options.apenasLocal) {
        agenteCircuitoAbertoAte = Date.now() + TEMPO_ESPERA_CIRCUITO_MS;
    }
    
    throw new Error('Agente Inacessível');
}

export const servicoAgente = {
    definirPin() {}, // Depreciado
    removerPin() {}, // Depreciado

    /**
     * Verifica se o Agente local está respondendo.
     */
    async ping(): Promise<StatusAgente> {
        try {
            const resp = await fetchAgente('/ping', { apenasLocal: true });
            const dados = await resp.json();
            return {
                online: true,
                versao: dados.versao,
                nomeEscola: dados.nome_escola,
                leitores: dados.leitores || []
            };
        } catch {
            return { online: false };
        }
    },

    /**
     * Envia um registro de acesso para o Agente local processar e sincronizar.
     */
    async registrarAcesso(registro: any): Promise<boolean> {
        try {
            const resp = await fetchAgente('/idflex-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registro),
                apenasLocal: true
            });
            return resp.ok;
        } catch {
            return false;
        }
    },

    /**
     * Comanda a abertura remota da catraca via Agente.
     */
    async abrirCatraca(): Promise<boolean> {
        try {
            const resp = await fetchAgente('/hardware/reiniciar', { method: 'POST', apenasLocal: true });
            return resp.ok;
        } catch {
            return false;
        }
    },

    /**
     * Busca os registros de acesso mais recentes diretamente do banco local do Agente.
     */
    async obterRegistrosRecentes(desde?: string): Promise<any[]> {
        try {
            const query = desde ? `?desde=${encodeURIComponent(desde)}` : '';
            const resp = await fetchAgente(`/acesso/recentes${query}`, { apenasLocal: true });
            return await resp.json();
        } catch {
            return [];
        }
    }
};
