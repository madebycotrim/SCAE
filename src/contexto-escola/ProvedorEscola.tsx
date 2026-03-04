/**
 * ProvedorEscola â€” Carrega e injeta perfil da escola antes de renderizar a app.
 * Identificação da escola: slug na URL â€” seuapp.com/:slugEscola
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { resolverSlugDaUrl } from './resolverSlug';

export interface PerfilEscola {
    id: string; // Identificador/Slug da escola
    nomeEscola: string;
    dominioEmail: string | null;
    corPrimaria: string;
    corSecundaria: string;
    ttsAtivado: boolean;
    logoUrl?: string;
    tipoEscola?: 'publica' | 'privada';
    foro?: string;
    nomeDPO?: string;
    emailDPO?: string;
}

const EscolaContext = createContext<PerfilEscola | null>(null);

export function ProvedorEscola({ children }: { children: ReactNode }) {
    const [perfil, definirPerfil] = useState<PerfilEscola | null>(null);
    const [erro, definirErro] = useState(false);

    useEffect(() => {
        const slug = resolverSlugDaUrl();

        if (!slug) {
            definirErro(true);
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || '/api';

        fetch(`${apiUrl}/escola/${slug}`)
            .then(r => {
                if (!r.ok) throw new Error('Escola não encontrada');
                return r.json();
            })
            .then((data: PerfilEscola) => {
                // Aplica identidade visual da escola via CSS variables
                document.documentElement.style.setProperty('--cor-primaria', data.corPrimaria);
                document.documentElement.style.setProperty('--cor-secundaria', data.corSecundaria);
                document.title = data.nomeEscola;

                // Meta theme-color para mobile browsers
                let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
                if (!metaTheme) {
                    metaTheme = document.createElement('meta');
                    metaTheme.name = 'theme-color';
                    document.head.appendChild(metaTheme);
                }
                metaTheme.content = data.corPrimaria;

                // Salvar escola_id para uso pelo interceptor da API
                sessionStorage.setItem('escola_id', data.id);

                definirPerfil(data);
            })
            .catch(() => {
                definirErro(true);
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

    if (!perfil) {
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
        <EscolaContext.Provider value={perfil}>
            {children}
        </EscolaContext.Provider>
    );
}

/**
 * Hook para acessar o perfil da escola atual.
 * Deve ser usado dentro de ProvedorEscola.
 */
export const usarEscola = (): PerfilEscola => {
    const ctx = useContext(EscolaContext);
    if (!ctx) throw new Error('usarEscola deve ser usado dentro de ProvedorEscola');
    return ctx;
};

export const usarEscolaOpcional = (): PerfilEscola | null => {
    return useContext(EscolaContext);
};

