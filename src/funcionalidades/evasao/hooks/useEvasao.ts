import { useState, useEffect, useCallback } from 'react';
import { evasaoService } from '../servicos/evasao.service';
import { AlertaEvasao, StatusEvasao } from '../types/evasao.tipos';
import { Registrador } from '@compartilhado/servicos/auditoria';

/**
 * Hook para gerenciar o estado do Motor de Evasão.
 * Lida com a busca de alertas, processamento do motor e atualizações de status via Kanban.
 */
export function useEvasao() {
    const [alertas, setAlertas] = useState<AlertaEvasao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(false);

    const buscarAlertas = useCallback(async () => {
        try {
            setCarregando(true);
            const dados = await evasaoService.buscarAlertas();
            setAlertas(dados);
        } catch (erro) {
            Registrador.registrar('EVASAO_LISTAR_FALHA', 'alerta', '', { erro: erro instanceof Error ? erro.message : 'Erro desconhecido' });
        } finally {
            setCarregando(false);
        }
    }, []);

    const atualizarTratativa = async (alertaId: string, novoStatus: StatusEvasao) => {
        try {
            const sucesso = await evasaoService.atualizarStatus(alertaId, novoStatus);
            if (sucesso) {
                // Atualização otimista no estado local
                setAlertas(prev => prev.map(a =>
                    a.id === alertaId ? { ...a, status: novoStatus } : a
                ));
                Registrador.registrar('EVASAO_STATUS_ATUALIZAR', 'alerta', alertaId, { status: novoStatus });
            }
        } catch (erro) {
            Registrador.registrar('EVASAO_STATUS_FALHA', 'alerta', alertaId, { erro: erro instanceof Error ? erro.message : 'Erro desconhecido', status_pretendido: novoStatus });
        }
    };

    const rodarMotorEvasao = async () => {
        if (processando) return;
        try {
            setProcessando(true);
            const resultado = await evasaoService.processarMotor();
            Registrador.registrar('EVASAO_MOTOR_EXECUCAO', 'alerta', '', { resultado });
            await buscarAlertas(); // Recarrega após processar
        } catch (erro) {
            Registrador.registrar('EVASAO_MOTOR_FALHA', 'alerta', '', { erro: erro instanceof Error ? erro.message : 'Erro desconhecido' });
        } finally {
            setProcessando(false);
        }
    };

    useEffect(() => {
        buscarAlertas();
    }, [buscarAlertas]);

    return {
        alertas,
        carregando,
        processando,
        atualizarTratativa,
        rodarMotorEvasao,
        recarregar: buscarAlertas
    };
}
