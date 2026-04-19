/**
 * servicoAgente.ts - Comunicação com o Agente local (Catraki Edge Agent).
 * Responsável por detectar a presença do Agente na máquina local e 
 * delegar comandos de hardware.
 */

const PORTA_AGENTE = '1912';
const CHAVE_PIN_AGENTE = 'scae_agente_pin';

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
    
    // Recupera o PIN salvo para as rotas críticas do agente
    const pin = localStorage.getItem(CHAVE_PIN_AGENTE);
    
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
            if (resp.ok) return resp;
            
            // Se retornar 401, significa PIN inválido ou ausente
            if (resp.status === 401) {
                throw new Error('Não Autorizado: PIN do Agente inválido.');
            }
        } catch (e: any) {
            if (e.message.includes('Não Autorizado')) throw e;
            // Continua para a próxima URL em caso de erro de conexão
        }
    }
    throw new Error('Agente Inacessível');
}

export const servicoAgente = {
    /**
     * Define o PIN administrativo para as chamadas locais.
     */
    definirPin(pin: string) {
        localStorage.setItem(CHAVE_PIN_AGENTE, pin);
    },

    /**
     * Remove o PIN administrativo.
     */
    removerPin() {
        localStorage.removeItem(CHAVE_PIN_AGENTE);
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
    async obterRegistrosRecentes(desde?: string): Promise<any[]> {
        try {
            const query = desde ? `?desde=${encodeURIComponent(desde)}` : '';
            const resp = await fetchAgente(`/acesso/recentes${query}`);
            return await resp.json();
        } catch {
            return [];
        }
    }
};
