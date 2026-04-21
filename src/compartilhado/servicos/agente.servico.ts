import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { storageEscola } from '@/compartilhado/utils/utilidades-slug';

const registrar = criarRegistrador('AgenteServico');
const PORTA_AGENTE = '1912';

// --- CIRCUIT BREAKER - PROTEÇÃO CONTRA SPAM DE REDE ---
let circuitoAbertoAte = 0;
const TEMPO_REPOUSO_MS = 15000; // 15 segundos silenciando erros de conexão
// -----------------------------------------------------

/**
 * Interface de Resposta Base do Agente.
 */
export interface RespostaAgentePadrao {
    ok: boolean;
    erro?: string;
    [chave: string]: any;
}

/**
 * Estado detalhado da saúde do Agente Local.
 */
export interface EstadoAgenteLocal {
    online: boolean;
    versao?: string;
    nomeEscola?: string;
    leitores?: any[];
    leitoresAtivos?: number;
    stats?: {
        entradas: number;
        saidas: number;
        negados: number;
        ultimoAcesso: string | null;
        ultimosEventos: any[];
    };
}

/**
 * SERVIÇO DO AGENTE LOCAL (Catraki Edge Agent)
 * Gerencia a comunicação híbrida com o binário local e fallbacks via nuvem.
 */
export const agenteServico = {
    /**
     * Executa uma requisição interna ao Agente com proteção de Circuit Breaker.
     * @private
     */
    async _requisicao(endpoint: string, opcoes: any = {}) {
        if (Date.now() < circuitoAbertoAte) {
            throw new Error('AGENTE_EM_REPOUSO');
        }

        const urls: string[] = [];
        
        // 1. Tentar túnel na nuvem se disponível (Prioridade Híbrida)
        if (!opcoes.apenasLocal) {
            const perfil = storageEscola.get<any>('perfil', null);
            if (perfil?.urlAgente) {
                urls.push(perfil.urlAgente);
            }
        }

        // 2. Fallback para Localhost (IP Direto para evitar DNS local lento)
        urls.push(`http://127.0.0.1:${PORTA_AGENTE}`);
        urls.push(`http://localhost:${PORTA_AGENTE}`);
        
        for (const baseUrl of urls) {
            try {
                const resposta = await fetch(`${baseUrl}${endpoint}`, {
                    ...opcoes,
                    headers: { 'Content-Type': 'application/json', ...opcoes.headers },
                    signal: AbortSignal.timeout(opcoes.timeout || 3000),
                    mode: 'cors'
                });
                
                if (resposta.ok) {
                    circuitoAbertoAte = 0; // Desarma o disjuntor se houver sucesso
                    return resposta;
                }
            } catch (e) {
                // Silencioso por URL, tenta a próxima
            }
        }
        
        // Falha total: Abre o circuito para evitar travar o navegador com requisições inúteis
        circuitoAbertoAte = Date.now() + TEMPO_REPOUSO_MS;
        throw new Error('AGENTE_INACESSIVEL');
    },

    /**
     * Verifica a viabilidade de comunicação com o Agente.
     */
    async verificarSaude(): Promise<EstadoAgenteLocal> {
        try {
            const resp = await this._requisicao('/ping', { apenasLocal: true });
            const dados = await resp.json();
            return {
                online: true,
                versao: dados.versao,
                nomeEscola: dados.nome_escola,
                leitores: dados.leitores || [],
                leitoresAtivos: dados.leitoresAtivos || 0,
                stats: dados.stats
            };
        } catch {
            return { online: false };
        }
    },

    /**
     * Inicia o processo de captura biométrica no hardware local.
     * @param alunoId - Matrícula para associar a digital.
     */
    async iniciarCaptura(alunoId: string): Promise<RespostaAgentePadrao> {
        try {
            const resp = await this._requisicao('/enroll', {
                method: 'POST',
                body: JSON.stringify({ aluno_id: alunoId }),
                apenasLocal: true
            });
            return await resp.json();
        } catch (erro) {
            registrar.error('Falha ao comandar captura', erro);
            throw new Error('Não foi possível estabelecer contato com o hardware biométrico.');
        }
    },

    /**
     * Envia um registro de acesso externo para processamento local (Push).
     */
    async registrarAcessoExterno(registro: any): Promise<boolean> {
        try {
            const resp = await this._requisicao('/idflex-push', {
                method: 'POST',
                body: JSON.stringify(registro),
                apenasLocal: true
            });
            return resp.ok;
        } catch {
            return false;
        }
    },

    /**
     * Comanda o reinício operacional das estatísticas e contadores do Agente.
     */
    async resetarEstatisticas(): Promise<void> {
        try {
            await this._requisicao('/reset-stats', { method: 'POST', mode: 'no-cors', apenasLocal: true });
        } catch (erro) {
            registrar.debug('Falha no comando de reset de estatísticas');
        }
    },

    /**
     * Força uma rotina de sincronização imediata entre Agente Local e Cloud.
     */
    async forcarSincronia(): Promise<void> {
        try {
            await this._requisicao('/sync-now', { method: 'POST', mode: 'no-cors', apenasLocal: true });
        } catch (erro) {
            registrar.debug('Falha ao solicitar sincronia forçada');
        }
    },

    /**
     * Busca os registros de acesso mais recentes diretamente do banco local do Agente.
     * @param desde - Timestamp ISO para filtrar registros novos.
     */
    async obterRegistrosRecentes(desde?: string): Promise<any[]> {
        try {
            const query = desde ? `?desde=${encodeURIComponent(desde)}` : '';
            const resp = await this._requisicao(`/acesso/recentes${query}`, { apenasLocal: true });
            return await resp.json();
        } catch {
            return [];
        }
    }
};
