import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, subDays } from 'date-fns';
import { api } from '@/compartilhado/servicos/api';

export const relatorioServico = {
    obterDadosFiltrados: async (filtros: any) => {
        // No Admin Online, buscamos diretamente da API
        const [registrosResponse, alunosResponse] = await Promise.all([
            api.obter<any[]>(`/acesso/registros?desde=${filtros.dataInicio}&limite=5000`),
            api.obter<any[]>('/academico/alunos')
        ]);

        const registros = registrosResponse || [];
        const alunos = alunosResponse || [];

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
            
            // Mapeamento semântico dos novos tipos vindos do Agente
            let tipoLabel = r.tipo_movimentacao;
            if (tipoLabel === 'ENTRADA') tipoLabel = 'ENTRADA';
            else if (tipoLabel === 'SAIDA') tipoLabel = 'SAÍDA';
            else if (tipoLabel === 'TURNO_ERRADO') tipoLabel = 'TURNO INVÁLIDO';
            else if (tipoLabel === 'FORA_DE_HORARIO') tipoLabel = 'FORA DE JANELA';
            else if (tipoLabel === 'ATRASO') tipoLabel = 'ATRASO';

            return {
                data: format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm:ss'),
                nome: aluno ? aluno.nome_completo : 'Aluno Removido/Desconhecido',
                matricula: r.aluno_matricula,
                turma: aluno ? aluno.turma_id : '-',
                tipo: tipoLabel,
                sincronizado: 'Online'
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
        
        // Cores semânticas baseadas no título
        let headColor: [number, number, number] = [79, 70, 229]; // Indigo
        if (titulo.includes('Atrasos')) headColor = [217, 119, 6]; // Amber
        if (titulo.includes('Divergência')) headColor = [220, 38, 38]; // Red

        autoTable(doc, {
            startY: 56,
            head: [['Data/Hora', 'Nome do Aluno', 'Matrícula', 'Turma', 'Obs/Tipo', 'Fonte']],
            body: dados.map(d => [d.data, d.nome, d.matricula, d.turma, d.tipo, d.sincronizado]),
            theme: 'striped',
            headStyles: { fillColor: headColor }
        });
        doc.save(`Relatorio_${titulo.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    },

    gerarRelatorioEspecial: async (tipo: string, filtros: any) => {
        const [registrosResponse, alunosResponse] = await Promise.all([
            api.obter<any[]>(`/acesso/registros?desde=${subDays(new Date(), 45).toISOString()}&limite=10000`),
            api.obter<any[]>('/academico/alunos')
        ]);

        const registros = registrosResponse || [];
        const alunos = alunosResponse || [];

        if (tipo === 'Divergência de Turno') {
            const dados = registros.filter((r: any) => {
                const data = r.timestamp.split('T')[0];
                return data >= filtros.dataInicio && data <= filtros.dataFim && r.tipo_movimentacao === 'TURNO_ERRADO';
            }).map((r: any) => {
                const aluno = alunos.find((a: any) => a.matricula === r.aluno_matricula);
                return {
                    data: format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm'),
                    nome: aluno?.nome_completo || 'N/A',
                    matricula: r.aluno_matricula,
                    turma: aluno?.turma_id || '-',
                    tipo: 'TURNO INCORRETO',
                    sincronizado: 'Online'
                };
            });
            relatorioServico.gerarPDF(dados, 'Relatório de Divergência de Turno', filtros);
        } else if (tipo === 'Atrasos e Janelas') {
            const dados = registros.filter((r: any) => {
                const data = r.timestamp.split('T')[0];
                return data >= filtros.dataInicio && data <= filtros.dataFim && (r.tipo_movimentacao === 'ATRASO' || r.tipo_movimentacao === 'FORA_DE_HORARIO');
            }).map((r: any) => {
                const aluno = alunos.find((a: any) => a.matricula === r.aluno_matricula);
                return {
                    data: format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm'),
                    nome: aluno?.nome_completo || 'N/A',
                    matricula: r.aluno_matricula,
                    turma: aluno?.turma_id || '-',
                    tipo: r.tipo_movimentacao,
                    sincronizado: 'Online'
                };
            });
            relatorioServico.gerarPDF(dados, 'Relatório de Atrasos e Janelas', filtros);
        } else if (tipo === 'Risco de Evasão') {
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
            doc.text('Alunos com baixa frequência nos últimos 30 dias (Dados Online).', 14, 28);
            autoTable(doc, { startY: 35, head: [['Nome do Aluno', 'Matrícula', 'Turma', 'Presenças (30d)', 'Status']], body: dadosRelatorio.map((d: any) => [d.nome, d.matricula, d.turma, d.presencas_30d, d.status]), theme: 'striped', headStyles: { fillColor: [220, 38, 38] } });
            doc.save(`Risco_Abandono_${Date.now()}.pdf`);
        } else if (tipo === 'Fechamento Mensal') {
            const regsNoPeriodo = registros.filter((r: any) => { const data = r.timestamp.split('T')[0]; return data >= filtros.dataInicio && data <= filtros.dataFim; });
            const presencaGlobal: Record<string, number> = {};
            regsNoPeriodo.forEach((r: any) => { if (r.tipo_movimentacao === 'ENTRADA') presencaGlobal[r.aluno_matricula] = (presencaGlobal[r.aluno_matricula] || 0) + 1; });
            const dadosRelatorio = alunos.filter((a: any) => filtros.turma === 'Todas' || a.turma_id === filtros.turma).map((aluno: any) => ({ nome: aluno.nome_completo, matricula: aluno.matricula, turma: aluno.turma_id || '-', total_presencas: presencaGlobal[aluno.matricula] || 0 })).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text('Fechamento Mensal de Frequência', 14, 20);
            doc.setFontSize(10);
            doc.text(`Período: ${format(parseISO(filtros.dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(filtros.dataFim), 'dd/MM/yyyy')} (Dados Online)`, 14, 28);
            autoTable(doc, { startY: 35, head: [['Nome do Aluno', 'Matrícula', 'Turma', 'Total Presenças (Período)']], body: dadosRelatorio.map((d: any) => [d.nome, d.matricula, d.turma, d.total_presencas]), theme: 'grid', headStyles: { fillColor: [59, 130, 246] } });
            doc.save(`Fechamento_Mensal_${Date.now()}.pdf`);
        }
    }
};

