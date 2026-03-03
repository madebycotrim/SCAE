import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, subDays } from 'date-fns';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';

export const relatorioServico = {
    obterDadosFiltrados: async (filtros: any) => {
        const banco = await bancoLocal.iniciarBanco();
        const [registros, alunos] = await Promise.all([
            banco.getAll('registros_acesso'),
            banco.getAll('alunos')
        ]);

        return registros.filter((r: any) => {
            const dataRegistro = r.timestamp.split('T')[0];
            const dataValida = dataRegistro >= filtros.dataInicio && dataRegistro <= filtros.dataFim;
            if (!dataValida) return false;
            if (filtros.turma !== 'Todas') {
                const aluno = alunos.find((a: any) => a.matricula === r.aluno_matricula);
                return aluno && aluno.turma_id === filtros.turma;
            }
            return true;
        }).map((r: any) => {
            const aluno = alunos.find((a: any) => a.matricula === r.aluno_matricula);
            return {
                data: format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm:ss'),
                nome: aluno ? aluno.nome_completo : 'Aluno Removido/Desconhecido',
                matricula: r.aluno_matricula,
                turma: aluno ? aluno.turma_id : '-',
                tipo: r.tipo_movimentacao === 'ENTRADA' ? 'ENTRADA' : 'SAÍDA',
                sincronizado: r.sincronizado ? 'Sim' : 'Não'
            };
        });
    },

    gerarPDF: (dados: any[], titulo: string, filtros: any) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('SEEDF - Sistema de Controle de Acesso Escolar', 14, 20);
        doc.setFontSize(14);
        doc.text(titulo, 14, 30);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 38);
        doc.text(`Período: ${format(parseISO(filtros.dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(filtros.dataFim), 'dd/MM/yyyy')}`, 14, 44);
        doc.text(`Turma: ${filtros.turma}`, 14, 50);
        autoTable(doc, {
            startY: 56,
            head: [['Data/Hora', 'Nome do Aluno', 'Matrícula', 'Turma', 'Tipo', 'Sync']],
            body: dados.map(d => [d.data, d.nome, d.matricula, d.turma, d.tipo, d.sincronizado]),
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }
        });
        doc.save(`Relatorio_${titulo.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    },

    gerarRelatorioEspecial: async (tipo: string, filtros: any) => {
        const banco = await bancoLocal.iniciarBanco();
        const [registros, alunos] = await Promise.all([
            banco.getAll('registros_acesso'),
            banco.getAll('alunos')
        ]);

        if (tipo === 'Risco de Evasão') {
            const trintaDiasAtras = subDays(new Date(), 30).toISOString();
            const presencasPorAluno: Record<string, number> = {};
            registros.forEach((r: any) => {
                if (r.timestamp >= trintaDiasAtras && r.tipo_movimentacao === 'ENTRADA') {
                    presencasPorAluno[r.aluno_matricula] = (presencasPorAluno[r.aluno_matricula] || 0) + 1;
                }
            });
            const dadosRelatorio = alunos.map((aluno: any) => {
                const presencas = presencasPorAluno[aluno.matricula] || 0;
                return { nome: aluno.nome_completo, matricula: aluno.matricula, turma: aluno.turma_id || '-', presencas_30d: presencas, status: presencas === 0 ? 'CRÍTICO (0)' : presencas < 10 ? 'ALERTA' : 'NORMAL' };
            }).filter((d: any) => d.status !== 'NORMAL' && (filtros.turma === 'Todas' || d.turma === filtros.turma));
            dadosRelatorio.sort((a: any, b: any) => a.presencas_30d - b.presencas_30d);
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Relatório de Risco de Evasão', 14, 20);
            doc.setFontSize(10);
            doc.text('Alunos com baixa frequência nos últimos 30 dias.', 14, 28);
            autoTable(doc, { startY: 35, head: [['Nome do Aluno', 'Matrícula', 'Turma', 'Presenças (30d)', 'Status']], body: dadosRelatorio.map((d: any) => [d.nome, d.matricula, d.turma, d.presencas_30d, d.status]), theme: 'striped', headStyles: { fillColor: [220, 38, 38] } });
            doc.save(`Risco_Evasao_${Date.now()}.pdf`);
        } else if (tipo === 'Fechamento Mensal') {
            const regsNoPeriodo = registros.filter((r: any) => { const data = r.timestamp.split('T')[0]; return data >= filtros.dataInicio && data <= filtros.dataFim; });
            const presencaGlobal: Record<string, number> = {};
            regsNoPeriodo.forEach((r: any) => { if (r.tipo_movimentacao === 'ENTRADA') presencaGlobal[r.aluno_matricula] = (presencaGlobal[r.aluno_matricula] || 0) + 1; });
            const dadosRelatorio = alunos.filter((a: any) => filtros.turma === 'Todas' || a.turma_id === filtros.turma).map((aluno: any) => ({ nome: aluno.nome_completo, matricula: aluno.matricula, turma: aluno.turma_id || '-', total_presencas: presencaGlobal[aluno.matricula] || 0 })).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Fechamento Mensal de Frequência', 14, 20);
            doc.setFontSize(10);
            doc.text(`Período: ${format(parseISO(filtros.dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(filtros.dataFim), 'dd/MM/yyyy')}`, 14, 28);
            autoTable(doc, { startY: 35, head: [['Nome do Aluno', 'Matrícula', 'Turma', 'Total Presenças (Período)']], body: dadosRelatorio.map((d: any) => [d.nome, d.matricula, d.turma, d.total_presencas]), theme: 'grid', headStyles: { fillColor: [59, 130, 246] } });
            doc.save(`Fechamento_Mensal_${Date.now()}.pdf`);
        }
    }
};
