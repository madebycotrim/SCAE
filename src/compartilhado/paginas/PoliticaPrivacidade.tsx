import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usarTenant } from '@tenant/provedorTenant';
import { usarConteudoLegal } from '@funcionalidades/autenticacao/hooks/usarConteudoLegal';

/**
 * Página pública de Política de Privacidade.
 * Documento estritamente alinhado à LGPD, formatado em ABNT, com conteúdo 100% dinâmico e linguagem didática.
 */
export default function PoliticaPrivacidade() {
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const { nomeEscola } = usarTenant();
    const {
        basesLegais,
        prazoRetencaoRegistros,
        prazoRetencaoAuditoria,
        nomeFornecedor,
        exigeConsentimento,
        nomeEncarregadoDPO,
        emailEncarregadoDPO,
        dataUltimaRevisao
    } = usarConteudoLegal();

    return (
        <div className="min-h-screen bg-slate-100 font-[Arial,Helvetica,sans-serif] selection:bg-indigo-100 pb-12">
            {/* Header Funcional */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
                <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="text-emerald-600 w-6 h-6" />
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Política de Privacidade</h1>
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
                    <p className="text-[12pt] mt-8">POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)</p>
                </div>

                <div className="text-[12pt] leading-[1.5] text-justify space-y-4">
                    <p className="indent-[1.25cm]">
                        O <strong>{nomeEscola}</strong>, na qualidade de Controlador de Dados, adota esta Política
                        de Privacidade para informar como os dados pessoais de alunos, responsáveis
                        e colaboradores são coletados, tratados e protegidos pela plataforma SCAE,
                        operada tecnicamente por <strong>{nomeFornecedor}</strong> (Operador de Dados), em conformidade
                        com a Lei nº 13.709/2018 (LGPD).
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">1. DADOS COLETADOS</h2>
                    <p className="indent-[1.25cm]">
                        O sistema coleta apenas os dados estritamente necessários para o controle de acesso escolar:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Matrícula institucional (código SIGE);</li>
                        <li className="mb-2">Nome completo;</li>
                        <li className="mb-2">Turma;</li>
                        <li className="mb-2">Horário de entrada e saída;</li>
                        <li className="mb-2">Tipo de movimentação (entrada/saída);</li>
                        <li className="mb-2">Método de leitura (QR Code do celular, carteirinha ou manual).</li>
                    </ul>
                    <p className="indent-[1.25cm] font-bold mt-4">
                        O sistema NÃO coleta foto, biometria, localização GPS, dados de saúde ou qualquer outro dado além dos listados acima.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">2. DAS BASES LEGAIS</h2>
                    <p className="indent-[1.25cm]">
                        O tratamento dos dados é realizado com base nas seguintes hipóteses legais previstas na LGPD:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        {basesLegais.map((base, idx) => (
                            <li key={idx} className="mb-2">
                                <strong>{base.titulo}:</strong> {base.descricao}
                            </li>
                        ))}
                    </ul>
                    <p className="indent-[1.25cm]">
                        Conforme o <strong>Art. 14 da LGPD</strong>, o tratamento de dados de crianças e adolescentes é realizado no melhor interesse desses alunos, com o objetivo de garantir sua segurança no ambiente escolar.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">3. CICLO DE RETENÇÃO E DESCARTE</h2>
                    <p className="indent-[1.25cm]">
                        Os dados são mantidos pelo tempo necessário para cumprir a finalidade para a qual foram coletados:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Registros de acesso: mantidos por {prazoRetencaoRegistros}.</li>
                        <li className="mb-2">Logs de auditoria: mantidos por {prazoRetencaoAuditoria}.</li>
                        <li className="mb-2">Dados do aluno ativo: mantidos durante o vínculo com a escola + 90 dias após o encerramento.</li>
                        <li className="mb-2">Dados de responsável desvinculado: excluídos em até 30 dias após a desvinculação.</li>
                    </ul>
                    <p className="indent-[1.25cm]">
                        Após o prazo aplicável, os dados são anonimizados de forma irreversível, conforme o Art. 16 da LGPD. Apenas estatísticas agregadas sem identificação individual são mantidas.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">4. INFRAESTRUTURA E TRANSFERÊNCIA INTERNACIONAL</h2>
                    <p className="indent-[1.25cm]">
                        Os dados são processados em infraestrutura de nuvem internacional (Cloudflare e Google Firebase), com servidores fora do Brasil.
                    </p>
                    <p className="indent-[1.25cm]">
                        Toda informação sensível é protegida por criptografia AES-256 em repouso e TLS 1.2+ em trânsito.
                    </p>
                    <p className="indent-[1.25cm]">
                        A transferência internacional ocorre com base nos Data Processing Agreements (DPAs) mantidos pelos fornecedores, em conformidade com o Art. 33 da LGPD. Os dados não são comercializados com terceiros.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">5. COMPARTILHAMENTO OPERACIONAL</h2>
                    <p className="indent-[1.25cm]">
                        Os dados são sigilosos e não são vendidos ou compartilhados comercialmente. O compartilhamento ocorre apenas nos seguintes casos:
                    </p>
                    <ol className="list-decimal pl-[2.5cm]">
                        <li className="mb-2">Com os provedores de infraestrutura (Cloudflare e Google Firebase), que atuam exclusivamente como Operadores de Dados.</li>
                        <li className="mb-2">Com órgãos governamentais de educação, exclusivamente por meio de dados estatísticos agregados e anonimizados — nunca dados individuais identificáveis — e somente após a formalização de Acordo de Operação de Dados (Art. 39 LGPD).</li>
                        <li className="mb-2">Mediante ordem judicial formal de autoridade competente.</li>
                    </ol>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">6. DIREITOS DOS TITULARES</h2>
                    <p className="indent-[1.25cm]">
                        Os alunos (representados por seus responsáveis) e demais usuários podem, a qualquer momento, exercer os seguintes direitos previstos no Art. 18 da LGPD:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Confirmação da existência de tratamento de seus dados.</li>
                        <li className="mb-2">Acesso aos dados armazenados.</li>
                        <li className="mb-2">Correção de dados incompletos, inexatos ou desatualizados.</li>
                        <li className="mb-2">Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
                        <li className="mb-2">Portabilidade dos dados para outra instituição.</li>
                        {exigeConsentimento && (
                            <li className="mb-2">Revogação do consentimento dado anteriormente.</li>
                        )}
                        <li className="mb-2">Informação sobre com quem os dados são compartilhados.</li>
                    </ul>
                    <p className="indent-[1.25cm]">
                        As solicitações serão respondidas em até 15 (quinze) dias úteis, conforme o §3º do Art. 18 da LGPD.
                    </p>
                    <p className="indent-[1.25cm]">
                        Para exercer seus direitos, acesse o Portal do Titular:
                        <span className="font-bold text-blue-600 underline cursor-pointer ml-1" onClick={() => navegar(`/${slugEscola}/portal-titular`)}>Acessar o Portal do Titular</span>.
                    </p>

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">7. CONTATO DO DPO</h2>
                    <p className="indent-[1.25cm]">
                        O Encarregado de Dados (DPO) é o responsável por receber solicitações e dúvidas relacionadas a esta política.
                    </p>
                    <p className="indent-[1.25cm]">
                        <strong>Encarregado(a):</strong> {nomeEncarregadoDPO}
                        {emailEncarregadoDPO && (
                            <span><br /><strong>E-mail:</strong> {emailEncarregadoDPO}</span>
                        )}
                    </p>
                    {!emailEncarregadoDPO && (
                        <p className="indent-[1.25cm]">
                            Para exercer seus direitos, compareça presencialmente à secretaria do <strong>{nomeEscola}</strong> com documento de identificação com foto e solicite abertura de "Chamado - Direitos do Titular".
                        </p>
                    )}

                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">8. INCIDENTE DE SEGURANÇA</h2>
                    <p className="indent-[1.25cm]">
                        Em caso de vazamento ou acesso não autorizado a dados pessoais, os titulares afetados serão notificados.
                    </p>
                    <p className="indent-[1.25cm]">
                        A Autoridade Nacional de Proteção de Dados (ANPD) será notificada em até 72 horas após a constatação do incidente, conforme o Art. 48 da LGPD.
                    </p>
                    <p className="indent-[1.25cm]">
                        O canal de comunicação com os responsáveis será o e-mail do DPO ou comunicado oficial emitido pela secretaria da escola.
                    </p>

                    <div className="mt-16 text-center border-t border-slate-200 pt-8">
                        <p className="font-bold uppercase">Lei nº 13.709/2018 (BR)</p>
                        <p className="text-slate-500 mt-2">Última revisão: {dataUltimaRevisao}.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
