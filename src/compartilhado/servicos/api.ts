/**
 * Instância centralizada da API com injeção automática de escola_id e JWT.
 * Mantém compatibilidade com os métodos existentes: obter, enviar, remover.
 */
import { autenticacao } from '@/compartilhado/servicos/firebase.config';

const URL_BASE = import.meta.env.VITE_API_URL || '/api';

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

export const api = {
    obter: async <T = unknown>(rota: string, opcoes: { headers?: Record<string, string> } = {}): Promise<T> => {
        const cabecalhosPadrao = await obterCabecalhos();
        const cabecalhos = { ...cabecalhosPadrao, ...opcoes.headers };
        const resposta = await fetch(`${URL_BASE}${rota}`, { headers: cabecalhos });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            throw new Error(`Erro na API: ${resposta.statusText} - ${textoErro}`);
        }

        const contentType = resposta.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const json = await resposta.json();
            // Descompactar automaticamente se seguir o padrão { dados: ... }
            return (json && typeof json === 'object' && 'dados' in json) ? json.dados : json;
        } else {
            const texto = await resposta.text();
            if (texto.trim().startsWith('<')) {
                throw new Error(`A API retornou HTML em vez de JSON em ${rota}. Verifique se o endpoint existe.`);
            }
            return texto as unknown as T;
        }
    },

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
            throw new Error(`Erro na API: ${resposta.statusText} - ${textoErro}`);
        }
        const texto = await resposta.text();
        try {
            const json = JSON.parse(texto);
            return (json && typeof json === 'object' && 'dados' in json) ? json.dados : json;
        } catch {
            return texto as unknown as T;
        }
    },

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
            throw new Error(`Erro na API: ${resposta.statusText} - ${textoErro}`);
        }
        const texto = await resposta.text();
        try {
            const json = JSON.parse(texto);
            return (json && typeof json === 'object' && 'dados' in json) ? json.dados : json;
        } catch {
            return texto as unknown as T;
        }
    },

    remover: async (rota: string): Promise<boolean> => {
        const cabecalhos = await obterCabecalhos();
        const resposta = await fetch(`${URL_BASE}${rota}`, {
            method: 'DELETE',
            headers: cabecalhos
        });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            throw new Error(`Erro na API: ${resposta.statusText} - ${textoErro}`);
        }
        return true;
    }
};

