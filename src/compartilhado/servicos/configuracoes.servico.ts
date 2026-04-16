import { api } from './api';

export const ConfiguracoesServico = {
    async buscarConfiguracoes() {
        const res = await api.obter<any>('/admin/configuracoes');
        return res;
    },

    async atualizarConfiguracoes(dados: { 
        qrDinamico?: boolean; 
        ttsAtivado?: boolean; 
        ttsFraseSucesso?: string;
        ttsFraseErro?: string;
        saidaObrigatoria?: boolean; 
        metodoAcesso?: 'QRCODE' | 'DIGITAL' 
    }) {
        const res = await api.atualizar<any>('/admin/configuracoes', dados);

        // 🚀 GATILHO INSTANTÂNEO PARA O AGENTE LOCAL
        // Se o Dashboard está rodando no mesmo PC (ou rede) que o Agente, avisamos ele na hora!
        try {
            fetch('http://localhost:1912/sync-now', { 
                method: 'POST',
                mode: 'no-cors' // Evita travar por política de CORS no trigger silencioso
            }).catch(() => {/* Agente pode estar fechado */});
        } catch (e) { /* Silencioso */ }

        return res;
    }
};
