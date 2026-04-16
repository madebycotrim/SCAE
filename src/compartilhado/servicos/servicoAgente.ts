/**
 * servicoAgente.ts - Comunicação com o Agente local (Catraki Edge Agent).
 * Responsável por detectar a presença do Agente na máquina local e 
 * delegar comandos de hardware.
 */

const PORTA_AGENTE = '1912';

export interface StatusAgente {
    online: boolean;
    versao?: string;
    nomeEscola?: string;
    leitores?: any[];
}

/**
 * Helper para realizar fetch com timeout e failover entre 127.0.0.1 e localhost.
 */
async function fetchAgente(endpoint: string, options: any = {}) {
    const urls = [`http://127.0.0.1:${PORTA_AGENTE}`, `http://localhost:${PORTA_AGENTE}`];
    
    for (const baseUrl of urls) {
        try {
            const resp = await fetch(`${baseUrl}${endpoint}`, {
                ...options,
                signal: AbortSignal.timeout(options.timeout || 2000),
                mode: 'cors'
            });
            if (resp.ok) return resp;
        } catch (e) {
            // Continua para a próxima URL
        }
    }
    throw new Error('Agente Inacessível');
}

export const servicoAgente = {
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
                leitores: dados.leitores
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
                body: JSON.stringify(registro)
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
            const resp = await fetchAgente('/hardware/reiniciar', { method: 'POST' });
            return resp.ok;
        } catch {
            return false;
        }
    },

    /**
     * Busca os registros de acesso mais recentes diretamente do banco local do Agente.
     */
    async obterRegistrosRecentes(): Promise<any[]> {
        try {
            const resp = await fetchAgente('/acesso/recentes');
            return await resp.json();
        } catch {
            return [];
        }
    }
};
