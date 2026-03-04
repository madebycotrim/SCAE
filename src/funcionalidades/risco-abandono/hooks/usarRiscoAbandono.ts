import { useState, useEffect, useCallback } from 'react';
import { riscoAbandonoServico } from '../servicos/riscoAbandono.servico';
import { AlertaRiscoAbandono, StatusRiscoAbandono } from '../types/riscoAbandono.tipos';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';
import { usarEscola } from '@escola/ProvedorEscola';

const log = criarRegistrador('RiscoAbandono');

/**
 * Hook para gerenciar o estado do Motor de Risco de Abandono.
 * Lida com a busca de alertas, processamento do motor e atualizações de status.
 */
export function usarRiscoAbandono() {
    const { id: idEscola } = usarEscola();
    const { adicionarNotificacao } = usarNotificacoes();
    const [alertas, definirAlertas] = useState<AlertaRiscoAbandono[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [processando, definirProcessando] = useState(false);

    const buscarAlertas = useCallback(async () => {
        try {
            definirCarregando(true);
            const dados = await riscoAbandonoServico.buscarAlertas();
            definirAlertas(dados);
        } catch (e) {
            log.error('Falha carregando Alertas de Risco de Abandono', e);
            Registrador.registrar('RISCO_ABANDONO_LISTAR_FALHA', 'alerta', '', { erro: e instanceof Error ? e.message : 'Erro desconhecido' });
        } finally {
            definirCarregando(false);
        }
    }, []);

    const tratarAlerta = async (alertaId: string, novoStatus: StatusRiscoAbandono) => {
        definirProcessando(true);
        try {
            const sucesso = await riscoAbandonoServico.atualizarStatus(alertaId, novoStatus);
            if (sucesso) {
                // Atualização otimista no estado local
                definirAlertas(anterior => anterior.map(a =>
                    a.id === alertaId ? { ...a, status: novoStatus } : a
                ));
                Registrador.registrar('RISCO_ABANDONO_STATUS_ATUALIZAR', 'alerta', alertaId, { status: novoStatus });
            }
        } catch (erro) {
            log.error('Erro ao atualizar status de risco', erro);
            Registrador.registrar('RISCO_ABANDONO_STATUS_FALHA', 'alerta', alertaId, { erro: erro instanceof Error ? erro.message : 'Erro desconhecido', status_pretendido: novoStatus });
        } finally {
            definirProcessando(false);
        }
    };

    const rodarMotorRiscoAbandono = async () => {
        if (processando) return;
        try {
            definirProcessando(true);
            const resultado = await riscoAbandonoServico.processarMotor();
            Registrador.registrar('RISCO_ABANDONO_MOTOR_EXECUCAO', 'alerta', '', { resultado });

            adicionarNotificacao({
                titulo: 'Motor de Risco de Abandono Executado',
                mensagem: resultado.gerados > 0
                    ? `O motor identificou ${resultado.gerados} novos alunos em risco de abandono escolar.`
                    : 'A varredura foi concluída. Nenhum novo risco crítico detectado.',
                tipo: resultado.gerados > 0 ? 'warning' : 'success',
                link: `/${idEscola}/admin/risco-abandono`
            });

            await buscarAlertas(); // Recarrega após processar
        } catch (erro) {
            log.error('Erro no motor de risco de abandono', erro);
            Registrador.registrar('RISCO_ABANDONO_MOTOR_FALHA', 'alerta', '', { erro: erro instanceof Error ? erro.message : 'Erro desconhecido' });
        } finally {
            definirProcessando(false);
        }
    };

    useEffect(() => {
        buscarAlertas();
    }, [buscarAlertas]);

    return {
        alertas,
        carregando,
        processando,
        tratarAlerta,
        rodarMotorRiscoAbandono,
        recarregar: buscarAlertas,
        buscarHistoricoFaltas: riscoAbandonoServico.buscarHistoricoFaltas
    };
}

