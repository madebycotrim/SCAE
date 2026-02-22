import { autenticacao } from './firebase';

const URL_BASE = '/api';

async function obterCabecalhos() {
    const cabecalhos = {
        'Content-Type': 'application/json',
    };

    if (autenticacao.currentUser) {
        const token = await autenticacao.currentUser.getIdToken();
        const email = autenticacao.currentUser.email;
        console.log(`[API] Token obtido para: ${email}`);
        cabecalhos['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('[API] Usuário não autenticado. Nenhum token enviado.');
    }

    return cabecalhos;
}

export const api = {
    obter: async (rota) => {
        const cabecalhos = await obterCabecalhos();
        const resposta = await fetch(`${URL_BASE}${rota}`, { headers: cabecalhos });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            console.error(`[API] Erro ${resposta.status} em GET ${rota}:`, textoErro);
            throw new Error(`Erro na API: ${resposta.statusText} - ${textoErro}`);
        }

        const contentType = resposta.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return resposta.json();
        } else {
            // Se não for JSON (ex: HTML de erro ou fallback), retorna como texto ou lança erro amigável
            const texto = await resposta.text();
            if (texto.trim().startsWith('<')) {
                throw new Error(`A API retornou HTML em vez de JSON em ${rota}. Verifique se o endpoint existe.`);
            }
            return texto;
        }
    },

    enviar: async (rota, dados) => {
        const cabecalhos = await obterCabecalhos();
        const resposta = await fetch(`${URL_BASE}${rota}`, {
            method: 'POST',
            headers: cabecalhos,
            body: JSON.stringify(dados)
        });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            console.error(`[API] Erro ${resposta.status} em POST ${rota}:`, textoErro);
            throw new Error(`Erro na API: ${resposta.statusText} - ${textoErro}`);
        }
        // Tratar 201 Created ou 200 OK
        const texto = await resposta.text();
        try {
            return JSON.parse(texto);
        } catch {
            return texto;
        }
    },

    remover: async (rota) => {
        const cabecalhos = await obterCabecalhos();
        const resposta = await fetch(`${URL_BASE}${rota}`, {
            method: 'DELETE',
            headers: cabecalhos
        });
        if (!resposta.ok) {
            const textoErro = await resposta.text();
            console.error(`[API] Erro ${resposta.status}:`, textoErro);
            throw new Error(`Erro na API: ${resposta.statusText} - ${textoErro}`);
        }
        return true;
    }
};
