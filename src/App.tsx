/**
 * App.jsx — Raiz da aplicação com rotas multi-escola via slug na URL.
 *
 * Estrutura de rotas:
 *   /:slugEscola/login           → Login da escola
 *   /:slugEscola/admin/painel    → Painel administrativo
 *   /:slugEscola/admin/alunos    → CRUD alunos (e demais rotas admin)
 *   /:slugEscola/quiosque        → Quiosque de Autoatendimento (fullscreen)
 *   /:slugEscola/responsavel/cadastro → Autocadastro público
 *   /                            → Redireciona para /cem03-taguatinga/login
 */
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, useEffect, ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { clienteConsulta } from '@/compartilhado/servicos/clienteConsulta';

// Escola (contexto multi-escola)
import { ProvedorEscola } from '@/escola/ProvedorEscola';

// Auth e Permissões
import { ProvedorAutenticacao, usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { ProvedorPermissoes } from './compartilhado/autorizacao/ContextoPermissoes';
import { ProvedorNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';
import { ProvedorAgente } from '@/compartilhado/contextos/ContextoAgente';
import { ProvedorBuscaGlobal } from '@/compartilhado/contextos/ContextoBuscaGlobal';

// Guardas de rota
import GuardaRota from './compartilhado/autorizacao/GuardaRota';
import GuardaQuiosque from './compartilhado/autorizacao/GuardaQuiosque';

// Configuração de rotas com lazy loading
import {
    ROTAS_ADMIN,
    PaginaLogin,
    PaginaPainel,
    PaginaAlunos,
    PaginaTurmas,
    PaginaQuiosqueAutoatendimento,
    PaginaRelatorios,
    PaginaAuditoria,
    PaginaUsuarios,
    PaginaConfiguracaoHorarios,
    PaginaRiscoAbandono,
    PaginaCartaoDigital,
    PaginaTermosUso,
    PaginaPoliticaPrivacidade,
    PaginaInicial,
    PaginaLoginCentral,
    PaginaGestaoEscolas,
    LayoutCentral
} from '@/configuracoes/rotas';

// Serviço de sincronização
import { servicoSincronizacao } from '@/compartilhado/servicos/sincronizacao';

import { TelaCarregamento } from '@/compartilhado/componentes/UI';


const ESTILO_TOAST_PREMIUM = {
    className: 'premium-toast font-sans',
    style: {
        background: '#ffffff',
        color: '#0f172a',
        borderRadius: '1.25rem',
        border: '1px solid #f1f5f9',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        fontSize: '11px',
        fontWeight: '900',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        padding: '16px 20px',
    },
    success: {
        iconTheme: { primary: '#10b981', secondary: '#ffffff' },
        style: { borderLeft: '6px solid #10b981' }
    },
    error: {
        iconTheme: { primary: '#f43f5e', secondary: '#ffffff' },
        style: { borderLeft: '6px solid #f43f5e' }
    }
};

/**
 * Componente interno que inicializa a sincronização automática.
 */
function InicializadorSync() {
    const { usuarioAtual } = usarAutenticacao();

    useEffect(() => {
        if (usuarioAtual) {
            servicoSincronizacao.iniciarSincronizacaoAutomatica();
        }
    }, [usuarioAtual]);
    return null;
}

/**
 * Shell da escola — carrega perfil da escola e provê contextos.
 * Renderiza <Outlet /> para as rotas filhas.
 */
function EscolaShell() {
    return (
        <ProvedorEscola>
            <ProvedorAutenticacao>
                <ProvedorPermissoes>
                    <ProvedorNotificacoes>
                        <ProvedorBuscaGlobal>
                            <ProvedorAgente>
                                <InicializadorSync />
                                <Suspense fallback={<TelaCarregamento />}>
                                    <Outlet />
                                </Suspense>
                            </ProvedorAgente>
                        </ProvedorBuscaGlobal>
                    </ProvedorNotificacoes>
                </ProvedorPermissoes>
            </ProvedorAutenticacao>
        </ProvedorEscola>
    );
}

function App() {
    return (
        <Router>
            <QueryClientProvider client={clienteConsulta}>
                <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} toastOptions={ESTILO_TOAST_PREMIUM} />
                <Routes>
                    {/* ═══ MÓDULO ROOT - GESTÃO CENTRAL ═══ */}
                    <Route path="central" element={<ProvedorAutenticacao><ProvedorPermissoes><Suspense fallback={<TelaCarregamento />}><Outlet /></Suspense></ProvedorPermissoes></ProvedorAutenticacao>}>
                        <Route path="login" element={<PaginaLoginCentral />} />
                        <Route index element={<Navigate to="/central/escolas" replace />} />
                        <Route path="escolas" element={
                            <GuardaRota papeis={['CENTRAL']} desabilitarEscolaCheck={true}>
                                <LayoutCentral>
                                    <PaginaGestaoEscolas />
                                </LayoutCentral>
                            </GuardaRota>
                        } />
                    </Route>

                    {/* ═══ Todas as rotas da escola ficam sob /:slugEscola ═══ */}
                    <Route path="/:slugEscola" element={<EscolaShell />}>

                        {/* Login */}
                        <Route path="login" element={<PaginaLogin />} />

                        {/* ═══ SUPERFÍCIE 1: Quiosque (sem layout admin) ═══ */}
                        <Route path="quiosque/:metodoParam?" element={<GuardaQuiosque />}>
                            <Route index element={<PaginaQuiosqueAutoatendimento />} />
                        </Route>

                        {/* ═══ SUPERFÍCIE PÚBLICA: Páginas Auxiliares ═══ */}
                        <Route path="termos-de-uso" element={<PaginaTermosUso />} />
                        <Route path="politica-de-privacidade" element={<PaginaPoliticaPrivacidade />} />
                        <Route path="aluno" element={<PaginaCartaoDigital />} />


                        {/* ═══ SUPERFÍCIE 2: Painel Administrativo ═══ */}
                        <Route path="admin">
                            {ROTAS_ADMIN.map(({ caminho, componente: Componente, protegida, papeis }) => (
                                <Route
                                    key={caminho}
                                    path={caminho.replace(/^\//, '')}
                                    element={
                                        protegida ? (
                                            <GuardaRota papeis={papeis}>
                                                <Componente />
                                            </GuardaRota>
                                        ) : (
                                            <Componente />
                                        )
                                    }
                                />
                            ))}

                            {/* /:slugEscola/admin → redireciona para painel */}
                            <Route index element={<Navigate to="painel" replace />} />
                        </Route>

                        {/* /:slugEscola → redireciona para admin/painel */}
                        <Route index element={<Navigate to="admin/painel" replace />} />
                    </Route>

                    {/* Raiz → Landing Page Publica */}
                    <Route path="/" element={<Suspense fallback={<TelaCarregamento />}><PaginaInicial /></Suspense>} />
                    <Route path="/termos-de-uso" element={<Suspense fallback={<TelaCarregamento />}><PaginaTermosUso /></Suspense>} />
                    <Route path="/politica-de-privacidade" element={<Suspense fallback={<TelaCarregamento />}><PaginaPoliticaPrivacidade /></Suspense>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </QueryClientProvider>
        </Router >
    );
}

export default App;
