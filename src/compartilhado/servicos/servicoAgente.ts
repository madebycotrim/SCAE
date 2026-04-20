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
const TEMPO_ESPERA_CIRCUITO_MS = 15000; // 15 segundos silenciado (antes 30s)
// -------------------------------------------------------------

async function fetchAgente(endpoint: string, options: any = {}) {
    // Se o circuito estiver aberto, devolvemos falha silenciosamente
    if (Date.now() < agenteCircuitoAbertoAte) {
        throw new Error('Agente Inacessível (Circuito em Repouso)');
    }

    const urls: string[] = [];
    
    // Se não for exclusividade local e houver um túnel configurado, prioriza a Nuvem
    if (!options.apenasLocal) {
        const perfil = storageEscola.get<any>('perfil', null);
        if (perfil?.urlAgente) {
            urls.push(perfil.urlAgente);
        }
    }

    // 🚩 PRIORIDADE: Localhost IP (Evita problemas de DNS no Windows e CORS injetados por Proxies 502)
    urls.push(`http://127.0.0.1:${PORTA_AGENTE}`);
    urls.push(`http://localhost:${PORTA_AGENTE}`);
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    for (const baseUrl of urls) {
        try {
            const resp = await fetch(`${baseUrl}${endpoint}`, {
                ...options,
                headers,
                signal: AbortSignal.timeout(options.timeout || 3000),
                mode: 'cors'
            });
            
            if (resp.ok) {
                agenteCircuitoAbertoAte = 0; // Agente voltou, desarma o disjuntor
                return resp;
            }
        } catch (e: any) {
            // Silencioso no script, mas o navegador ainda vai injetar a linha vermelha naturalmente
        }
    }
    
    // Agente falhou em TODAS as rotas, arma o disjuntor para todas as proteções futuras do app
    agenteCircuitoAbertoAte = Date.now() + TEMPO_ESPERA_CIRCUITO_MS;
    
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
