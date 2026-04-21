/**
 * ProvedorEscola — Carrega e injeta perfil da escola antes de renderizar a app.
 * Identificação da escola: slug na URL — seuapp.com/:slugEscola
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { resolverSlugDaUrl } from './resolverSlug';
import { storageEscola } from '@/compartilhado/utils/utilidades-slug';
import { TelaCarregamento } from '@/compartilhado/componentes/UI';

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
    qrDinamico: boolean;
    saidaObrigatoria: boolean;
    ttsFraseSucesso?: string;
    ttsFraseErro?: string;
    metodosAcesso: string[];  // ['QRCODE', 'DIGITAL']
    provedorAuth: 'google' | 'microsoft';
    urlAgente?: string;
}

const EscolaContext = createContext<PerfilEscola | null>(null);

export function ProvedorEscola({ children }: { children: ReactNode }) {
    const [perfil, definirPerfil] = useState<PerfilEscola | null>(null);
    const [erro, definirErro] = useState(false);

    useEffect(() => {
        const carregarPerfilEscola = async () => {
            const slug = resolverSlugDaUrl();

            if (!slug) {
                definirErro(true);
                return;
            }

            const apiUrl = '/api';

            try {
                const resposta = await fetch(`${apiUrl}/publico/detalhes?slug=${slug}`);
                if (!resposta.ok) throw new Error('Escola não encontrada');
                const json = await resposta.json();
                const dados = json?.dados || json;

                if (!dados || (!dados.id && !dados.nome_escola)) {
                    throw new Error('Perfil da escola inválido ou incompleto');
                }

                const data: PerfilEscola = {
                    id: dados.id,
                    nomeEscola: dados.nome_escola || dados.nomeEscola,
                    dominioEmail: dados.dominio_email || dados.dominioEmail,
                    corPrimaria: dados.cor_primaria || dados.corPrimaria || '#2B59FF',
                    corSecundaria: dados.cor_secundaria || dados.corSecundaria || '#1e293b',
                    ttsAtivado: !!(dados.tts_ativado ?? dados.ttsAtivado),
                    qrDinamico: !!(dados.config_qr_dinamico ?? dados.qrDinamico),
                    ttsFraseSucesso: dados.config_tts_frase_sucesso || dados.ttsFraseSucesso,
                    ttsFraseErro: dados.config_tts_frase_erro || dados.ttsFraseErro,
                    saidaObrigatoria: dados.saida_obrigatoria ?? true,
                    metodosAcesso: (dados.metodoAcesso || dados.metodo_acesso || 'QRCODE').split(',').map((s: string) => s.trim()).filter(Boolean),
                    logoUrl: dados.logo_url || dados.logoUrl,
                    nomeDPO: dados.nome_dpo || dados.nomeDPO || 'Encarregado SCAE',
                    emailDPO: dados.email_dpo || dados.emailDPO || 'privacidade@catraki.com.br',
                    provedorAuth: dados.provedorAuth || 'google',
                    urlAgente: dados.url_agente || dados.urlAgente,
                };

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
                
                // Cache persistente para o servicoAgente (acesso via Localhost/Túnel)
                storageEscola.set('perfil', data);

                definirPerfil(data);
            } catch (err) {
                console.error('Erro ao carregar perfil da escola', err);
                definirErro(true);
            }
        };

        carregarPerfilEscola();
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
        return <TelaCarregamento mensagem="CARREGANDO ESCOLA..." />;
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
