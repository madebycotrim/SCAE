import { useState } from 'react';
import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';

import {
    FileText,
    Download,
    Calendar,
    Filter,
    BarChart2,
    PieChart,
    Table,
    FileSpreadsheet,
    FileCheck,
    Clock
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Relatorios');
import { Registrador } from '@compartilhado/servicos/auditoria';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


export default function Relatorios() {

    const [filtros, definirFiltros] = useState({
        dataInicio: subDays(new Date(), 7).toISOString().split('T')[0],
        dataFim: new Date().toISOString().split('T')[0],
        turma: 'Todas'
    });
    const { dados: turmasDisponiveis = [], carregando } = usarConsulta(
        ['turmas-relatorios'],
        async () => {
            const banco = await bancoLocal.iniciarBanco();
            const [alunos, turmas] = await Promise.all([
                banco.getAll('alunos'),
                banco.getAll('turmas')
            ]);

            if (turmas.length > 0) {
                return turmas.map(t => t.id).sort();
            } else {
                const turmasAlunos = [...new Set(alunos.map(a => a.turma_id).filter(t => t))];
                return turmasAlunos.sort();
            }
        },
        { staleTime: 5 * 60 * 1000 }
    );

    const obterDadosFiltrados = async () => {
        const banco = await bancoLocal.iniciarBanco();
        const [registros, alunos] = await Promise.all([
            banco.getAll('registros_acesso'),
            banco.getAll('alunos')
        ]);

        return registros.filter(r => {
            const dataRegistro = r.timestamp.split('T')[0];
            const dataValida = dataRegistro >= filtros.dataInicio && dataRegistro <= filtros.dataFim;

            if (!dataValida) return false;

            if (filtros.turma !== 'Todas') {
                const aluno = alunos.find(a => a.matricula === r.aluno_matricula);
                return aluno && aluno.turma_id === filtros.turma;
            }
            return true;
        }).map(r => {
            const aluno = alunos.find(a => a.matricula === r.matricula);
            return {
                data: format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm:ss'),
                nome: aluno ? aluno.nome_completo : 'Aluno Removido/Desconhecido',
                matricula: r.matricula,
                turma: aluno ? aluno.turma_id : '-',
                tipo: r.tipo === 'entrada' ? 'ENTRADA' : 'SAÃDA',
                sincronizado: r.sincronizado ? 'Sim' : 'Não'
            };
        });
    };

    const gerarPDF = (dados, titulo) => {
        const doc = new jsPDF();

        // Cabeçalho
        doc.setFontSize(18);
        doc.text("SEEDF - Sistema de Controle de Acesso Escolar", 14, 20);
        doc.setFontSize(14);
        doc.text(titulo, 14, 30);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 38);
        doc.text(`Período: ${format(parseISO(filtros.dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(filtros.dataFim), 'dd/MM/yyyy')}`, 14, 44);
        doc.text(`Turma: ${filtros.turma}`, 14, 50);

        // Tabela
        autoTable(doc, {
            startY: 56,
            head: [['Data/Hora', 'Nome do Aluno', 'Matrícula', 'Turma', 'Tipo', 'Sync']],
            body: dados.map(d => [d.data, d.nome, d.matricula, d.turma, d.tipo, d.sincronizado]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] } // Indigo 600
        });

        doc.save(`Relatorio_${titulo.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    };

    const gerarRelatorio = async (tipo) => {
        const toastId = toast.loading(`Processando relatório: ${tipo}...`);
        try {
            const banco = await bancoLocal.iniciarBanco();
            const [registros, alunos] = await Promise.all([
                banco.getAll('registros_acesso'),
                banco.getAll('alunos')
            ]);

            let dadosRelatorio = [];
            let colunas = [];

            if (tipo === 'Risco de Evasão') {
                const trintaDiasAtras = subDays(new Date(), 30).toISOString();
                const presencasPorAluno = {};
                registros.forEach(r => {
                    if (r.timestamp >= trintaDiasAtras && r.tipo_movimentacao === 'ENTRADA') {
                        presencasPorAluno[r.aluno_matricula] = (presencasPorAluno[r.aluno_matricula] || 0) + 1;
                    }
                });

                dadosRelatorio = alunos.map(aluno => {
                    const presencas = presencasPorAluno[aluno.matricula] || 0;
                    return {
                        nome: aluno.nome_completo,
                        matricula: aluno.matricula,
                        turma: aluno.turma_id || '-',
                        presencas_30d: presencas,
                        status: presencas === 0 ? 'CRÃTICO (0)' : presencas < 10 ? 'ALERTA' : 'NORMAL'
                    };
                }).filter(d => d.status !== 'NORMAL' && (filtros.turma === 'Todas' || d.turma === filtros.turma));
                dadosRelatorio.sort((a, b) => a.presencas_30d - b.presencas_30d);
                colunas = [['Nome do Aluno', 'Matrícula', 'Turma', 'Presenças (30d)', 'Status']];

                const doc = new jsPDF();
                doc.setFontSize(16);
                doc.text("Relatório de Risco de Evasão", 14, 20);
                doc.setFontSize(10);
                doc.text(`Alunos com baixa frequência nos últimos 30 dias.`, 14, 28);
                autoTable(doc, {
                    startY: 35,
                    head: colunas,
                    body: dadosRelatorio.map(d => [d.nome, d.matricula, d.turma, d.presencas_30d, d.status]),
                    theme: 'striped',
                    headStyles: { fillColor: [220, 38, 38] },
                });
                doc.save(`Risco_Evasao_${Date.now()}.pdf`);
            } else if (tipo === 'Fechamento Mensal') {
                const regsNoPeriodo = registros.filter(r => {
                    const data = r.timestamp.split('T')[0];
                    return data >= filtros.dataInicio && data <= filtros.dataFim;
                });
                const presencaGlobal = {};
                regsNoPeriodo.forEach(r => {
                    if (r.tipo_movimentacao === 'ENTRADA') {
                        presencaGlobal[r.aluno_matricula] = (presencaGlobal[r.aluno_matricula] || 0) + 1;
                    }
                });
                dadosRelatorio = alunos
                    .filter(a => filtros.turma === 'Todas' || a.turma_id === filtros.turma)
                    .map(aluno => ({
                        nome: aluno.nome_completo,
                        matricula: aluno.matricula,
                        turma: aluno.turma_id || '-',
                        total_presencas: presencaGlobal[aluno.matricula] || 0
                    }))
                    .sort((a, b) => a.nome.localeCompare(b.nome));
                colunas = [['Nome do Aluno', 'Matrícula', 'Turma', 'Total Presenças (Período)']];
                const doc = new jsPDF();
                doc.setFontSize(16);
                doc.text("Fechamento Mensal de Frequência", 14, 20);
                doc.setFontSize(10);
                doc.text(`Período: ${format(parseISO(filtros.dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(filtros.dataFim), 'dd/MM/yyyy')}`, 14, 28);
                autoTable(doc, {
                    startY: 35,
                    head: colunas,
                    body: dadosRelatorio.map(d => [d.nome, d.matricula, d.turma, d.total_presencas]),
                    theme: 'grid',
                    headStyles: { fillColor: [59, 130, 246] },
                });
                doc.save(`Fechamento_Mensal_${Date.now()}.pdf`);
            } else {
                const dados = await obterDadosFiltrados();
                if (dados.length === 0) throw new Error("Nenhum dado encontrado.");
                gerarPDF(dados, `Relatório de ${tipo}`);
            }

            // Registrar Auditoria (LGPD #8)
            await Registrador.registrar(
                'EXPORTAR_RELATORIO',
                'relatorio',
                tipo,
                { filtros, formato: tipo.includes('XLSX') ? 'Excel' : 'PDF' }
            );

            toast.success('Relatório gerado com sucesso!', { id: toastId });
        } catch (e) {
            log.error('Erro ao exportar relatório', e);
            toast.error(e.message || "Erro ao gerar relatório.", { id: toastId });
        }
    };



    return (
        <LayoutAdministrativo
            titulo="Central de Relatórios"
            subtitulo="Análise de dados e exportação oficial"
            acoes={null}
        >
            <div className="space-y-6 pb-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Grade de Relatórios */}
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: "Frequência Diária", desc: "Relatório detalhado de entradas e saídas do dia atual.", icon: Calendar, color: "text-emerald-600 bg-emerald-50", action: () => gerarRelatorio('Frequência Diária') },
                                { title: "Fechamento Mensal", desc: "Consolidado de presença do mês para a secretaria.", icon: FileSpreadsheet, color: "text-blue-600 bg-blue-50", action: () => gerarRelatorio('Fechamento Mensal') },
                                { title: "Risco de Evasão", desc: "Alunos com baixo índice de frequência (30 dias).", icon: PieChart, color: "text-amber-600 bg-amber-50", action: () => gerarRelatorio('Risco de Evasão') },
                                { title: "Log de Auditoria", desc: "Histórico completo de ações e segurança.", icon: Table, color: "text-slate-600 bg-slate-50", action: () => gerarRelatorio('Log de Auditoria') }
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={item.action}
                                    disabled={carregando}
                                    className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all text-left flex flex-col h-full disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    <div className="flex gap-4 mb-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                                            <item.icon size={20} strokeWidth={2} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-800 mb-1">{item.title}</h3>
                                            <p className="text-sm text-slate-500 leading-snug">{item.desc}</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4 flex items-center gap-2 text-sm font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors">
                                        <Download size={16} />
                                        <span>Exportar Documento</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Barra Lateral de Filtros */}
                    <div className="h-fit space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm sticky top-6">
                            <h3 className="text-base font-semibold text-slate-800 mb-6 flex items-center gap-2">
                                <Filter size={18} className="text-slate-400" />
                                Filtros de Análise
                            </h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Período de Extração</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Início</label>
                                            <input
                                                type="date"
                                                value={filtros.dataInicio}
                                                onChange={(e) => definirFiltros({ ...filtros, dataInicio: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Fim</label>
                                            <input
                                                type="date"
                                                value={filtros.dataFim}
                                                onChange={(e) => definirFiltros({ ...filtros, dataFim: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Unidade / Turma</label>
                                    <div className="relative">
                                        <select
                                            value={filtros.turma}
                                            onChange={(e) => definirFiltros({ ...filtros, turma: e.target.value })}
                                            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm appearance-none"
                                        >
                                            <option value="Todas">Todas as Turmas</option>
                                            {(turmasDisponiveis || []).map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                            <PieChart size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-slate-50 rounded-md border border-slate-200">
                                <p className="text-sm text-slate-600 leading-snug">
                                    <strong className="text-slate-800">Dica:</strong> Escolha um período menor para exportações mais rápidas e relatórios direcionados.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
