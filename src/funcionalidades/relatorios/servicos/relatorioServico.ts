import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/compartilhado/servicos/api';

/**
 * Serviço de Inteligência de Dados e Geração de Documentos Oficiais (ABNT)
 */
export const relatorioServico = {
    obterDadosFiltrados: async (filtros: any) => {
        const [registrosResponse, alunosResponse] = await Promise.all([
            api.obter<any[]>(`/acesso/registros?desde=${filtros.dataInicio}&limite=10000`),
            api.obter<any[]>('/academico/alunos')
        ]);

        const registros = registrosResponse || [];
        const alunos = alunosResponse || [];

        return registros.filter((r: any) => {
            const dataRegistro = r.timestamp.split('T')[0];
            return dataRegistro >= filtros.dataInicio && dataRegistro <= filtros.dataFim && 
                   (filtros.turma === 'Todas' || alunos.find((a: any) => a.matricula === r.aluno_matricula)?.turma_id === filtros.turma);
        }).map((r: any) => {
            const aluno = alunos.find((a: any) => a.matricula === r.aluno_matricula);
            
            let tipoLabel = r.tipo_movimentacao;
            if (tipoLabel === 'ENTRADA') tipoLabel = 'ENTRADA';
            else if (tipoLabel === 'SAIDA') tipoLabel = 'SAÍDA';
            else if (tipoLabel === 'TURNO_ERRADO') tipoLabel = 'TURNO INVÁLIDO';
            else if (tipoLabel === 'FORA_DE_HORARIO') tipoLabel = 'FORA DE JANELA';
            else if (tipoLabel === 'ATRASO') tipoLabel = 'ATRASO';

            return [
                format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm:ss'),
                aluno ? aluno.nome_completo.toUpperCase() : 'ALUNO REMOVIDO/NÃO LOCALIZADO',
                r.aluno_matricula,
                aluno ? aluno.turma_id : '-',
                tipoLabel,
                'NUVEM'
            ];
        });
    },

    /**
     * Motor de Renderização de PDF em Conformidade com Normas ABNT (Estilo Corporativo Premium)
     */
    gerarPDF: (dados: any[], titulo: string, filtros: any, colunasOverride?: string[][]) => {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true
        });

        const margemEsquerda = 30;
        const margemDireita = 20;

        // --- CABEÇALHO CORPORATIVO (CATRAKI ECOSYSTEM) ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('CATRAKI - SISTEMA DE CONTROLE DE ACESSO ESCOLAR', 30, 20);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('TECNOLOGIA PARA SEGURANÇA E GESTÃO ACADÊMICA', 30, 24);
        
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.line(margemEsquerda, 28, 210 - margemDireita, 28);

        // --- TÍTULO DO DOCUMENTO (ABNT FORMAL) ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(titulo.toUpperCase(), 30, 40);

        // --- DATA E EMISSÃO ---
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const dataExtensa = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        doc.text(`Emitido em: ${dataExtensa}`, 210 - margemDireita, 40, { align: 'right' });
        
        // --- PARÂMETROS DO RELATÓRIO ---
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('IDENTIFICAÇÃO DOS PARÂMETROS:', margemEsquerda, 52);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Ciclo: ${filtros.anoLetivo} • ${filtros.semestre}ºS`, margemEsquerda, 57);
        doc.text(`Unidade: ${filtros.turma === 'Todas' ? 'GERAL' : filtros.turma}`, margemEsquerda, 62);
        doc.text(`Intervalo: ${format(parseISO(filtros.dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(filtros.dataFim), 'dd/MM/yyyy')}`, margemEsquerda, 67);

        // --- TABELA DE DADOS (ABNT) ---
        autoTable(doc, {
            startY: 75,
            margin: { left: margemEsquerda, right: margemDireita, bottom: 25 },
            head: colunasOverride || [['DATA/HORA', 'NOME DO ALUNO', 'MATRÍCULA', 'TURMA', 'STATUS', 'ORIGEM']],
            body: dados,
            theme: 'striped',
            headStyles: { 
                fillColor: [30, 41, 59], 
                fontSize: 8, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { 
                fontSize: 7.5,
                cellPadding: 2.5 
            },
            columnStyles: {
                0: { cellWidth: 32 }, // Data
                2: { cellWidth: 25 }, // Matrícula
                3: { cellWidth: 15 }, // Turma
                5: { cellWidth: 15 }  // Origem
            },
            styles: {
                font: 'helvetica',
                lineColor: [230, 230, 230],
                lineWidth: 0.1
            },
            didDrawPage: (data) => {
                // Rodapé de Página
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                const str = `Pag. ${data.pageNumber} de ${doc.getNumberOfPages()}`;
                doc.text(str, 210 - margemDireita, 287, { align: 'right' });
                doc.text('Catraki Management Bureau - Gestão de Acesso Certificada', margemEsquerda, 287);
            }
        });

        // --- CAMPO DE ASSINATURA (PARA ATAS E FECHAMENTOS) ---
        if (titulo.includes('Ata') || titulo.includes('Fechamento') || titulo.includes('Auditoria')) {
            const finalY = (doc as any).lastAutoTable.finalY + 35;
            if (finalY < 265) {
                doc.line(65, finalY, 145, finalY);
                doc.setFontSize(8);
                doc.text('ASSINATURA E CARIMBO DO RESPONSÁVEL', 105, finalY + 5, { align: 'center' });
                doc.text('CHEFIA DE SECRETARIA / DIREÇÃO ESCOLAR', 105, finalY + 10, { align: 'center' });
            }
        }

        doc.save(`${titulo.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
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
                return [
                    format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm'),
                    aluno?.nome_completo.toUpperCase() || 'N/A',
                    r.aluno_matricula,
                    aluno?.turma_id || '-',
                    'TURNO INCORRETO',
                    'Online'
                ];
            });
            relatorioServico.gerarPDF(dados, 'Relatório de Divergência de Turno', filtros);
        } else if (tipo === 'Atrasos e Janelas') {
            const dados = registros.filter((r: any) => {
                const data = r.timestamp.split('T')[0];
                return data >= filtros.dataInicio && data <= filtros.dataFim && (r.tipo_movimentacao === 'ATRASO' || r.tipo_movimentacao === 'FORA_DE_HORARIO');
            }).map((r: any) => {
                const aluno = alunos.find((a: any) => a.matricula === r.aluno_matricula);
                return [
                    format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm'),
                    aluno?.nome_completo.toUpperCase() || 'N/A',
                    r.aluno_matricula,
                    aluno?.turma_id || '-',
                    r.tipo_movimentacao,
                    'Online'
                ];
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
                return [
                    aluno.nome_completo.toUpperCase(), 
                    aluno.matricula, 
                    aluno.turma_id || '-', 
                    `${presencas} dias`, 
                    presencas === 0 ? 'ALTO RISCO' : presencas < 10 ? 'ALERTA' : 'NORMAL'
                ];
            }).filter((d: any) => d[4] !== 'NORMAL' && (filtros.turma === 'Todas' || d[2] === filtros.turma));
            
            relatorioServico.gerarPDF(dadosRelatorio, 'Relatório de Risco de Evasão Escolar', filtros, [['NOME DO ALUNO', 'MATRÍCULA', 'TURMA', 'PRESENÇAS (30D)', 'STATUS DE RISCO']]);
        } else if (tipo === 'Fechamento Mensal') {
            const regsNoPeriodo = registros.filter((r: any) => { const data = r.timestamp.split('T')[0]; return data >= filtros.dataInicio && data <= filtros.dataFim; });
            const presencaGlobal: Record<string, number> = {};
            regsNoPeriodo.forEach((r: any) => { if (r.tipo_movimentacao === 'ENTRADA') presencaGlobal[r.aluno_matricula] = (presencaGlobal[r.aluno_matricula] || 0) + 1; });
            
            const dadosMapeados = alunos.filter((a: any) => filtros.turma === 'Todas' || a.turma_id === filtros.turma)
                .map((aluno: any) => [
                    aluno.nome_completo.toUpperCase(), 
                    aluno.matricula, 
                    aluno.turma_id || '-', 
                    `${presencaGlobal[aluno.matricula] || 0} Dias`,
                    'Online'
                ]).sort((a: any, b: any) => a[0].localeCompare(b[0]));
            
            relatorioServico.gerarPDF(dadosMapeados, 'Ata de Fechamento Mensal de Frequência', filtros, [['NOME DO ALUNO', 'MATRÍCULA', 'TURMA', 'TOTAL PRESENÇAS', 'FONTE']]);
        } else if (tipo === 'Log de Auditoria') {
            const logsAuditoria = await api.obter<any[]>(`/auditoria/logs?desde=${filtros.dataInicio}&limite=5000`) || [];
            const dadosMapeados = logsAuditoria.filter((l: any) => {
                const data = (l.criado_em || l.timestamp || '').split('T')[0];
                return data >= filtros.dataInicio && data <= filtros.dataFim;
            }).map((l: any) => [
                format(parseISO(l.criado_em || l.timestamp), 'dd/MM HH:mm'),
                l.usuario_email.toUpperCase(),
                l.acao.toUpperCase(),
                l.entidade_tipo.toUpperCase(),
                'NUVEM'
            ]);

            relatorioServico.gerarPDF(dadosMapeados, 'Relatório de Auditoria Técnica de Sistema', filtros, [['TIMESTAMP', 'USUÁRIO', 'AÇÃO', 'MÓDULO', 'FONTE']]);
        }
    }
};
