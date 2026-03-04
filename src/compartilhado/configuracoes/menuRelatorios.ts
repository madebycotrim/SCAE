import {
    Clock,
    FileSpreadsheet,
    AlertTriangle,
    ShieldCheck,
    LucideIcon
} from 'lucide-react';

export interface ConfiguracaoRelatorio {
    id: string;
    titulo: string;
    descricao: string;
    icone: LucideIcon;
    badgeTxt: string;
    badgeCor: string;
    iconeCor: string;
    rota: string; // Rota para filtro direto
}

export const CONFIG_RELATORIOS: ConfiguracaoRelatorio[] = [
    {
        id: 'frequencia',
        titulo: 'Frequência Diária',
        descricao: 'Relatório detalhado de entrada e saída dos alunos para controle de portaria e sala de aula.',
        icone: Clock,
        badgeTxt: 'Frequência',
        badgeCor: 'bg-blue-50 text-blue-600 border-blue-100',
        iconeCor: 'bg-blue-50 text-blue-500',
        rota: '/relatorios?modulo=frequencia',
    },
    {
        id: 'fechamento',
        titulo: 'Ata de Fechamento',
        descricao: 'Documento consolidado para fins de secretaria escolar e histórico institucional.',
        icone: FileSpreadsheet,
        badgeTxt: 'Gestão',
        badgeCor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        iconeCor: 'bg-emerald-50 text-emerald-500',
        rota: '/relatorios?modulo=fechamento',
    },
    {
        id: 'evasao',
        titulo: 'Risco de Evasão',
        descricao: 'Análise preventiva baseada em faltas consecutivas para atuação do SOE.',
        icone: AlertTriangle, // Normalizado para AlertTriangle conforme feedback do usuário
        badgeTxt: 'Preventivo',
        badgeCor: 'bg-amber-50 text-amber-600 border-amber-100',
        iconeCor: 'bg-amber-50 text-amber-500',
        rota: '/relatorios?modulo=evasao',
    },
    {
        id: 'auditoria',
        titulo: 'Auditoria de Acessos',
        descricao: 'Registro técnico de todas as operações realizadas no sistema para segurança de dados.',
        icone: ShieldCheck,
        badgeTxt: 'Segurança',
        badgeCor: 'bg-slate-100 text-slate-600 border-slate-200',
        iconeCor: 'bg-slate-100 text-slate-500',
        rota: '/relatorios?modulo=auditoria',
    },
];
