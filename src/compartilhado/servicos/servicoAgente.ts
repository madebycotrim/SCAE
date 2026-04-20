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
    erroPin?: boolean;
}

// --- CIRCUIT BREAKER PARA EVITAR SPAM DE ERROS NO CONSOLE ---
let agenteCircuitoAbertoAte = 0;
const TEMPO_ESPERA_CIRCUITO_MS = 30000; // 30 segundos silenciado
// -------------------------------------------------------------

async function fetchAgente(endpoint: string, options: any = {}) {
    // Se o circuito estiver aberto, devolvemos falha silenciosamente sem disparar fetch real
    if (Date.now() < agenteCircuitoAbertoAte) {
        throw new Error('Agente Inacessível (Circuito em Repouso Silencioso)');
    }

    // Prioridade de URLs baseada na necessidade
    // Se for 'apenasLocal', ignora a nuvem (usado para radar em tempo real)
    const urls = options.apenasLocal 
        ? [`http://127.0.0.1:${PORTA_AGENTE}`, `http://localhost:${PORTA_AGENTE}`]
        : ['https://catraki.com.br', `http://127.0.0.1:${PORTA_AGENTE}`, `http://localhost:${PORTA_AGENTE}`];
    
    // Recupera o PIN salvo para as rotas críticas do agente
    const pin = storageEscola.get('agente_pin', '');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(pin ? { 'x-admin-pin': pin } : {})
    };

    for (const baseUrl of urls) {
        try {
            const resp = await fetch(`${baseUrl}${endpoint}`, {
                ...options,
                headers,
                signal: AbortSignal.timeout(options.timeout || 2000),
                mode: 'cors'
            });
            
            if (resp.ok) {
                agenteCircuitoAbertoAte = 0; // Agente respondeu = Restaura circuito
                return resp;
            }
            
            if (resp.status === 401) {
                throw new Error('Não Autorizado: PIN do Agente inválido.');
            }
        } catch (e: any) {
            if (e.message.includes('Não Autorizado')) throw e;
        }
    }
    
    // Se falhou todos e não é apenasLocal, abre o circuito
    if (!options.apenasLocal) {
        agenteCircuitoAbertoAte = Date.now() + TEMPO_ESPERA_CIRCUITO_MS;
    }
    
    throw new Error('Agente Inacessível (Conexão Falhou)');
}

export const servicoAgente = {
    /**
     * Define o PIN administrativo para as chamadas locais.
     */
    definirPin(pin: string) {
        storageEscola.set('agente_pin', pin);
    },

    removerPin() {
        storageEscola.remover('agente_pin');
    },

    /**
     * Verifica se o Agente local está respondendo na porta 1912.
     */
    async ping(): Promise<StatusAgente> {
        try {
            const resp = await fetchAgente('/ping');
            const dados = await resp.json();
            return {
                online: true,
                versao: dados.versao,
                nomeEscola: dados.nome_escola,
                leitores: dados.leitores || []
            };
        } catch (e: any) {
            const erroPin = e.message?.includes('Não Autorizado');
            return { online: false, erroPin };
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
