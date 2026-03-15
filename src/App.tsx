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
import { ProvedorAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { ProvedorPermissoes } from '@/compartilhado/autorizacao/ContextoPermissoes';
import { ProvedorNotificacoes } from '@/compartilhado/contextos/ContextoNotificacoes';

// Guardas de rota
import GuardaRota from '@/compartilhado/autorizacao/GuardaRota';
import GuardaQuiosque from '@/compartilhado/autorizacao/GuardaQuiosque';

// Configuração de rotas com lazy loading
import {
    ROTAS_ADMIN,
    PaginaLogin,
    PaginaPainel,
    PaginaAlunos,
    PaginaTurmas,
    PaginaTerminalAcesso,
    PaginaQuiosqueAutoatendimento,
    PaginaRelatorios,
    PaginaAuditoria,
    PaginaUsuarios,
    PaginaConfiguracaoHorarios,
    PaginaRiscoAbandono,
    PaginaCartaoDigital,
    PaginaLoginResponsavel,
    PaginaPainelResponsavel,
    PaginaTermosUso,
    PaginaPoliticaPrivacidade,
    PaginaInicial,
    PaginaLoginCentral,
    PaginaPainelCentral,
    PaginaGestaoEscolas,
    PaginaUsuariosCentral,
    PaginaAuditoriaCentral,
    LayoutCentral
} from '@configuracoes/rotas';

// Serviço de sincronização
import { servicoSincronizacao } from '@/compartilhado/servicos/sincronizacao';

/**
 * Componente de loading exibido enquanto chunks lazy são carregados.
 */
function CarregandoPagina() {
    return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-sm text-slate-400 font-medium">Carregando...</p>
            </div>
        </div>
    );
}

/**
 * Layout base que envolve as páginas do painel administrativo.
 */
function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-grow bg-gray-100">
                {children}
            </main>
            <Toaster position="top-right" />
        </div>
    );
}

/**
 * Componente interno que inicializa a sincronização automática.
 */
function InicializadorSync() {
    useEffect(() => {
        servicoSincronizacao.iniciarSincronizacaoAutomatica();
    }, []);
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
                        <InicializadorSync />
                        <Suspense fallback={<CarregandoPagina />}>
                            <Outlet />
                        </Suspense>
                    </ProvedorNotificacoes>
                </ProvedorPermissoes>
            </ProvedorAutenticacao>
        </ProvedorEscola>
    );
}

/**
 * Shell da Gestão Central — Não depende de Escola/escola específico.
 */
const CentralShell = () => (
    <ProvedorAutenticacao>
        <ProvedorPermissoes>
            <Suspense fallback={<CarregandoPagina />}>
                <Outlet />
            </Suspense>
        </ProvedorPermissoes>
    </ProvedorAutenticacao>
);

function App() {
    return (
        <Router>
            <QueryClientProvider client={clienteConsulta}>
                <Routes>
                    {/* ═══ MÓDULO ROOT - GESTÃO CENTRAL ═══ */}
                    <Route path="/central/login" element={<PaginaLoginCentral />} />
                    <Route path="/central" element={
                        <GuardaRota papeis={['CENTRAL']} desabilitarEscolaCheck={true}>
                            <LayoutCentral>
                                <CentralShell />
                            </LayoutCentral>
                        </GuardaRota>
                    }>
                        <Route index element={<PaginaPainelCentral />} />
                        <Route path="escolas" element={<PaginaGestaoEscolas />} />
                        <Route path="usuarios" element={<PaginaUsuariosCentral />} />
                        <Route path="auditoria" element={<PaginaAuditoriaCentral />} />
                    </Route>

                    {/* ═══ Todas as rotas da escola ficam sob /:slugEscola ═══ */}
                    <Route path="/:slugEscola" element={<EscolaShell />}>

                        {/* Login */}
                        <Route path="login" element={<PaginaLogin />} />

                        {/* ═══ SUPERFÍCIE 1: Quiosque (sem layout admin) ═══ */}
                        <Route path="quiosque" element={<GuardaQuiosque />}>
                            <Route index element={<PaginaQuiosqueAutoatendimento />} />
                        </Route>

                        {/* ═══ SUPERFÍCIE PÚBLICA: Páginas Auxiliares ═══ */}
                        <Route path="termos-de-uso" element={<PaginaTermosUso />} />
                        <Route path="politica-de-privacidade" element={<PaginaPoliticaPrivacidade />} />
                        <Route path="cartao" element={<PaginaCartaoDigital />} />

                        {/* ═══ MÓDULO DO RESPONSÁVEL (Portal e Cadastro) ═══ */}
                        <Route path="responsavel">
                            <Route index element={<PaginaLoginResponsavel />} />
                            <Route path="painel" element={<PaginaPainelResponsavel />} />
                        </Route>

                        {/* ═══ SUPERFÍCIE 2: Painel Administrativo ═══ */}
                        <Route path="admin">
                            {ROTAS_ADMIN.map(({ caminho, componente: Componente, protegida, papeis }) => (
                                <Route
                                    key={caminho}
                                    path={caminho.replace(/^\//, '')}
                                    element={
                                        <Layout>
                                            {protegida ? (
                                                <GuardaRota papeis={papeis}>
                                                    <Componente />
                                                </GuardaRota>
                                            ) : (
                                                <Componente />
                                            )}
                                        </Layout>
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
                    <Route path="/" element={<Suspense fallback={<CarregandoPagina />}><PaginaInicial /></Suspense>} />
                    <Route path="/termos-de-uso" element={<Suspense fallback={<CarregandoPagina />}><PaginaTermosUso /></Suspense>} />
                    <Route path="/politica-de-privacidade" element={<Suspense fallback={<CarregandoPagina />}><PaginaPoliticaPrivacidade /></Suspense>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </QueryClientProvider>
        </Router >
    );
}

export default App;
