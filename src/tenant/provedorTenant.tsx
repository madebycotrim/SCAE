/**
 * ProvedorTenant — Carrega e injeta configuração da escola antes de renderizar a app.
 * Identificação do tenant: slug na URL — seuapp.com/:slugEscola
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { resolverSlugDaUrl } from './resolverTenant';

export interface ConfiguracaoEscola {
    id: string; // Identificador/Slug da escola
    nomeEscola: string;
    dominioEmail: string | null;
    corPrimaria: string;
    corSecundaria: string;
    ttsAtivado: boolean;
    logoUrl?: string;
}

const TenantContext = createContext<ConfiguracaoEscola | null>(null);

export function ProvedorTenant({ children }: { children: ReactNode }) {
    const [config, definirConfig] = useState<ConfiguracaoEscola | null>(null);
    const [erro, definirErro] = useState(false);

    useEffect(() => {
        const slug = resolverSlugDaUrl();

        if (!slug) {
            // Sem slug na URL — fallback para config padrão em desenvolvimento
            if (import.meta.env.DEV) {
                const configPadrao: ConfiguracaoEscola = {
                    id: 'padrao',
                    nomeEscola: 'SCAE',
                    dominioEmail: null,
                    corPrimaria: '#6366f1',
                    corSecundaria: '#4f46e5',
                    ttsAtivado: true
                };
                sessionStorage.setItem('tenant_id', configPadrao.id);
                definirConfig(configPadrao);
                return;
            }
            definirErro(true);
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || '/api';

        fetch(`${apiUrl}/tenant/${slug}`)
            .then(r => {
                if (!r.ok) throw new Error('Escola não encontrada');
                return r.json();
            })
            .then((data: ConfiguracaoEscola) => {
                // Aplica identidade visual da escola via CSS variables
                document.documentElement.style.setProperty('--cor-primaria', data.corPrimaria);
                document.documentElement.style.setProperty('--cor-secundaria', data.corSecundaria);
                document.title = data.nomeEscola;

                // Salvar tenant_id para uso pelo interceptor da API
                sessionStorage.setItem('tenant_id', data.id);

                definirConfig(data);
            })
            .catch(() => {
                // Fallback para desenvolvimento local sem API de tenant
                if (import.meta.env.DEV) {
                    const configPadrao: ConfiguracaoEscola = {
                        id: slug,
                        nomeEscola: 'SCAE',
                        dominioEmail: null,
                        corPrimaria: '#6366f1',
                        corSecundaria: '#4f46e5',
                        ttsAtivado: true
                    };
                    sessionStorage.setItem('tenant_id', configPadrao.id);
                    definirConfig(configPadrao);
                } else {
                    definirErro(true);
                }
            });
    }, []);

    if (erro) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white p-8 text-center">
                <div>
                    <h1 className="text-2xl font-bold mb-4">Escola não encontrada</h1>
                    <p className="text-slate-400">Verifique o link de acesso fornecido pela sua escola.</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Carregando escola...</p>
                </div>
            </div>
        );
    }

    return (
        <TenantContext.Provider value={config}>
            {children}
        </TenantContext.Provider>
    );
}

/**
 * Hook para acessar a configuração do tenant atual.
 * Deve ser usado dentro de ProvedorTenant.
 */
export const usarTenant = (): ConfiguracaoEscola => {
    const ctx = useContext(TenantContext);
    if (!ctx) throw new Error('usarTenant deve ser usado dentro de ProvedorTenant');
    return ctx;
};
