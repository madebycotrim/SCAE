/**
 * Instância centralizada da API com injeção automática de escola_id e JWT.
 * Mantém compatibilidade com os métodos existentes: obter, enviar, remover.
 */
import { autenticacao } from '@/compartilhado/servicos/firebase.config';

const URL_BASE = import.meta.env.VITE_API_URL || '/api';

/** Erro da API que preserva o status HTTP para uso em catches */
export class ErroApi extends Error {
    constructor(
        mensagem: string,
        public readonly status: number,
        public readonly codigo?: string
    ) {
        super(mensagem);
        this.name = 'ErroApi';
    }
}

interface CabecalhosApi {
    'Content-Type': string;
    Authorization?: string;
    'X-Escola-ID'?: string;
    [key: string]: string | undefined;
}

/**
 * Aguarda o Firebase Auth estar pronto (útil no refresh da página).
 */
async function aguardarAuth(): Promise<void> {
    if (autenticacao.currentUser) return;
    
    return new Promise((resolve) => {
        const unsubscribe = autenticacao.onAuthStateChanged((user) => {
            unsubscribe();
            resolve();
        });
        // Timeout de segurança para não travar a UI caso o Firebase falhe
        setTimeout(resolve, 2000);
    });
}

/**
 * Monta os cabeçalhos com token JWT e escola_id.
 */
async function obterCabecalhos(): Promise<CabecalhosApi> {
    const cabecalhos: CabecalhosApi = {
        'Content-Type': 'application/json',
    };

    // Tentar aguardar o estado de autenticação se estiver nulo (fase de boot)
    if (!autenticacao.currentUser) {
        await aguardarAuth();
    }

    // Injetar token JWT
    if (autenticacao.currentUser) {
        try {
            const token = await autenticacao.currentUser.getIdToken();
            cabecalhos['Authorization'] = `Bearer ${token}`;
        } catch (e) {
            console.warn('[API] Falha ao obter ID Token:', e);
        }
    }

    // Injetar escola_id (salvo pelo ProvedorEscola na sessão)
    const idEscola = sessionStorage.getItem('escola_id');
    if (idEscola) {
        cabecalhos['X-Escola-ID'] = idEscola;
    }

    return cabecalhos;
}

/**
 * Objeto centralizador para comunicação HTTP com o backend.
 * Implementa automaticamente injeção de tokens JWT e identificação de contexto escolar.
 */
export const api = {
    /**
     * Realiza uma requisição do tipo GET para buscar dados.
     * @param rota - Caminho do endpoint (ex: '/usuarios').
     * @param opcoes - Configurações adicionais de cabeçalho.
     * @returns {Promise<T>} Resposta da API mapeada para o tipo genérico T.
     * @throws {ErroApi} Caso o status HTTP não seja de sucesso (2xx).
     */
    obter: async <T = unknown>(rota: string, opcoes: { headers?: Record<string, string> } = {}): Promise<T> => {
        const cabecalhosPadrao = await obterCabecalhos();
        const cabecalhos = { ...cabecalhosPadrao, ...opcoes.headers };
<<<<<<< HEAD
        const urlCompleta = `${URL_BASE}${rota}`;
        
        try {
            const resposta = await fetch(urlCompleta, { headers: cabecalhos });
            if (!resposta.ok) {
                const textoErro = await resposta.text();
                let codigo: string | undefined;
                try {
                    const parsed = JSON.parse(textoErro);
                    codigo = parsed?.erro?.codigo;
                } catch { /* não é JSON */ }
                throw new ErroApi(`Erro na API: ${resposta.statusText} - ${textoErro}`, resposta.status, codigo);
            }

            const contentType = resposta.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const json = await resposta.json();
                return (json && typeof json === 'object' && 'dados' in json) ? json.dados : json;
            } else {
                const texto = await resposta.text();
                if (texto.trim().startsWith('<')) {
                    throw new Error(`A API retornou HTML em vez de JSON em ${rota}. Verifique se o endpoint existe.`);
                }
                return texto as unknown as T;
            }
        } catch (erro: any) {
            console.error(`[API] Falha no fetch em: ${urlCompleta}`, erro);
            throw erro;
=======
        const resposta = await fetch(`${URL_BASE}${rota}`, { headers: cabecalhos });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            let codigo: string | undefined;
            try {
                const parsed = JSON.parse(textoErro);
                codigo = parsed?.erro?.codigo;
            } catch { /* não é JSON */ }
            throw new ErroApi(`Erro na API: ${resposta.statusText} - ${textoErro}`, resposta.status, codigo);
        }

        const contentType = resposta.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const json = await resposta.json();
            return (json && typeof json === 'object' && 'dados' in json) ? json.dados : json;
        } else {
            const texto = await resposta.text();
            if (texto.trim().startsWith('<')) {
                throw new Error(`A API retornou HTML em vez de JSON em ${rota}. Verifique se o endpoint existe.`);
            }
            return texto as unknown as T;
>>>>>>> 1ce918e3c7ccce3f17306bf481729ae201d0e03c
        }
    },

    /**
     * Realiza uma requisição do tipo POST para envio de novos dados.
     * @param rota - Caminho do endpoint.
     * @param dados - Corpo da requisição (será convertido para JSON).
     * @param opcoes - Configurações adicionais de cabeçalho.
     */
    enviar: async <T = unknown>(rota: string, dados: unknown, opcoes: { headers?: Record<string, string> } = {}): Promise<T> => {
        const cabecalhosPadrao = await obterCabecalhos();
        const cabecalhos = { ...cabecalhosPadrao, ...opcoes.headers };
        const resposta = await fetch(`${URL_BASE}${rota}`, {
            method: 'POST',
            headers: cabecalhos,
            body: JSON.stringify(dados)
        });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            let codigo: string | undefined;
            try {
                const parsed = JSON.parse(textoErro);
                codigo = parsed?.erro?.codigo;
            } catch { /* não é JSON */ }
            throw new ErroApi(`Erro na API: ${resposta.statusText} - ${textoErro}`, resposta.status, codigo);
        }
        const texto = await resposta.text();
        try {
            const json = JSON.parse(texto);
            return (json && typeof json === 'object' && 'dados' in json) ? json.dados : json;
        } catch {
            return texto as unknown as T;
        }
    },

    /**
     * Realiza uma requisição do tipo PATCH para atualização parcial de dados.
     * @param rota - Caminho do endpoint.
     * @param dados - Campos a serem atualizados no servidor.
     * @param opcoes - Configurações adicionais de cabeçalho.
     */
    atualizar: async <T = unknown>(rota: string, dados: unknown, opcoes: { headers?: Record<string, string> } = {}): Promise<T> => {
        const cabecalhosPadrao = await obterCabecalhos();
        const cabecalhos = { ...cabecalhosPadrao, ...opcoes.headers };
        const resposta = await fetch(`${URL_BASE}${rota}`, {
            method: 'PATCH',
            headers: cabecalhos,
            body: JSON.stringify(dados)
        });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            let codigo: string | undefined;
            try {
                const parsed = JSON.parse(textoErro);
                codigo = parsed?.erro?.codigo;
            } catch { /* não é JSON */ }
            throw new ErroApi(`Erro na API: ${resposta.statusText} - ${textoErro}`, resposta.status, codigo);
        }
        const texto = await resposta.text();
        try {
            const json = JSON.parse(texto);
            return (json && typeof json === 'object' && 'dados' in json) ? json.dados : json;
        } catch {
            return texto as unknown as T;
        }
    },

    /**
     * Realiza uma requisição do tipo DELETE para remoção de registros.
     * @param rota - Caminho do endpoint incluindo query strings se necessário.
     * @returns {Promise<boolean>} Verdadeiro se a exclusão foi confirmada.
     */
    remover: async (rota: string): Promise<boolean> => {
        const cabecalhos = await obterCabecalhos();
        const resposta = await fetch(`${URL_BASE}${rota}`, {
            method: 'DELETE',
            headers: cabecalhos
        });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            let codigo: string | undefined;
            try {
                const parsed = JSON.parse(textoErro);
                codigo = parsed?.erro?.codigo;
            } catch { /* não é JSON */ }
            throw new ErroApi(`Erro na API: ${resposta.statusText} - ${textoErro}`, resposta.status, codigo);
        }
        return true;
    }
};

