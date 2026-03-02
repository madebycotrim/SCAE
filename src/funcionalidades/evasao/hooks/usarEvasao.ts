import { useState, useEffect, useCallback } from 'react';
import { evasaoService } from '../servicos/evasao.service';
import { AlertaEvasao, StatusEvasao } from '../types/evasao.tipos';
import { Registrador } from '@compartilhado/servicos/auditoria';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';

const log = criarRegistrador('Evasao');

/**
 * Hook para gerenciar o estado do Motor de Evasão.
 * Lida com a busca de alertas, processamento do motor e atualizações de status via Kanban.
 */
export function usarEvasao() {
    const { adicionarNotificacao } = usarNotificacoes();
    const [alertas, definirAlertas] = useState<AlertaEvasao[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [processando, definirProcessando] = useState(false);

    const buscarAlertas = useCallback(async () => {
        try {
            definirCarregando(true);
            const dados = await evasaoService.buscarAlertas();
            definirAlertas(dados);
        } catch (e) {
            log.error('Falha carregando Alertas', e);
            Registrador.registrar('EVASAO_LISTAR_FALHA', 'alerta', '', { erro: e instanceof Error ? e.message : 'Erro desconhecido' });
        } finally {
            definirCarregando(false);
        }
    }, []);

    const tratarAlerta = async (alertaId: string, novoStatus: StatusEvasao) => {
        definirProcessando(true); // Set processando to true at the start of the operation
        try {
            const sucesso = await evasaoService.atualizarStatus(alertaId, novoStatus);
            if (sucesso) {
                // Atualização otimista no estado local
                definirAlertas(anterior => anterior.map(a =>
                    a.id === alertaId ? { ...a, status: novoStatus } : a
                ));
                Registrador.registrar('EVASAO_STATUS_ATUALIZAR', 'alerta', alertaId, { status: novoStatus });
            }
        } catch (erro) {
            log.error('Erro ao atualizar status', erro);
            Registrador.registrar('EVASAO_STATUS_FALHA', 'alerta', alertaId, { erro: erro instanceof Error ? erro.message : 'Erro desconhecido', status_pretendido: novoStatus });
        } finally {
            definirProcessando(false);
        }
    };

    const rodarMotorEvasao = async () => {
        if (processando) return;
        try {
            definirProcessando(true);
            const resultado = await evasaoService.processarMotor();
            Registrador.registrar('EVASAO_MOTOR_EXECUCAO', 'alerta', '', { resultado });

            adicionarNotificacao({
                titulo: 'Motor de Faltas Executado',
                mensagem: resultado.gerados > 0
                    ? `O motor identificou ${resultado.gerados} novos alunos em risco de evasão.`
                    : 'A varredura foi concluída. Nenhum novo risco crítico detectado.',
                tipo: resultado.gerados > 0 ? 'warning' : 'success',
                link: '/administrativo/evasao'
            });

            await buscarAlertas(); // Recarrega após processar
        } catch (erro) {
            log.error('Erro no motor de evasão', erro);
            Registrador.registrar('EVASAO_MOTOR_FALHA', 'alerta', '', { erro: erro instanceof Error ? erro.message : 'Erro desconhecido' });
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
        rodarMotorEvasao,
        recarregar: buscarAlertas
    };
}
