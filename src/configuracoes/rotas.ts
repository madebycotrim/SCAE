/**
 * Definição centralizada de rotas com lazy loading.
 * Duas árvores de rotas completamente separadas:
 *   /:slugEscola/quiosque  → Quiosque de Autoatendimento (GuardaQuiosque)
 *   /:slugEscola/admin/*   → painel administrativo (GuardaRota)
 *   /:slugEscola/responsavel/cadastro → público (sem login)
 *
 * Rotas legadas (sem slug) são mantidas para compatibilidade.
 */
import { lazy } from 'react';

// --- Lazy loading de todas as páginas ---
export const PaginaLogin = lazy(() => import('@funcionalidades/usuarios/componentes/TelaAcesso'));
export const PaginaPainel = lazy(() => import('@funcionalidades/dashboard/componentes/Painel'));
export const PaginaAlunos = lazy(() => import('@funcionalidades/academico/componentes/Alunos'));
export const PaginaTurmas = lazy(() => import('@funcionalidades/academico/componentes/Turmas'));
export const PaginaTerminalAcesso = lazy(() => import('@funcionalidades/controle-acesso/componentes/TerminalAcesso'));
export const PaginaQuiosqueAutoatendimento = lazy(() => import('@funcionalidades/controle-acesso/componentes/QuiosqueAutoatendimento'));
export const PaginaRelatorios = lazy(() => import('@funcionalidades/relatorios/componentes/Relatorios'));
export const PaginaAuditoria = lazy(() => import('@funcionalidades/auditoria/componentes/RegistroAuditoria'));
export const PaginaUsuarios = lazy(() => import('@funcionalidades/usuarios/componentes/Usuarios'));
export const PaginaConfiguracaoHorarios = lazy(() => import('@funcionalidades/configuracao-horarios/componentes/FormHorariosAcesso'));
export const PaginaRiscoAbandono = lazy(() => import('@funcionalidades/risco-abandono/componentes/PainelRiscoAbandono'));
export const PaginaCartaoDigital = lazy(() => import('@funcionalidades/academico/componentes/CartaoDigital'));
import PaginaLoginResponsavelComp from '@funcionalidades/academico/componentes/TelaLoginResponsavel';
import PaginaPainelResponsavelComp from '@funcionalidades/academico/componentes/PainelResponsavel';

export const PaginaLoginResponsavel = PaginaLoginResponsavelComp;
export const PaginaPainelResponsavel = PaginaPainelResponsavelComp;
export const PaginaTermosUso = lazy(() => import('@compartilhado/paginas/TermosUso'));
export const PaginaPoliticaPrivacidade = lazy(() => import('@compartilhado/paginas/PoliticaPrivacidade'));
export const PaginaInicial = lazy(() => import('@principal/PaginaInicial'));

// --- Gestão Central ---
export const PaginaLoginCentral = lazy(() => import('@funcionalidades/gestao-central/componentes/LoginCentral'));
export const PaginaPainelCentral = lazy(() => import('@funcionalidades/gestao-central/componentes/PainelCentral'));
export const PaginaGestaoEscolas = lazy(() => import('@funcionalidades/gestao-central/componentes/PaginaGestaoEscolas').then(m => ({ default: m.PaginaGestaoEscolas })));
export const PaginaUsuariosCentral = lazy(() => import('@funcionalidades/gestao-central/componentes/PaginaUsuariosCentral').then(m => ({ default: m.PaginaUsuariosCentral })));
export const PaginaAuditoriaCentral = lazy(() => import('@funcionalidades/gestao-central/componentes/PaginaAuditoriaCentral').then(m => ({ default: m.PaginaAuditoriaCentral })));
export const LayoutCentral = lazy(() => import('@funcionalidades/gestao-central/componentes/LayoutCentral').then(m => ({ default: m.LayoutCentral })));

/**
 * Rotas do painel administrativo (desktop/mobile).
 * Protegidas por GuardaRota com verificação de papel + escola.
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
        componente: PaginaTerminalAcesso,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO'],
    },
    {
        caminho: '/relatorios',
        componente: PaginaRelatorios,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA', 'VISUALIZACAO'],
    },
    {
        caminho: '/logs',
        componente: PaginaAuditoria,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO'],
    },
    {
        caminho: '/usuarios',
        componente: PaginaUsuarios,
        protegida: true,
        papeis: ['ADMIN'],
    },
    {
        caminho: '/configuracao-horarios',
        componente: PaginaConfiguracaoHorarios,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO'],
    },
    {
        caminho: '/risco-abandono',
        componente: PaginaRiscoAbandono,
        protegida: true,
        papeis: ['ADMIN', 'COORDENACAO', 'SECRETARIA'],
    }
];

// ROTAS flat removidas para usar roteamento baseado em estrutura /:slugEscola/admin/* no App.tsx
