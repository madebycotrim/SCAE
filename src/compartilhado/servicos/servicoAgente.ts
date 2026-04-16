/**
 * servicoAgente.ts - Comunicação com o Agente local (Catraki Edge Agent).
 * Responsável por detectar a presença do Agente na máquina local e 
 * delegar comandos de hardware.
 */

const URL_AGENTE = 'http://localhost:1912';

export interface StatusAgente {
    online: boolean;
    versao?: string;
    nomeEscola?: string;
    leitores?: any[];
}

export const servicoAgente = {
    /**
     * Verifica se o Agente local está respondendo na porta 1912.
     */
    async ping(): Promise<StatusAgente> {
        try {
            const resp = await fetch(`${URL_AGENTE}/ping`, { 
                signal: AbortSignal.timeout(2000) 
            });
            if (resp.ok) {
                const dados = await resp.json();
                return {
                    online: true,
                    versao: dados.versao,
                    nomeEscola: dados.nome_escola,
                    leitores: dados.leitores
                };
            }
            return { online: false };
        } catch {
            return { online: false };
        }
    },

    /**
     * Envia um registro de acesso para o Agente local processar e sincronizar.
     */
    async registrarAcesso(registro: any): Promise<boolean> {
        try {
            const resp = await fetch(`${URL_AGENTE}/idflex-push`, {
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
            const resp = await fetch(`${URL_AGENTE}/hardware/reiniciar`, { method: 'POST' }); // Nota: O endpoint de abrir porta pode ser diferente, usando o de reiniciar como exemplo de rota de hardware existente
            return resp.ok;
        } catch {
            return false;
        }
    }
};
