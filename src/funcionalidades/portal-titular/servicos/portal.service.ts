/**
 * Serviço que encapsula a chamada desprotegida da Cloudflare API para o Login Temporário do Responsável
 */
import { api } from '@compartilhado/servicos/api'; // reaproveitamos o proxy padrao

const PORTAL_API_URL = '/portal-titular';

// Como o portal_titular não usará o FirebaseAuth, injetamos manualmente os calls 
// usando o token que virá do Cloudflare D1
export const portalService = {
    autenticar: async (telefone: string, aluno_matricula: string): Promise<string> => {
        const payload = await api.enviar<{ token: string }>(`${PORTAL_API_URL}/auth`, { telefone, aluno_matricula });
        if (payload.token) {
            // Guardando o JWT no PWA do dispositivo
            localStorage.setItem('portal_lgpd_token', payload.token);
            return payload.token;
        }
        throw new Error("Token não retornado");
    },

    buscarTimeline: async (): Promise<Record<string, unknown>> => {
        const token = localStorage.getItem('portal_lgpd_token');
        if (!token) throw new Error('Não Autenticado');

        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const raw = await fetch(`${baseUrl}${PORTAL_API_URL}/dados`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': sessionStorage.getItem('tenant_id') || ''
            }
        });

        if (!raw.ok) throw new Error("Acesso Expirado");
        return await raw.json();
    },

    revogarNotificacoes: async (): Promise<void> => {
        const token = localStorage.getItem('portal_lgpd_token');
        if (!token) return;

        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        await fetch(`${baseUrl}${PORTAL_API_URL}/revogar-notificacoes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': sessionStorage.getItem('tenant_id') || ''
            }
        });
    },

    sair: () => {
        localStorage.removeItem('portal_lgpd_token');
    }
}
