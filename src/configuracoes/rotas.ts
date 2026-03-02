/**
 * Definição centralizada de rotas com lazy loading.
 * Duas árvores de rotas completamente separadas:
 *   /:slugEscola/quiosque  → tablet da portaria (GuardaQuiosque)
 *   /:slugEscola/admin/*   → painel administrativo (GuardaRota)
 *   /:slugEscola/responsavel/cadastro → público (sem login)
 *
 * Rotas legadas (sem slug) são mantidas para compatibilidade.
 */
import { lazy } from 'react';

// --- Lazy loading de todas as páginas ---
export const PaginaLogin = lazy(() => import('@funcionalidades/autenticacao/componentes/Login'));
export const PaginaPainel = lazy(() => import('@funcionalidades/dashboard/componentes/Painel'));
export const PaginaAlunos = lazy(() => import('@funcionalidades/alunos/componentes/Alunos'));
export const PaginaTurmas = lazy(() => import('@funcionalidades/turmas/componentes/Turmas'));
export const PaginaLeitorPortaria = lazy(() => import('@funcionalidades/portaria/componentes/LeitorPortaria'));
export const PaginaTelaQuiosque = lazy(() => import('@funcionalidades/portaria/componentes/TelaQuiosque'));
export const PaginaRelatorios = lazy(() => import('@funcionalidades/relatorios/componentes/Relatorios'));
export const PaginaLogs = lazy(() => import('@funcionalidades/logs/componentes/Logs'));
export const PaginaUsuarios = lazy(() => import('@funcionalidades/usuarios/componentes/Usuarios'));
export const PaginaAutocadastro = lazy(() => import('@funcionalidades/responsaveis/componentes/TelaAutocadastro'));
export const PaginaHorarios = lazy(() => import('@funcionalidades/configuracaoEscola/componentes/FormHorariosAcesso'));
export const PaginaEvasao = lazy(() => import('@funcionalidades/evasao/componentes/PainelEvasao'));
export const PaginaLoginPortal = lazy(() => import('@funcionalidades/portal-titular/componentes/TelaLoginPortal'));
export const PaginaPainelTitular = lazy(() => import('@funcionalidades/portal-titular/componentes/PainelTitular'));
export const PaginaTermosUso = lazy(() => import('@compartilhado/paginas/TermosUso'));
export const PaginaPoliticaPrivacidade = lazy(() => import('@compartilhado/paginas/PoliticaPrivacidade'));

// --- AGM (Root Mestre) ---
export const PaginaLoginAGM = lazy(() => import('@funcionalidades/agm/componentes/LoginAGM'));
export const PaginaPainelAGM = lazy(() => import('@funcionalidades/agm/componentes/PainelAGM'));
export const PaginaEscolasAGM = lazy(() => import('@funcionalidades/agm/componentes/PaginaEscolasAGM').then(m => ({ default: m.PaginaEscolasAGM })));
export const PaginaUsuariosAGM = lazy(() => import('@funcionalidades/agm/componentes/PaginaUsuariosAGM').then(m => ({ default: m.PaginaUsuariosAGM })));
export const PaginaLogsAGM = lazy(() => import('@funcionalidades/agm/componentes/PaginaLogsAGM').then(m => ({ default: m.PaginaLogsAGM })));
export const LayoutAGM = lazy(() => import('@funcionalidades/agm/componentes/LayoutAGM').then(m => ({ default: m.LayoutAGM })));

/**
 * Rotas do painel administrativo (desktop/mobile).
 * Protegidas por GuardaRota com verificação de papel + tenant.
 */
export interface RotaAplicacao {
    caminho: string;
    componente: React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>> | React.ComponentType<Record<string, unknown>>;
    protegida: boolean;
    papeis?: string[];
    quiosque?: boolean;
}

export const ROTAS_ADMIN: RotaAplicacao[] = [
    {
        caminho: '/painel',
        componente: PaginaPainel,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'VISUALIZACAO'],
    },
    {
        caminho: '/alunos',
        componente: PaginaAlunos,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'VISUALIZACAO'],
    },
    {
        caminho: '/turmas',
        componente: PaginaTurmas,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'VISUALIZACAO'],
    },
    {
        caminho: '/leitor',
        componente: PaginaLeitorPortaria,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTARIA'],
    },
    {
        caminho: '/relatorios',
        componente: PaginaRelatorios,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'VISUALIZACAO'],
    },
    {
        caminho: '/logs',
        componente: PaginaLogs,
        protegida: true,
        papeis: ['ADMIN'],
    },
    {
        caminho: '/usuarios',
        componente: PaginaUsuarios,
        protegida: true,
        papeis: ['ADMIN'],
    },
    {
        caminho: '/horarios',
        componente: PaginaHorarios,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO'],
    },
    {
        caminho: '/evasao',
        componente: PaginaEvasao,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA'],
    }
];

/**
 * Mantém compatibilidade com App.jsx que consome ROTAS como array flat.
 * Inclui todas as rotas admin + login + quiosque + autocadastro.
 */
export const ROTAS: RotaAplicacao[] = [
    {
        caminho: '/login',
        componente: PaginaLogin,
        protegida: false,
    },
    ...ROTAS_ADMIN,
    {
        caminho: '/quiosque',
        componente: PaginaTelaQuiosque,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTARIA'],
        quiosque: true, // Flag para App.jsx saber que é rota de quiosque
    },
    {
        caminho: '/responsavel/cadastro',
        componente: PaginaAutocadastro,
        protegida: false,
    },
    {
        caminho: '/portal-titular',
        componente: PaginaLoginPortal,
        protegida: false, // Proteção é via JWT do LGPD local
    },
    {
        caminho: '/portal-titular/painel',
        componente: PaginaPainelTitular,
        protegida: false, // Proteção feita pelo Fetch e render loading no PWA
    }
];
