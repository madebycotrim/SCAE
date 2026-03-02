import { Scale, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usarTenant } from '@tenant/provedorTenant';
import { usarConteudoLegal } from '@funcionalidades/autenticacao/hooks/usarConteudoLegal';

/**
 * Página pública de Termos de Uso.
 * Documento estritamente formatado em ABNT, com licenciamento dinâmico sem restrições.
 */
export default function TermosUso() {
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const { nomeEscola } = usarTenant();
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
                            <p className="text-xs uppercase text-slate-500">{nomeEscola}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navegar(`/${slugEscola}/login`)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao Login
                    </button>
                </div>
            </div>

            {/* Documento Formato A4 (ABNT) */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-2xl mt-8 sm:mt-12 px-8 py-12 sm:px-[3cm] sm:py-[3cm] text-black">
                {/* Cabeçalho do Documento */}
                <div className="text-center mb-12 font-bold uppercase">
                    <p className="text-[12pt]">{nomeEscola}</p>
                    <p className="text-[12pt] mt-8">TERMOS DE USO DO SISTEMA DE CONTROLE DE ACESSO ESCOLAR (SCAE)</p>
                </div>

                <div className="text-[12pt] leading-[1.5] text-justify space-y-4">
                    <p className="indent-[1.25cm]">
                        Este documento estabelece as condições de uso do Sistema de Controle de Acesso Escolar (SCAE),
                        licenciado para o <strong>{nomeEscola}</strong>. O acesso ou uso do sistema implica a aceitação
                        integral destes termos.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">1. DA NATUREZA DO SISTEMA</h2>
                    <p className="indent-[1.25cm]">
                        O SCAE é uma plataforma SaaS (Software as a Service) para gestão de controle de acesso, registro
                        de frequência e segurança escolar.
                    </p>
                    <p className="indent-[1.25cm]">
                        O uso do sistema é concedido em caráter {caraterUso}.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">2. DEVERES DO USUÁRIO ADMINISTRATIVO</h2>
                    <p className="indent-[1.25cm]">
                        O acesso aos módulos administrativos é restrito aos profissionais autorizados pelo
                        <strong> {nomeEscola}</strong>. O usuário se compromete a:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Fornecer informações verdadeiras e mantê-las atualizadas.</li>
                        <li className="mb-2">Manter a confidencialidade de suas credenciais de acesso.</li>
                        <li className="mb-2">Utilizar exclusivamente o e-mail institucional validado para login.</li>
                    </ul>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">3. PROIBIÇÕES E SANÇÕES</h2>
                    <p className="indent-[1.25cm]">
                        Violações a estes Termos podem resultar em suspensão imediata do acesso, sem prejuízo de
                        sanções administrativas, civis e criminais. É proibido:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Realizar engenharia reversa ou modificar o código-fonte do sistema.</li>
                        <li className="mb-2">Comprometer a segurança do sistema ou realizar bypass de autenticação.</li>
                        <li className="mb-2">Acessar dados de alunos ou funcionários sem amparo legal (quebra de finalidade).</li>
                        <li className="mb-2">Compartilhar credenciais de acesso com terceiros.</li>
                    </ul>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">4. RESTRIÇÕES DE DOMÍNIO E AUTENTICAÇÃO</h2>
                    <p className="indent-[1.25cm]">
                        O acesso administrativo exige e-mail institucional previamente configurado, com autenticação
                        via Google OAuth.
                    </p>
                    <p className="indent-[1.25cm]">
                        Tentativas de acesso com e-mails fora do domínio autorizado são bloqueadas
                        automaticamente pelo sistema.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">5. DISPONIBILIDADE E MODIFICAÇÕES</h2>
                    <p className="indent-[1.25cm]">
                        O <strong>{nomeFornecedor}</strong> reserva-se o direito de modificar, suspender ou descontinuar
                        o serviço para melhorias técnicas ou de segurança.
                    </p>
                    <p className="indent-[1.25cm]">
                        A disponibilidade do sistema depende de infraestrutura de terceiros (Cloudflare, Google).
                        Não há garantia de disponibilidade ininterrupta.
                    </p>
                    <p className="indent-[1.25cm]">
                        Sempre que possível, modificações serão comunicadas previamente à escola.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">6. LIMITAÇÃO DE RESPONSABILIDADE</h2>
                    <p className="indent-[1.25cm]">
                        Os dados são armazenados em nuvem (Cloudflare). Não há hardware local da escola envolvido
                        no armazenamento.
                    </p>
                    <p className="indent-[1.25cm]">
                        O fornecedor não se responsabiliza por:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Indisponibilidade de infraestrutura de terceiros.</li>
                        <li className="mb-2">Falhas de conectividade da rede local da escola.</li>
                        <li className="mb-2">Uso inadequado do sistema por parte dos usuários.</li>
                        <li className="mb-2">Danos indiretos ou lucros cessantes.</li>
                    </ul>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">7. PROPRIEDADE INTELECTUAL</h2>
                    <p className="indent-[1.25cm]">
                        Os direitos de propriedade intelectual do SCAE pertencem ao fornecedor da tecnologia.
                    </p>
                    <p className="indent-[1.25cm]">
                        O uso da plataforma é concedido nos termos do contrato firmado entre as partes.
                        Nenhum direito além dos previstos no contrato é transferido pelo simples uso do sistema.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">8. PRIVACIDADE E PROTEÇÃO DE DADOS</h2>
                    <p className="indent-[1.25cm]">
                        O tratamento de dados realizado por este sistema segue a Política de Privacidade do SCAE,
                        em conformidade com a LGPD.
                    </p>
                    <p className="indent-[1.25cm]">
                        Dados de alunos menores de idade são tratados com base no Art. 14 da LGPD, no melhor interesse dos estudantes.
                    </p>
                    <p className="indent-[1.25cm]">
                        Acesse a Política de Privacidade completa:
                        <span className="text-blue-600 underline cursor-pointer ml-1 font-bold" onClick={() => navegar(`/${slugEscola}/politica-privacidade`)}>Política de Privacidade</span>.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">9. FORO E LEGISLAÇÃO APLICÁVEL</h2>
                    <p className="indent-[1.25cm]">
                        Estes Termos são regidos pelas leis da República Federativa do Brasil.
                    </p>
                    <p className="indent-[1.25cm]">
                        Fica eleito o foro de <strong>{foro}</strong> para dirimir quaisquer litígios, com
                        renúncia a qualquer outro foro, por mais privilegiado que seja.
                    </p>

                    <div className="mt-16 text-center border-t border-slate-200 pt-8">
                        <p className="text-slate-500">Última revisão: {dataUltimaRevisao}.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
