import { verificarAcesso, extrairEscolaId } from '../_seguranca';
import { Permissao } from '../seguranca/rbac';
import { ErroBase, ErroInterno } from '../erros';
import type { ContextoCatraki } from '../../tipos/ambiente';

export async function onRequestGet(contexto: ContextoCatraki): Promise<Response> {
    try {
        const idEscola = extrairEscolaId(contexto.request);
        verificarAcesso(contexto, Permissao.VER_RELATORIOS);

        const hojeStr = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date()).split('/').reverse().join('-');

        const hojeObj = new Date();
        const inicioSemana = new Date(hojeObj.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().substring(0, 10);

        // 🚀 Otimização N+1 / Batching Crítico (DIMENSÃO 2)
        // 1 Round-trip único agrupado minimizando latência:
        const [alunosRes, turmasRes, alertasRes, registrosHjRes, historicoRes, alunosFeedRes] = await contexto.env.DB_SCAE.batch([
            contexto.env.DB_SCAE.prepare("SELECT COUNT(matricula) as t FROM alunos WHERE escola_id = ? AND ativo = 1").bind(idEscola),
            contexto.env.DB_SCAE.prepare("SELECT COUNT(id) as t FROM turmas WHERE escola_id = ?").bind(idEscola),
            contexto.env.DB_SCAE.prepare("SELECT COUNT(id) as t FROM alertas_risco WHERE escola_id = ? AND status != 'RESOLVIDO'").bind(idEscola),
            contexto.env.DB_SCAE.prepare("SELECT aluno_matricula, tipo_movimentacao, timestamp_acesso as timestamp FROM registros_acesso WHERE escola_id = ? AND date(timestamp_acesso, '-3 hours') = ?").bind(idEscola, hojeStr),
            contexto.env.DB_SCAE.prepare("SELECT date(timestamp_acesso, '-3 hours') as data, COUNT(DISTINCT aluno_matricula) as total FROM registros_acesso WHERE escola_id = ? AND tipo_movimentacao = 'ENTRADA' AND date(timestamp_acesso, '-3 hours') >= ? GROUP BY data ORDER BY data DESC LIMIT 7").bind(idEscola, inicioSemana),
            contexto.env.DB_SCAE.prepare("SELECT matricula, nome_completo, turma_id FROM alunos WHERE escola_id = ?").bind(idEscola), // Usado apenas no Live Feed do front momentaneamente
        ]);

        const totalAlunos = (alunosRes.results[0] as {t: number})?.t || 0;
        const totalTurmas = (turmasRes.results[0] as {t: number})?.t || 0;
        const alunosEmRisco = (alertasRes.results[0] as {t: number})?.t || 0;

        const registros = registrosHjRes.results as { aluno_matricula: string, tipo_movimentacao: string, timestamp: string }[];
        
        const entradasHoje = new Set(registros.map(r => r.aluno_matricula)).size;
        const saidasHojeCount = registros.filter(r => r.tipo_movimentacao === 'SAIDA').length;

        // Cálculos Server/Worker-Side (Preservando Client Thread)
        let atrasos = 0;
        let totalMinutos = 0;
        let contagemPares = 0;
        const registrosPorAluno: Record<string, { ENTRADA?: number, SAIDA?: number }> = {};

        registros.forEach(r => {
            if (r.tipo_movimentacao === 'ENTRADA') {
                const ts = new Date(r.timestamp);
                const minutosDia = ts.getHours() * 60 + ts.getMinutes();
                // Regra aproximada do front: entre 07:15 (435) e 12:00 ou 13:15 (795) e 18:00
                if ((minutosDia > 435 && minutosDia < 720) || (minutosDia > 795 && minutosDia < 1080)) {
                    atrasos++;
                }
            }

            const hash = r.aluno_matricula;
            if (!registrosPorAluno[hash]) registrosPorAluno[hash] = {};
            const val = new Date(r.timestamp).getTime();
            if (r.tipo_movimentacao === 'ENTRADA') registrosPorAluno[hash].ENTRADA = val;
            if (r.tipo_movimentacao === 'SAIDA') registrosPorAluno[hash].SAIDA = val;
        });

        Object.values(registrosPorAluno).forEach(p => {
            if (p.ENTRADA && p.SAIDA && p.SAIDA > p.ENTRADA) {
                totalMinutos += (p.SAIDA - p.ENTRADA) / (1000 * 60);
                contagemPares++;
            }
        });

        // Parse Histórico
        const historicoPresencaRaw = historicoRes.results as { data: string, total: number }[];
        // Transform incoming sql ISO 'YYYY-MM-DD' to short frontend 'DD/MM'
        const historicoPresenca = historicoPresencaRaw.map(h => {
             const [y, m, d] = h.data.split('-');
             return { data: `${d}/${m}`, total: h.total };
        });

        const mediaSemana = historicoPresencaRaw.length > 0 
           ? historicoPresencaRaw.reduce((acc, curr) => acc + curr.total, 0) / historicoPresencaRaw.length 
           : 0;

        const tendenciaFrequencia = mediaSemana > 0 ? Math.round(((entradasHoje - mediaSemana) / mediaSemana) * 100) : 0;

        return Response.json({
            dados: {
                totalAlunos,
                totalTurmas,
                presentesHoje: entradasHoje,
                atrasosHoje: atrasos,
                saidasHoje: saidasHojeCount,
                alunosEmRisco,
                permanenciaMedia: contagemPares > 0 ? `${(totalMinutos / contagemPares / 60).toFixed(1)}h` : '---',
                tendenciaFrequencia,
                historicoPresenca,
                // enviamos registrosRecentes vazios porque a pagina do front faz o fetching real realtime anyway
                registrosRecentes: [], 
                alunos: alunosFeedRes.results
            },
            mensagem: 'Dashboard agregado com sucesso'
        });

    } catch (erro) {
         if (erro instanceof ErroBase) {
             return Response.json(erro.toJSON(), { status: erro.status, headers: { 'Content-Type': 'application/json' } });
         }
         console.error('[CRÍTICO/Dashboard]', erro instanceof Error ? erro.stack || erro.message : erro);
         const erroInterno = new ErroInterno('Falha interna ao gerar dashboard.');
         return Response.json(erroInterno.toJSON(), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
