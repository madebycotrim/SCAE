import { useState, useEffect } from 'react';
import LayoutAdministrativo from '../componentes/LayoutAdministrativo';
import { bancoLocal } from '../servicos/bancoLocal';

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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


export default function Relatorios() {
    const [carregando, definirCarregando] = useState(true);
    const [filtros, setFiltros] = useState({
        dataInicio: subDays(new Date(), 7).toISOString().split('T')[0],
        dataFim: new Date().toISOString().split('T')[0],
        turma: 'Todas'
    });
    const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);

    useEffect(() => {
        carregarDados();
    }, [filtros]);

    const carregarDados = async () => {
        try {
            definirCarregando(true);
            const banco = await bancoLocal.iniciarBanco();
            const [registros, alunos, turmas] = await Promise.all([
                banco.getAll('registros_acesso'),
                banco.getAll('alunos'),
                banco.getAll('turmas')
            ]);

            // Carregar turmas para o filtro
            if (turmas.length > 0) {
                setTurmasDisponiveis(turmas.map(t => t.id));
            } else {
                const turmasAlunos = [...new Set(alunos.map(a => a.turma_id).filter(t => t))];
                setTurmasDisponiveis(turmasAlunos.sort());
            }

        } catch (e) {
            console.error("Erro ao carregar dados:", e);
            toast.error("Erro ao carregar estatísticas.");
        } finally {
            definirCarregando(false);
        }
    };

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
                const aluno = alunos.find(a => a.matricula === r.matricula);
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
                tipo: r.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA',
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
                        status: presencas === 0 ? 'CRÍTICO (0)' : presencas < 10 ? 'ALERTA' : 'NORMAL'
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

            toast.success('Relatório gerado com sucesso!', { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error(e.message || "Erro ao gerar relatório.", { id: toastId });
        }
    };



    return (
        <LayoutAdministrativo
            titulo="Central de Relatórios"
            subtitulo="Análise de dados e exportação oficial"
            acoes={null}
        >
            <div className="space-y-8 animate-[fade-in_0.5s_ease-out]">


                {/* Conteúdo Principal e Filtros */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Grade de Relatórios */}
                    <div className="lg:col-span-2">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: "Frequência Diária", desc: "Relatório detalhado de entradas e saídas do dia atual.", icon: Calendar, color: "emerald", action: () => gerarRelatorio('Frequência Diária') },
                                { title: "Fechamento Mensal", desc: "Consolidado de presença do mês para a secretaria.", icon: FileSpreadsheet, color: "blue", action: () => gerarRelatorio('Fechamento Mensal') },
                                { title: "Risco de Evasão", desc: "Alunos com baixo índice de frequência (30 dias).", icon: PieChart, color: "amber", action: () => gerarRelatorio('Risco de Evasão') },
                                { title: "Log de Auditoria", desc: "Histórico completo de ações e segurança.", icon: Table, color: "slate", action: () => gerarRelatorio('Log de Auditoria') }
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={item.action}
                                    disabled={carregando}
                                    className="flex flex-col items-start p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left group w-full disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
                                >
                                    <div className={`absolute inset-0 bg-${item.color}-50/0 group-hover:bg-${item.color}-50/30 transition-colors duration-300`}></div>
                                    <div className={`p-3 rounded-2xl bg-${item.color}-50 text-${item.color}-600 mb-4 group-hover:scale-110 group-hover:bg-white group-hover:shadow-md transition-all relative z-10`}>
                                        <item.icon size={24} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 mb-2 relative z-10">{item.title}</h3>
                                    <p className="text-sm font-medium text-slate-500 mb-6 flex-1 relative z-10">{item.desc}</p>
                                    <div className={`mt-auto flex items-center gap-2 text-xs font-black uppercase tracking-wide text-${item.color}-600 group-hover:gap-3 transition-all relative z-10`}>
                                        <Download size={16} /> Baixar PDF
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Barra Lateral de Filtros */}
                    <div className="h-fit space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm sticky top-6">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6 flex items-center gap-2">
                                <Filter size={16} /> Filtros de Análise
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Período</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            value={filtros.dataInicio}
                                            onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                        <input
                                            type="date"
                                            value={filtros.dataFim}
                                            onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Turma</label>
                                    <select
                                        value={filtros.turma}
                                        onChange={(e) => setFiltros({ ...filtros, turma: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="Todas">Todas as Turmas</option>
                                        {turmasDisponiveis.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
