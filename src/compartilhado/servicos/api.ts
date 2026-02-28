/**
 * Instância centralizada da API com injeção automática de tenant_id e JWT.
 * Mantém compatibilidade com os métodos existentes: obter, enviar, remover.
 */
import { autenticacao } from '@funcionalidades/autenticacao/servicos/firebase.config';

const URL_BASE = import.meta.env.VITE_API_URL || '/api';

interface CabecalhosApi {
    'Content-Type': string;
    Authorization?: string;
    'X-Tenant-ID'?: string;
    [key: string]: string | undefined;
}

/**
 * Monta os cabeçalhos com token JWT e tenant_id.
 */
async function obterCabecalhos(): Promise<CabecalhosApi> {
    const cabecalhos: CabecalhosApi = {
        'Content-Type': 'application/json',
    };

    // Injetar token JWT
    if (autenticacao.currentUser) {
        const token = await autenticacao.currentUser.getIdToken();
        cabecalhos['Authorization'] = `Bearer ${token}`;
    }

    // Injetar tenant_id (salvo pelo ProvedorTenant na sessão)
    const tenantId = sessionStorage.getItem('tenant_id');
    if (tenantId) {
        cabecalhos['X-Tenant-ID'] = tenantId;
    }

    return cabecalhos;
}

export const api = {
    obter: async <T = unknown>(rota: string): Promise<T> => {
        const cabecalhos = await obterCabecalhos();
        const resposta = await fetch(`${URL_BASE}${rota}`, { headers: cabecalhos });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            throw new Error(`Erro na API: ${resposta.statusText} - ${textoErro}`);
        }

        const contentType = resposta.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return resposta.json();
        } else {
            const texto = await resposta.text();
            if (texto.trim().startsWith('<')) {
                throw new Error(`A API retornou HTML em vez de JSON em ${rota}. Verifique se o endpoint existe.`);
            }
            return texto as unknown as T;
        }
    },

    enviar: async <T = unknown>(rota: string, dados: unknown): Promise<T> => {
        const cabecalhos = await obterCabecalhos();
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
            return JSON.parse(texto);
        } catch {
            return texto as unknown as T;
        }
    },

    atualizar: async <T = unknown>(rota: string, dados: unknown): Promise<T> => {
        const cabecalhos = await obterCabecalhos();
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
            return JSON.parse(texto);
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
