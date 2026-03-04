import { Scale, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usarEscolaOpcional } from '@escola/ProvedorEscola';
import { usarConteudoLegal } from '@funcionalidades/acesso-usuario/hooks/usarConteudoLegal';

/**
 * Página pública de Termos de Uso.
 * Documento formatado em ABNT, desenvolvido por estudante universitário —
 * pessoa física, sem fins lucrativos.
 */
export default function TermosUso() {
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const escola = usarEscolaOpcional();
    const nomeEscola = escola?.nomeEscola || 'Sistema de Controle de Acesso Escolar (SCAE)';
    const daEscola = !!escola;
    const { caraterUso, nomeFornecedor, foro, dataUltimaRevisao } = usarConteudoLegal();

    return (
        <div className="min-h-screen bg-slate-100 font-[Arial,Helvetica,sans-serif] selection:bg-indigo-100 pb-12">
            {/* Header Funcional */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
                <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Scale className="text-indigo-600 w-6 h-6" />
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Termos de Uso</h1>
                            {daEscola && <p className="text-xs uppercase text-slate-500">{nomeEscola}</p>}
                        </div>
                    </div>
                    <button
                        onClick={() => navegar(-1)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                </div>
            </div>

            {/* Documento Formato A4 (ABNT) */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-2xl mt-8 sm:mt-12 px-8 py-12 sm:px-[3cm] sm:py-[3cm] text-black">

                {/* Cabeçalho do Documento */}
                <div className="text-center mb-12 font-bold uppercase">
                    {daEscola && <p className="text-[12pt]">{nomeEscola}</p>}
                    <p className="text-[12pt] mt-8">TERMOS DE USO</p>
                    <p className="text-[12pt]">Sistema de Controle de Acesso Escolar — SCAE</p>
                </div>

                <div className="text-[12pt] leading-[1.5] text-justify space-y-4">

                    <p className="indent-[1.25cm]">
                        Este documento estabelece as condições de uso do Sistema de Controle de Acesso Escolar (SCAE)
                        {daEscola && <>, disponibilizado à instituição <strong>{nomeEscola}</strong></>}. O acesso ou uso do
                        sistema implica a aceitação integral destes Termos. O SCAE é um projeto desenvolvido de forma
                        independente por um estudante universitário, pessoa física, sem fins lucrativos, com o objetivo
                        de contribuir com a segurança e a organização do ambiente escolar.
                    </p>

                    {/* ─── SEÇÃO 1 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">1. DA NATUREZA DO SISTEMA</h2>
                    <p className="indent-[1.25cm]">
                        O SCAE é uma plataforma SaaS (Software as a Service — software entregue como serviço via
                        internet, sem instalação local) para gestão de controle de acesso, registro de frequência
                        e segurança escolar.
                    </p>
                    <p className="indent-[1.25cm]">
                        O uso do sistema é concedido em caráter {caraterUso}, de forma não exclusiva e intransferível,
                        limitado às finalidades previstas neste instrumento.
                    </p>

                    {/* ─── SEÇÃO 2 ─── */}
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
                            responsável por revogar o acesso do usuário no painel administrativo, evitando
                            acessos indevidos por credenciais de ex-colaboradores.
                        </li>
                    </ul>

                    {/* ─── SEÇÃO 3 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">3. PROIBIÇÕES E SANÇÕES</h2>
                    <p className="indent-[1.25cm]">
                        Violações a estes Termos podem resultar em suspensão imediata do acesso, sem prejuízo
                        de sanções administrativas, civis e criminais cabíveis. É expressamente proibido:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Realizar engenharia reversa, descompilar ou modificar o código-fonte do sistema.</li>
                        <li className="mb-2">Comprometer a segurança do sistema ou realizar bypass (contorno) de autenticação.</li>
                        <li className="mb-2">Acessar dados de alunos ou funcionários sem amparo legal (violação do princípio de finalidade da LGPD).</li>
                        <li className="mb-2">Compartilhar credenciais de acesso com terceiros não autorizados.</li>
                    </ul>

                    {/* ─── SEÇÃO 4 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">4. RESTRIÇÕES DE DOMÍNIO E AUTENTICAÇÃO</h2>
                    <p className="indent-[1.25cm]">
                        O acesso administrativo exige e-mail institucional previamente configurado pela escola,
                        com autenticação via Google OAuth (serviço de login seguro fornecido pelo Google).
                    </p>
                    <p className="indent-[1.25cm]">
                        Tentativas de acesso com e-mails fora do domínio autorizado são bloqueadas
                        automaticamente pelo sistema, sem intervenção manual.
                    </p>

                    {/* ─── SEÇÃO 5 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">5. DISPONIBILIDADE E MODIFICAÇÕES</h2>
                    <p className="indent-[1.25cm]">
                        O <strong>{nomeFornecedor}</strong> reserva-se o direito de modificar, suspender ou
                        descontinuar o serviço para realização de melhorias técnicas ou de segurança.
                    </p>
                    <p className="indent-[1.25cm]">
                        A disponibilidade do sistema depende de infraestrutura de terceiros (Cloudflare e Google).
                        Por essa razão, não há garantia de disponibilidade ininterrupta, sendo que eventuais
                        indisponibilidades por falha desses provedores estão fora do controle do desenvolvedor.
                    </p>
                    <p className="indent-[1.25cm]">
                        Sempre que possível, modificações relevantes serão comunicadas previamente à escola
                        com antecedência razoável.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">5.1. ATUALIZAÇÃO DESTES TERMOS</h2>
                    <p className="indent-[1.25cm]">
                        O <strong>{nomeFornecedor}</strong> pode atualizar estes Termos de Uso a qualquer momento.
                        Alterações relevantes serão comunicadas com antecedência mínima de 15 (quinze) dias corridos,
                        por meio de notificação no painel administrativo do sistema e/ou por e-mail institucional
                        cadastrado.
                    </p>
                    <p className="indent-[1.25cm]">
                        O uso continuado do sistema após esse prazo implica a aceitação tácita das novas condições.
                        Caso a escola não concorde com as alterações, poderá solicitar o encerramento do acesso
                        ao desenvolvedor.
                    </p>

                    {/* ─── SEÇÃO 6 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">6. LIMITAÇÃO DE RESPONSABILIDADE</h2>
                    <p className="indent-[1.25cm]">
                        Os dados são armazenados em nuvem (Cloudflare e Google Firebase). Não há hardware
                        local da escola envolvido no armazenamento.
                    </p>
                    <p className="indent-[1.25cm]">
                        Por ser um projeto independente desenvolvido por pessoa física sem fins lucrativos,
                        a responsabilidade do <strong>{nomeFornecedor}</strong> limita-se aos danos diretamente
                        causados por falha comprovada do sistema. Em nenhuma hipótese haverá responsabilidade
                        por danos indiretos, lucros cessantes ou prejuízos decorrentes de:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Indisponibilidade de infraestrutura de terceiros (Cloudflare, Google).</li>
                        <li className="mb-2">Falhas de conectividade da rede local da escola.</li>
                        <li className="mb-2">Uso inadequado do sistema por parte dos usuários.</li>
                        <li className="mb-2">Quaisquer prejuízos decorrentes de eventos fora do controle do desenvolvedor.</li>
                    </ul>
                    <p className="indent-[1.25cm]">
                        Esta limitação não exclui responsabilidade por dolo, nos termos do Art. 393 do Código
                        Civil Brasileiro (Lei nº 10.406/2002), nem afasta direitos eventualmente garantidos pelo
                        Código de Defesa do Consumidor (Lei nº 8.078/1990), quando aplicável à relação entre
                        as partes.
                    </p>
                    <p className="indent-[1.25cm]">
                        O <strong>{nomeFornecedor}</strong> age de boa-fé e com total transparência,
                        comprometendo-se a comunicar prontamente qualquer limitação técnica que possa
                        impactar o funcionamento do sistema.
                    </p>

                    {/* ─── SEÇÃO 7 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">7. PROPRIEDADE INTELECTUAL</h2>
                    <p className="indent-[1.25cm]">
                        Os direitos de propriedade intelectual do SCAE pertencem ao seu desenvolvedor,
                        <strong> {nomeFornecedor}</strong>, pessoa física, autor independente do sistema,
                        nos termos da Lei nº 9.610/1998 (Lei de Direitos Autorais).
                    </p>
                    <p className="indent-[1.25cm]">
                        O uso da plataforma é concedido exclusivamente nos termos deste instrumento.
                        Nenhum direito além dos aqui previstos é transferido pelo simples uso do sistema.
                    </p>

                    {/* ─── SEÇÃO 8 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">8. PRIVACIDADE E PROTEÇÃO DE DADOS</h2>
                    <p className="indent-[1.25cm]">
                        O tratamento de dados realizado por este sistema segue a Política de Privacidade do SCAE,
                        em conformidade com a Lei nº 13.709/2018 (LGPD).
                    </p>
                    <p className="indent-[1.25cm]">
                        O sistema NÃO coleta, em hipótese alguma: fotografia ou imagem do aluno; número de
                        telefone; CPF; biometria de qualquer tipo; localização GPS; dados de saúde; nem dados
                        bancários ou financeiros de alunos, responsáveis ou colaboradores.
                    </p>
                    <p className="indent-[1.25cm]">
                        Dados de alunos menores de idade são tratados com base no Art. 14 da LGPD, sempre no
                        melhor interesse dos estudantes e com finalidade exclusiva de segurança escolar.
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

                    {/* ─── SEÇÃO 9 (NOVA) ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">9. VIGÊNCIA E RESCISÃO</h2>
                    <p className="indent-[1.25cm]">
                        Estes Termos entram em vigor no momento do primeiro acesso ao sistema e permanecem
                        válidos durante todo o período de uso, até o encerramento da relação de uso entre
                        a instituição de ensino e o desenvolvedor <strong>{nomeFornecedor}</strong>.
                    </p>
                    <p className="indent-[1.25cm]">
                        O encerramento dessa relação implica a revogação automática de todos os acessos
                        vinculados à instituição, sem necessidade de notificação individual, respeitados
                        os prazos de retenção de dados previstos na Política de Privacidade.
                    </p>

                    {/* ─── SEÇÃO 10 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">10. FORO E LEGISLAÇÃO APLICÁVEL</h2>
                    <p className="indent-[1.25cm]">
                        Estes Termos são regidos pelas leis da República Federativa do Brasil.
                    </p>
                    <p className="indent-[1.25cm]">
                        Fica eleito o foro de <strong>{foro}</strong> para dirimir quaisquer litígios
                        decorrentes deste instrumento, com renúncia a qualquer outro foro, por mais
                        privilegiado que seja.
                    </p>

                    {/* Rodapé */}
                    <div className="mt-16 text-center border-t border-slate-200 pt-8">
                        <p className="text-slate-500">Última revisão: {dataUltimaRevisao}.</p>
                    </div>

                </div>
            </div>
        </div>
    );
}