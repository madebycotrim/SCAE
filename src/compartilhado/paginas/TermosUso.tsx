import { Scale, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usarEscolaOpcional } from '@/escola/ProvedorEscola';
import { usarConteudoLegal } from '@/funcionalidades/usuarios/hooks/usarConteudoLegal';
import { Botao } from '@/compartilhado/componentes/UI';
import { motion } from 'framer-motion';

/**
 * Página pública de Termos de Uso.
 * Documento formatado em ABNT, desenvolvido por estudante universitário —
 * pessoa física, sem fins lucrativos.
 */
export default function TermosUso() {
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const escola = usarEscolaOpcional();
    const nomeEscola = escola?.nomeEscola || 'Catraki — Sistema de Gestão de Acesso';
    const daEscola = !!escola;
    const { caraterUso, nomeFornecedor, foro, dataUltimaRevisao } = usarConteudoLegal();

    return (
        <div className="min-h-screen bg-slate-100 font-[Arial,Helvetica,sans-serif] selection:bg-indigo-100 pb-12">
            {/* Header Funcional - Alinhado a h-18 (72px) */}
            <header className="h-[72px] bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
                <div className="max-w-5xl h-full mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                            <Scale className="text-indigo-600 w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-800 tracking-tight uppercase">Termos de Uso</h1>
                            {daEscola && <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mt-1">{nomeEscola}</p>}
                        </div>
                    </div>
                    <Botao
                        variante="ghost"
                        tamanho="md"
                        icone={ArrowLeft}
                        onClick={() => navegar(-1)}
                    >
                        Voltar
                    </Botao>
                </div>
            </header>

            {/* Documento Formato A4 (ABNT) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-[210mm] mx-auto bg-white shadow-2xl mt-8 sm:mt-12 px-8 py-12 sm:px-[3cm] sm:py-[3cm] text-black"
            >

                {/* Cabeçalho do Documento */}
                <div className="text-center mb-12 font-bold uppercase">
                    {daEscola && <p className="text-[12pt]">{nomeEscola}</p>}
                    <p className="text-[12pt] mt-8">TERMOS DE USO</p>
                    <p className="text-[12pt]">Catraki — Sistema de Gestão de Acesso</p>
                </div>

                <div className="text-[12pt] leading-[1.5] text-justify space-y-4">

                    <p className="indent-[1.25cm]">
                        Este documento estabelece as condições de uso do sistema Catraki
                        {daEscola && <>, disponibilizado à instituição <strong>{nomeEscola}</strong></>}. O acesso ou uso do
                        sistema implica a aceitação integral destes Termos. O Catraki é um projeto desenvolvido de forma
                        independente por um estudante universitário, pessoa física, sem fins lucrativos, com o objetivo
                        de contribuir com a segurança e a organização do ambiente escolar.
                    </p>

                    {/* --- SEÇÃO 1 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">1. DA NATUREZA DO SISTEMA</h2>
                    <p className="indent-[1.25cm]">
                        O Catraki utiliza uma arquitetura híbrida composta por uma plataforma SaaS (Software as a Service) 
                        integrada ao <strong>Catraki Edge Agent</strong> — software de borda instalado localmente na instituição 
                        para controle de hardware biométrico, registro de frequência e segurança escolar.
                    </p>
                    <p className="indent-[1.25cm]">
                        O uso do sistema é concedido em caráter {caraterUso}, de forma não exclusiva e intransferível,
                        limitado às finalidades previstas neste instrumento.
                    </p>

                    {/* --- SEÇÃO 2 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">2. DEVERES DO USUÁRIO ADMINISTRATIVO</h2>
                    <p className="indent-[1.25cm]">
                        O acesso aos módulos administrativos é restrito aos profissionais autorizados
                        pelo <strong>{nomeEscola}</strong>. Ao utilizar o sistema, o usuário se compromete a:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Fornecer informações verdadeiras e mantê-las atualizadas.</li>
                        <li className="mb-2">Manter a confidencialidade de suas credenciais de acesso, sendo integralmente responsável por qualquer uso indevido decorrente do não cumprimento desta obrigação.</li>
                        <li className="mb-2">Utilizar exclusivamente o e-mail institucional validado para login.</li>
                        <li className="mb-2">
                            Comunicar imediatamente ao administrador do sistema qualquer suspeita de acesso
                            indevido ou comprometimento de suas credenciais de acesso.
                        </li>
                        <li className="mb-2">
                            Em caso de desligamento ou encerramento do vínculo com a instituição, a escola é
                            responsável por revogar o acesso do usuário no painel administrativo.
                        </li>
                    </ul>

                    {/* --- SEÇÃO 3 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">3. PROIBIÇÕES E SANÇÕES</h2>
                    <p className="indent-[1.25cm]">
                        Violações a estes Termos podem resultar em suspensão imediata do acesso, sem prejuízo
                        de sanções administrativas, civis e criminais cabíveis. É expressamente proibido:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Realizar engenharia reversa, descompilar ou modificar o código-fonte do sistema ou do Agente Edge.</li>
                        <li className="mb-2">Comprometer a segurança do sistema ou realizar bypass (contorno) de autenticação biometria ou digital.</li>
                        <li className="mb-2">Acessar dados de alunos ou funcionários sem amparo legal (violação do princípio de finalidade da LGPD).</li>
                        <li className="mb-2">Compartilhar credenciais de acesso com terceiros não autorizados.</li>
                    </ul>

                    {/* --- SEÇÃO 4 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">4. RESTRIÇÕES DE DOMÍNIO E AUTENTICAÇÃO</h2>
                    <p className="indent-[1.25cm]">
                        O acesso administrativo exige e-mail institucional previamente configurado pela escola,
                        com autenticação via Google OAuth (serviço de login seguro) ou sistema de convites interno.
                    </p>
                    <p className="indent-[1.25cm]">
                        Tentativas de acesso com e-mails fora do domínio autorizado são bloqueadas
                        automaticamente pelo sistema.
                    </p>

                    {/* --- SEÇÃO 5 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">5. DISPONIBILIDADE E MODIFICAÇÕES</h2>
                    <p className="indent-[1.25cm]">
                        O <strong>{nomeFornecedor}</strong> reserva-se o direito de modificar, suspender ou
                        descontinuar o serviço para realização de melhorias técnicas ou de segurança.
                    </p>
                    <p className="indent-[1.25cm]">
                        A disponibilidade do sistema depende de infraestrutura de terceiros (Cloudflare).
                        Por essa razão, não há garantia de disponibilidade ininterrupta, sendo que eventuais
                        indisponibilidades por falha desses provedores estão fora do controle do desenvolvedor.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">5.1. ATUALIZAÇÃO DESTES TERMOS</h2>
                    <p className="indent-[1.25cm]">
                        Estes Termos de Uso podem ser atualizados a qualquer momento para refletir melhorias no sistema ou mudanças legais.
                        A versão mais recente estará sempre disponível no rodapé da plataforma.
                    </p>

                    {/* --- SEÇÃO 6 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">6. LIMITAÇÃO DE RESPONSABILIDADE</h2>
                    <p className="indent-[1.25cm]">
                        Os dados operacionais são sincronizados com a nuvem (Cloudflare D1), enquanto os dados biométricos sensíveis
                        são processados e armazenados no <strong>Catraki Edge Agent</strong> local.
                    </p>
                    <p className="indent-[1.25cm]">
                        Por ser um projeto independente desenvolvido por pessoa física sem fins lucrativos,
                        a responsabilidade do <strong>{nomeFornecedor}</strong> limita-se aos danos diretamente
                        causados por falha comprovada do sistema. Em nenhuma hipótese haverá responsabilidade
                        por danos decorrentes de:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Indisponibilidade de infraestrutura de terceiros (Cloudflare).</li>
                        <li className="mb-2">Falhas de conectividade ou queda de energia na rede local da escola.</li>
                        <li className="mb-2">Uso inadequado do hardware biométrico ou do sistema por parte dos usuários.</li>
                        <li className="mb-2">Eventos de força maior ou casos fortuitos.</li>
                    </ul>

                    {/* --- SEÇÃO 7 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">7. PROPRIEDADE INTELECTUAL</h2>
                    <p className="indent-[1.25cm]">
                        Os direitos de propriedade intelectual do Catraki pertencem ao seu desenvolvedor,
                        <strong> {nomeFornecedor}</strong>, autor independente do sistema, nos termos da lei.
                    </p>

                    {/* --- SEÇÃO 8 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">8. PRIVACIDADE E BIOMETRIA</h2>
                    <p className="indent-[1.25cm]">
                        O tratamento de dados pessoais, incluindo a coleta de templates biometria para identificação, 
                        segue rigorosamente a Política de Privacidade e a Lei nº 13.709/2018 (LGPD).
                    </p>
                    <p className="indent-[1.25cm]">
                        A escola é a Controladora dos Dados e responsável por garantir que a coleta de biometria de alunos 
                        menores de idade ocorra no seu melhor interesse e conforme as diretrizes pedagógicas da instituição.
                    </p>
                    <p className="indent-[1.25cm]">
                        Acesse a Política de Privacidade completa:{' '}
                        <span
                            className="text-blue-600 underline cursor-pointer ml-1 font-bold"
                            onClick={() => navegar(slugEscola ? `/${slugEscola}/politica-de-privacidade` : '/politica-de-privacidade')}
                        >
                            Política de Privacidade
                        </span>.
                    </p>

                    {/* --- SEÇÃO 9 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">9. VIGÊNCIA E RESCISÃO</h2>
                    <p className="indent-[1.25cm]">
                        Estes Termos entram em vigor no momento do primeiro acesso e permanecem
                        válidos durante todo o período de uso institucional.
                    </p>

                    {/* --- SEÇÃO 10 --- */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">10. FORO E LEGISLAÇÃO APLICÁVEL</h2>
                    <p className="indent-[1.25cm]">
                        Estes Termos são regidos pelas leis da República Federativa do Brasil.
                        Fica eleito o foro de <strong>{foro}</strong> para dirimir quaisquer litígios.
                    </p>

                    {/* Rodapé */}
                    <div className="mt-16 text-center border-t border-slate-200 pt-8">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Catraki — Sistema de Acesso Escolar</p>
                        <p className="text-slate-400 mt-2 text-[11px]">Última revisão: {dataUltimaRevisao}.</p>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
