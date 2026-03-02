/**
 * App.jsx — Raiz da aplicação com rotas multi-tenant via slug na URL.
 *
 * Estrutura de rotas:
 *   /:slugEscola/login           → Login da escola
 *   /:slugEscola/admin/painel    → Painel administrativo
 *   /:slugEscola/admin/alunos    → CRUD alunos (e demais rotas admin)
 *   /:slugEscola/quiosque        → Tablet da portaria (fullscreen)
 *   /:slugEscola/responsavel/cadastro → Autocadastro público
 *   /                            → Redireciona para /cem03-taguatinga/login
 */
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, useEffect, ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { clienteConsulta } from '@compartilhado/servicos/clienteConsulta';

// Tenant (dentro da rota com slug)
import { ProvedorTenant } from '@tenant/provedorTenant';

// Auth e Permissões
import { ProvedorAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { ProvedorPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';
import { ProvedorNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';

// Guardas de rota
import GuardaRota from '@compartilhado/autorizacao/GuardaRota';
import GuardaQuiosque from '@compartilhado/autorizacao/GuardaQuiosque';

// Configuração de rotas com lazy loading
import { ROTAS_ADMIN, PaginaLogin, PaginaTelaQuiosque, PaginaAutocadastro, PaginaTermosUso, PaginaPoliticaPrivacidade, PaginaLoginAGM, PaginaPainelAGM, PaginaEscolasAGM, PaginaUsuariosAGM, PaginaLogsAGM, LayoutAGM } from '@configuracoes/rotas';

// Serviço de sincronização
import { servicoSincronizacao } from '@compartilhado/servicos/sincronizacao';

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
 * Shell do tenant — carrega config da escola e provê contextos.
 * Renderiza <Outlet /> para as rotas filhas.
 */
function TenantShell() {
    return (
        <ProvedorTenant>
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
        </ProvedorTenant>
    );
}

/**
 * Shell do Administrador Global — Não depende de Tenant.
 */
function AgmShell() {
    return (
        <ProvedorAutenticacao>
            <ProvedorPermissoes>
                <Suspense fallback={<CarregandoPagina />}>
                    <Outlet />
                </Suspense>
            </ProvedorPermissoes>
        </ProvedorAutenticacao>
    );
}

function App() {
    return (
        <Router>
            <QueryClientProvider client={clienteConsulta}>
                <Routes>
                    {/* ═══ MÓDULO ROOT - ADMINISTRADOR GERAL MULTI-TENANT ═══ */}
                    <Route path="/agm" element={<AgmShell />}>
                        <Route path="login" element={<PaginaLoginAGM />} />
                        <Route element={<GuardaRota papeis={['AGM']} desabilitarTenantCheck={true}><LayoutAGM><Outlet /></LayoutAGM></GuardaRota>}>
                            <Route path="painel" element={<PaginaPainelAGM />} />
                            <Route path="escolas" element={<PaginaEscolasAGM />} />
                            <Route path="usuarios" element={<PaginaUsuariosAGM />} />
                            <Route path="logs" element={<PaginaLogsAGM />} />
                        </Route>
                        <Route index element={<Navigate to="painel" replace />} />
                    </Route>

                    {/* ═══ Todas as rotas da escola ficam sob /:slugEscola ═══ */}
                    <Route path="/:slugEscola" element={<TenantShell />}>

                        {/* Login */}
                        <Route path="login" element={<PaginaLogin />} />

                        {/* ═══ SUPERFÍCIE 1: Quiosque (sem layout admin) ═══ */}
                        <Route path="quiosque" element={<GuardaQuiosque />}>
                            <Route index element={<PaginaTelaQuiosque />} />
                        </Route>

                        {/* ═══ SUPERFÍCIE PÚBLICA: Páginas Auxiliares ═══ */}
                        <Route path="responsavel/cadastro" element={<PaginaAutocadastro />} />
                        <Route path="termos" element={<PaginaTermosUso />} />
                        <Route path="privacidade" element={<PaginaPoliticaPrivacidade />} />

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

                    {/* Raiz → redireciona para slug padrão */}
                    <Route path="/" element={<Navigate to="/cem03-taguatinga/login" replace />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/cem03-taguatinga/login" replace />} />
                </Routes>
            </QueryClientProvider>
        </Router>
    );
}

export default App;
