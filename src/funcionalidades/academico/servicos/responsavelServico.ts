/**
 * Serviço que encapsula a comunicação com a API para o Portal do Responsável.
 * 100% Online: Não utiliza banco local (IndexedDB).
 */
import { api } from '@/compartilhado/servicos/api';

const RESPONSAVEL_API_URL = '/responsavel';

export const responsavelServico = {
    /**
     * Autentica o responsável cruzando e-mail e matrícula do aluno.
     * Retorna o token JWT de acesso.
     */
    autenticar: async (email: string, aluno_matricula: string): Promise<string> => {
        try {
            const payload = await api.enviar<{ token: string }>(`${RESPONSAVEL_API_URL}/auth`, { email, aluno_matricula });
            if (payload.token) {
                // Guardando o JWT no localStorage para persistência da sessão no PWA
                localStorage.setItem('responsavel_lgpd_token', payload.token);
                return payload.token;
            }
            throw new Error("Falha na autenticação: Token não retornado");
        } catch (erro: any) {
            throw new Error(erro.message || "Erro ao autenticar responsável.");
        }
    },

    /**
     * Busca a timeline de acessos e dados do aluno vinculado.
     */
    buscarTimeline: async (): Promise<Record<string, unknown>> => {
        const token = localStorage.getItem('responsavel_lgpd_token');
        if (!token) throw new Error('Sessão expirada. Autentique-se novamente.');

        try {
            return await api.obter<Record<string, unknown>>(`${RESPONSAVEL_API_URL}/dados`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (erro) {
            throw new Error("Não foi possível carregar os dados. Verifique sua conexão.");
        }
    },

    /**
     * Remove a sessão do responsável.
     */
    sair: () => {
        localStorage.removeItem('responsavel_lgpd_token');
    },

    /**
     * Salva o Token FCM para notificações push.
     */
    salvarTokenFCM: async (tokenFCM: string): Promise<void> => {
        const token = localStorage.getItem('responsavel_lgpd_token');
        if (!token) return; // Silent fail se não autenticado

        try {
            await api.enviar(`${RESPONSAVEL_API_URL}/notificacoes/token`, 
                { token: tokenFCM },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
        } catch (erro) {
            console.warn('Falha ao registrar token de notificação no servidor', erro);
        }
    }
};
