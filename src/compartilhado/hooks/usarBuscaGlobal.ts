import { useState, useMemo } from 'react';
import {
    LayoutDashboard,
    Users,
    Layers,
    Clock,
    AlertTriangle,
    FileText,
    Shield,
    History,
    PlusCircle,
    Settings,
    UserPlus,
    FolderPlus,
    LucideIcon
} from 'lucide-react';

export interface ResultadoBusca {
    id: string;
    titulo: string;
    descricao: string;
    rota: string;
    icone: LucideIcon;
    palavrasChave: string[];
    categoria?: 'pagina' | 'acao' | 'dado';
}

const PAGINAS_SISTEMA: ResultadoBusca[] = [
    {
        id: 'painel',
        titulo: 'Painel Geral',
        descricao: 'Visão geral de estatísticas e indicadores',
        rota: '/painel',
        icone: LayoutDashboard,
        palavrasChave: ['inicio', 'home', 'dashboard', 'estatisticas', 'resumo', 'indicadores'],
        categoria: 'pagina'
    },
    {
        id: 'alunos',
        titulo: 'Gestão de Alunos',
        descricao: 'Cadastro e listagem de estudantes',
        rota: '/alunos',
        icone: Users,
        palavrasChave: ['estudantes', 'matricula', 'frequencia', 'lista de alunos', 'discentes'],
        categoria: 'pagina'
    },
    {
        id: 'turmas',
        titulo: 'Gestão de Turmas',
        descricao: 'Organização de classes e séries',
        rota: '/turmas',
        icone: Layers,
        palavrasChave: ['classes', 'series', 'turnos', 'grupos', 'ensino', 'grade'],
        categoria: 'pagina'
    },
    {
        id: 'acessos',
        titulo: 'Controle de Acessos',
        descricao: 'Configuração de horários e portões',
        rota: '/configuracao-horarios',
        icone: Clock,
        palavrasChave: ['horarios', 'entrada', 'saida', 'portaria', 'configurar tempo', 'relogio'],
        categoria: 'pagina'
    },
    {
        id: 'risco',
        titulo: 'Risco de Abandono',
        descricao: 'Monitoramento de evasão escolar',
        rota: '/risco-abandono',
        icone: AlertTriangle,
        palavrasChave: ['evasao', 'faltas', 'alerta', 'pedagogico', 'frequencia baixa', 'abandono'],
        categoria: 'pagina'
    },
    {
        id: 'relatorios',
        titulo: 'Relatórios e Documentos',
        descricao: 'Exportação de frequência e resumos',
        rota: '/relatorios',
        icone: FileText,
        palavrasChave: ['documentos', 'pdf', 'exportar', 'impressao', 'folha de frequencia', 'ata', 'lista de presenca', 'excel'],
        categoria: 'pagina'
    },
    {
        id: 'usuarios',
        titulo: 'Usuários do Sistema',
        descricao: 'Gestão de acessos e permissões',
        rota: '/usuarios',
        icone: Shield,
        palavrasChave: ['senhas', 'acessos', 'admin', 'gestores', 'colaboradores', 'permissoes'],
        categoria: 'pagina'
    },
    {
        id: 'logs',
        titulo: 'Logs de Auditoria',
        descricao: 'Histórico de ações no sistema',
        rota: '/logs',
        icone: History,
        palavrasChave: ['auditoria', 'historico', 'quem fez', 'seguranca', 'rastreamento'],
        categoria: 'pagina'
    }
];

const ACOES_RAPIDAS: ResultadoBusca[] = [
    {
        id: 'acao-novo-aluno',
        titulo: 'Matricular Aluno',
        descricao: 'Abrir formulário de nova matrícula',
        rota: '/alunos?acao=novo',
        icone: UserPlus,
        palavrasChave: ['cadastrar aluno', 'novo estudante', 'inserir aluno', 'fazer matricula'],
        categoria: 'acao'
    },
    {
        id: 'acao-nova-turma',
        titulo: 'Criar Nova Turma',
        descricao: 'Abrir formulário de nova turma',
        rota: '/turmas?acao=novo',
        icone: FolderPlus,
        palavrasChave: ['cadastrar turma', 'nova classe', 'abrir turma'],
        categoria: 'acao'
    },
    {
        id: 'acao-config-horario',
        titulo: 'Configurar Portões',
        descricao: 'Ajustar horários de entrada/saída',
        rota: '/configuracao-horarios',
        icone: Settings,
        palavrasChave: ['ajustar portaria', 'mudar horario', 'tolerancia'],
        categoria: 'acao'
    }
];

export function usarBuscaGlobal() {
    const [termo, definirTermo] = useState('');

    const resultados = useMemo(() => {
        if (!termo.trim()) return [];

        const termoLimpo = termo.toLowerCase().trim();

        // 1. Filtrar Páginas e Ações
        const baseBusca = [...PAGINAS_SISTEMA, ...ACOES_RAPIDAS];
        const resultadosFiltrados = baseBusca.filter(item => {
            const noTitulo = item.titulo.toLowerCase().includes(termoLimpo);
            const naDescricao = item.descricao.toLowerCase().includes(termoLimpo);
            const nasPalavrasChave = item.palavrasChave.some(pc => pc.includes(termoLimpo));

            return noTitulo || naDescricao || nasPalavrasChave;
        });

        // 2. Inteligência Dinâmica (Sugestões de Dados)
        if (termoLimpo.length >= 2) {
            // Se o termo parece um Nome de Aluno ou RA (letras/números e tem espaço ou é longo)
            const pareceAluno = /^[a-zA-Z0-9\s]+$/.test(termoLimpo);
            if (pareceAluno) {
                resultadosFiltrados.push({
                    id: `busca-aluno-${termoLimpo}`,
                    titulo: `Localizar Aluno: ${termo.toUpperCase()}`,
                    descricao: `Pesquisar estudantes por "${termo}"`,
                    rota: `/alunos?busca=${encodeURIComponent(termo)}`,
                    icone: Users,
                    palavrasChave: [],
                    categoria: 'dado'
                });
            }

            // Se o termo parece uma Turma (ex: 9 A, 9º, Matutino)
            const pareceTurma = /\d/.test(termoLimpo) || ['matutino', 'vespertino', 'noturno', 'integral'].some(t => t.includes(termoLimpo));
            if (pareceTurma) {
                resultadosFiltrados.push({
                    id: `busca-turma-${termoLimpo}`,
                    titulo: `Localizar Turma: ${termo.toUpperCase()}`,
                    descricao: `Pesquisar turmas por "${termo}"`,
                    rota: `/turmas?busca=${encodeURIComponent(termo)}`,
                    icone: Layers,
                    palavrasChave: [],
                    categoria: 'dado'
                });
            }
        }

        // 3. Priorização Inteligente
        return resultadosFiltrados.sort((a, b) => {
            // Match exato no título vem primeiro
            const matchA = a.titulo.toLowerCase() === termoLimpo ? 0 : 1;
            const matchB = b.titulo.toLowerCase() === termoLimpo ? 0 : 1;
            if (matchA !== matchB) return matchA - matchB;

            // Categorias: Ações primeiro, depois Páginas, depois Dados
            const pesos = { acao: 0, pagina: 1, dado: 2 };
            return (pesos[a.categoria || 'pagina'] || 0) - (pesos[b.categoria || 'pagina'] || 0);
        }).slice(0, 6); // Aumentado para 6 para acomodar ações
    }, [termo]);

    return {
        termo,
        definirTermo,
        resultados
    };
}
