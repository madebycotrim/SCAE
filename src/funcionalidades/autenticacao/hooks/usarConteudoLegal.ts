import { usarTenant } from '@tenant/provedorTenant';
import { AMBIENTE } from '@configuracoes/ambiente';

interface BaseLegal {
    titulo: string;
    descricao: string;
}

export interface ConteudoLegal {
    basesLegais: BaseLegal[];
    prazoRetencaoRegistros: string;
    prazoRetencaoAuditoria: string;
    nomeFornecedor: string;
    caraterUso: string;
    exigeConsentimento: boolean;
    nomeEncarregadoDPO: string;
    emailEncarregadoDPO: string;
    foro: string;
    dataUltimaRevisao: string;
}

export function usarConteudoLegal(): ConteudoLegal {
    const { tipoEscola, foro, nomeDPO, emailDPO } = usarTenant();

    const ehEscolaPrivada = tipoEscola === 'privada';

    const basesLegais: BaseLegal[] = ehEscolaPrivada
        ? [
            {
                titulo: 'Consentimento dos Responsáveis (Art. 7º, I)',
                descricao: 'Necessário para a coleta e tratamento de dados, garantindo que o responsável legal autorize expressamente o uso da plataforma para fins educacionais.'
            },
            {
                titulo: 'Proteção de Crianças e Adolescentes (Art. 14)',
                descricao: 'Consentimento específico e em destaque dado por pelo menos um dos pais ou responsável legal para o tratamento de dados de menores.'
            }
        ]
        : [
            {
                titulo: 'Execução de Políticas Públicas (Art. 7º, III)',
                descricao: 'Tratamento de dados estritamente necessário para garantir a prestação do serviço público de educação e a segurança no ambiente escolar.'
            },
            {
                titulo: 'Obrigação Legal ou Regulatória (Art. 7º, II)',
                descricao: 'Para manutenção de diários de classe, controle de evasão escolar e reporte de frequência às secretarias competentes do Governo.'
            },
            {
                titulo: 'Proteção de Crianças e Adolescentes (Art. 14)',
                descricao: 'O tratamento de dados pessoais de crianças e adolescentes será realizado em seu melhor interesse e com a finalidade de proteção à sua integridade no ambiente escolar.'
            }
        ];

    return {
        prazoRetencaoRegistros: '2 anos letivos após o evento',
        prazoRetencaoAuditoria: '5 anos',
        basesLegais,
        nomeFornecedor: AMBIENTE.nomeFornecedor,
        caraterUso: 'temporário, não exclusivo e intransferível, nos termos do contrato firmado entre as partes',
        exigeConsentimento: ehEscolaPrivada,
        nomeEncarregadoDPO: nomeDPO || import.meta.env.VITE_DPO_NOME || 'Encarregado de Dados (DPO)',
        emailEncarregadoDPO: emailDPO || import.meta.env.VITE_DPO_EMAIL || '',
        foro: foro || 'Brasília/DF',
        dataUltimaRevisao: '28 de Fevereiro de 2026'
    };
}
