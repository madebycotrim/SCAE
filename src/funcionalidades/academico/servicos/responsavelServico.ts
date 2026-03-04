/**
 * Serviço que encapsula a chamada desprotegida da Cloudflare API para o Login Temporário do Responsável
 */
import { api } from '@compartilhado/servicos/api'; // reaproveitamos o proxy padrao

const RESPONSAVEL_API_URL = '/responsavel';

// Como o responsavel não usará o FirebaseAuth, injetamos manualmente os calls 
// usando o token que virá do Cloudflare D1
export const responsavelServico = {
    autenticar: async (email: string, aluno_matricula: string): Promise<string> => {
        const payload = await api.enviar<{ token: string }>(`${RESPONSAVEL_API_URL}/auth`, { email, aluno_matricula });
        if (payload.token) {
            // Guardando o JWT no PWA do dispositivo
            localStorage.setItem('responsavel_lgpd_token', payload.token);
            return payload.token;
        }
        throw new Error("Token não retornado");
    },

    buscarTimeline: async (): Promise<Record<string, unknown>> => {
        const token = localStorage.getItem('responsavel_lgpd_token');
        if (!token) throw new Error('Não Autenticado');

        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const raw = await fetch(`${baseUrl}${RESPONSAVEL_API_URL}/dados`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Escola-ID': sessionStorage.getItem('escola_id') || ''
            }
        });

        if (!raw.ok) throw new Error("Acesso Expirado");
        return await raw.json();
    },


    sair: () => {
        localStorage.removeItem('responsavel_lgpd_token');
    }
}

