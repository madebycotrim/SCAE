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

/**
 * Provedor de contexto que carrega os detalhes da escola baseado no slug da URL.
 * Injeta as variáveis de estilo (Cores) e define o título da página.
 */
export function ProvedorEscola({ children }: { children: ReactNode }) {
    const [perfil, definirPerfil] = useState<PerfilEscola | null>(null);
    const [erro, definirErro] = useState(false);

    useEffect(() => {
        /**
         * Carrega as configurações da escola via API pública.
         */
        const carregarPerfilEscola = async () => {
            const slug = resolverSlugDaUrl();

            if (!slug) {
                definirErro(true);
                return;
            }

            const URL_API = '/api';

            try {
                const resposta = await fetch(`${URL_API}/publico/detalhes?slug=${slug}`);
                if (!resposta.ok) throw new Error('Escola não encontrada');
                const json = await resposta.json();
                const dadosBrutos = json?.dados || json;

                if (!dadosBrutos || (!dadosBrutos.id && !dadosBrutos.nome_escola)) {
                    throw new Error('Perfil da escola inválido ou incompleto');
                }

                const dadosEscola: PerfilEscola = {
                    id: dadosBrutos.id,
                    nomeEscola: dadosBrutos.nome_escola || dadosBrutos.nomeEscola,
                    dominioEmail: dadosBrutos.dominio_email || dadosBrutos.dominioEmail,
                    corPrimaria: dadosBrutos.cor_primaria || dadosBrutos.corPrimaria || '#2B59FF',
                    corSecundaria: dadosBrutos.cor_secundaria || dadosBrutos.corSecundaria || '#1e293b',
                    ttsAtivado: !!(dadosBrutos.tts_ativado ?? dadosBrutos.ttsAtivado),
                    qrDinamico: !!(dadosBrutos.config_qr_dinamico ?? dadosBrutos.qrDinamico),
                    ttsFraseSucesso: dadosBrutos.config_tts_frase_sucesso || dadosBrutos.ttsFraseSucesso,
                    ttsFraseErro: dadosBrutos.config_tts_frase_erro || dadosBrutos.ttsFraseErro,
                    saidaObrigatoria: dadosBrutos.saida_obrigatoria ?? true,
                    metodosAcesso: (dadosBrutos.metodoAcesso || dadosBrutos.metodo_acesso || 'QRCODE').split(',').map((s: string) => s.trim()).filter(Boolean),
                    logoUrl: dadosBrutos.logo_url || dadosBrutos.logoUrl,
                    nomeDPO: dadosBrutos.nome_dpo || dadosBrutos.nomeDPO || 'Encarregado Catraki',
                    emailDPO: dadosBrutos.email_dpo || dadosBrutos.emailDPO || 'privacidade@catraki.com.br',
                    provedorAuth: dadosBrutos.provedorAuth || 'google',
                    urlAgente: dadosBrutos.url_agente || dadosBrutos.urlAgente,
                };

                // Aplica identidade visual da escola via CSS variables
                document.documentElement.style.setProperty('--cor-primaria', dadosEscola.corPrimaria);
                document.documentElement.style.setProperty('--cor-secundaria', dadosEscola.corSecundaria);
                document.title = dadosEscola.nomeEscola;

                // Meta theme-color para navegadores mobile
                let metaTema = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
                if (!metaTema) {
                    metaTema = document.createElement('meta');
                    metaTema.name = 'theme-color';
                    document.head.appendChild(metaTema);
                }
                metaTema.content = dadosEscola.corPrimaria;

                // Salvar escola_id para uso pelo interceptor da API
                sessionStorage.setItem('escola_id', dadosEscola.id);
                
                // Cache persistente para o servicoAgente (acesso via Localhost/Túnel)
                storageEscola.set('perfil', dadosEscola);

                definirPerfil(dadosEscola);
            } catch (err) {
                console.error('[Escola] Erro ao carregar perfil:', err);
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
 * Hook para acessar o perfil da escola atual que estiver no contexto.
 * @returns PerfilEscola ou erro se usado fora do provedor.
 * @throws {Error} Se usado fora do ProvedorEscola
 */
export const usarEscola = (): PerfilEscola => {
    const ctx = useContext(EscolaContext);
    if (!ctx) throw new Error('usarEscola deve ser usado dentro de ProvedorEscola');
    return ctx;
};

/**
 * Hook para acessar o perfil da escola atual sem disparar erro se não existir.
 * @returns PerfilEscola ou null
 */
export const usarEscolaOpcional = (): PerfilEscola | null => {
    return useContext(EscolaContext);
};
