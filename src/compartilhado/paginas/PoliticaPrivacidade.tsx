import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { usarEscolaOpcional } from '@escola/ProvedorEscola';
import { usarConteudoLegal } from '@funcionalidades/acesso-usuario/hooks/usarConteudoLegal';

/**
 * Página pública de Política de Privacidade.
 * Documento alinhado à LGPD (Lei nº 13.709/2018), formatado em ABNT,
 * desenvolvido por estudante universitário — pessoa física, sem fins lucrativos.
 */
export default function PoliticaPrivacidade() {
    const navegar = useNavigate();
    const { slugEscola } = useParams();
    const escola = usarEscolaOpcional();
    const nomeEscola = escola?.nomeEscola || 'Desenvolvedor SCAE';
    const nomeAmigavel = escola?.nomeEscola || 'SCAE';
    const daEscola = !!escola;
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
                            {daEscola && <p className="text-xs uppercase text-slate-500">{nomeAmigavel}</p>}
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
                    {daEscola && <p className="text-[12pt]">{nomeAmigavel}</p>}
                    <p className="text-[12pt] mt-8">POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS</p>
                    <p className="text-[12pt]">Lei nº 13.709/2018 (LGPD)</p>
                </div>

                <div className="text-[12pt] leading-[1.5] text-justify space-y-4">

                    <p className="indent-[1.25cm]">
                        {daEscola ? (
                            <>O <strong>{nomeEscola}</strong>, na qualidade de Controladora de Dados, adota esta Política de Privacidade para informar</>
                        ) : (
                            <>Esta Política de Privacidade informa</>
                        )} como os dados pessoais de alunos, responsáveis e colaboradores são coletados,
                        tratados e protegidos pela plataforma SCAE, operada tecnicamente por <strong>{nomeFornecedor}</strong> (Operador
                        de Dados) — desenvolvedor independente, pessoa física, sem fins lucrativos —, em conformidade
                        com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).
                    </p>

                    {/* ─── SEÇÃO 1 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">1. DADOS COLETADOS</h2>
                    <p className="indent-[1.25cm]">
                        O sistema coleta apenas os dados estritamente necessários para o controle de acesso escolar,
                        conforme o princípio da minimização previsto no Art. 6º, III da LGPD. Para cada dado coletado,
                        a finalidade específica está declarada abaixo, em atendimento ao Art. 9º da LGPD:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">
                            <strong>Matrícula institucional (código SIGE)</strong> — Finalidade: identificação unívoca do aluno no sistema, vinculando os registros de acesso ao seu perfil escolar.
                        </li>
                        <li className="mb-2">
                            <strong>Nome completo</strong> — Finalidade: identificação legível do aluno nos relatórios e notificações geradas para a escola e responsáveis.
                        </li>
                        <li className="mb-2">
                            <strong>Turma</strong> — Finalidade: organização e filtragem dos registros de acesso por grupo escolar, facilitando a gestão pela equipe pedagógica.
                        </li>
                        <li className="mb-2">
                            <strong>Horário de entrada e saída</strong> — Finalidade: registro de frequência e controle de segurança do aluno no ambiente escolar.
                        </li>
                        <li className="mb-2">
                            <strong>Tipo de movimentação (entrada/saída)</strong> — Finalidade: distinção entre eventos de entrada e saída nos relatórios de controle de acesso.
                        </li>
                        <li className="mb-2">
                            <strong>Método de leitura (QR Code do celular, carteirinha ou manual)</strong> — Finalidade: auditoria e rastreabilidade do registro, permitindo identificar a origem de cada leitura realizada.
                        </li>
                    </ul>

                    <p className="indent-[1.25cm] font-bold mt-4">
                        O sistema NÃO coleta, em hipótese alguma, os seguintes dados: fotografia ou imagem do aluno;
                        número de telefone (do aluno ou responsável); CPF (do aluno ou responsável); biometria de
                        qualquer tipo; localização GPS; dados de saúde; dados bancários ou financeiros; nem qualquer
                        outro dado além dos expressamente listados acima.
                    </p>

                    {/* ─── SEÇÃO 2 ─── */}
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
                        Nesta relação de tratamento, {daEscola ? <><strong>{nomeEscola}</strong> atua</> : <>a escola contratante atua</>} como
                        Controladora de Dados (Art. 5º, VI da LGPD), sendo responsável pelas decisões sobre quais dados
                        são coletados e para qual finalidade. O desenvolvedor <strong>{nomeFornecedor}</strong> atua
                        exclusivamente como Operador (Art. 5º, VII da LGPD), processando os dados apenas conforme
                        as instruções e finalidades definidas pela escola.
                    </p>

                    <p className="indent-[1.25cm]">
                        Conforme o <strong>Art. 14 da LGPD</strong>, o tratamento de dados de crianças e adolescentes
                        é realizado no melhor interesse desses alunos, com o objetivo exclusivo de garantir sua
                        segurança no ambiente escolar.
                    </p>

                    {/* ─── SEÇÃO 3 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">3. CICLO DE RETENÇÃO E DESCARTE</h2>
                    <p className="indent-[1.25cm]">
                        Os dados são mantidos pelo tempo necessário para cumprir a finalidade para a qual foram
                        coletados, observando os seguintes prazos:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Registros de acesso: mantidos por {prazoRetencaoRegistros}.</li>
                        <li className="mb-2">
                            Logs de auditoria: mantidos por {prazoRetencaoAuditoria}.
                            <span className="font-normal"> (Logs de auditoria são registros técnicos automáticos das operações realizadas no sistema,
                            utilizados exclusivamente para fins de segurança e rastreabilidade de acessos.)</span>
                        </li>
                        <li className="mb-2">Dados do aluno ativo: mantidos durante o período de matrícula ativa na instituição, acrescido de 90 dias após o encerramento do vínculo.</li>
                        <li className="mb-2">Dados de responsável desvinculado: excluídos em até 30 dias após a desvinculação.</li>
                    </ul>
                    <p className="indent-[1.25cm]">
                        Após o prazo aplicável, os dados são anonimizados de forma irreversível, conforme o Art. 16
                        da LGPD. Apenas estatísticas agregadas, sem identificação individual, são mantidas para fins
                        de histórico escolar.
                    </p>

                    {/* ─── SEÇÃO 4 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">4. INFRAESTRUTURA E TRANSFERÊNCIA INTERNACIONAL</h2>
                    <p className="indent-[1.25cm]">
                        Os dados são processados em infraestrutura de nuvem internacional — Cloudflare e Google
                        Firebase —, com servidores localizados fora do Brasil. Por tratar-se de sistema desenvolvido
                        por pessoa física independente, o <strong>{nomeFornecedor}</strong> não possui infraestrutura
                        própria de servidores; todo o processamento ocorre nos serviços citados, cujas políticas de
                        privacidade e segurança são de responsabilidade dos respectivos provedores.
                    </p>
                    <p className="indent-[1.25cm]">
                        Todas as informações são protegidas por criptografia AES-256 em repouso e TLS 1.2+ em trânsito.
                    </p>
                    <p className="indent-[1.25cm]">
                        A transferência internacional ocorre com base no Art. 33 da LGPD, especificamente com
                        fundamento no inciso II (países ou organismos que proporcionem grau de proteção de dados
                        adequado ao previsto na LGPD) e no inciso VII (cláusulas contratuais específicas — Data
                        Processing Agreements — mantidas pelos próprios provedores de infraestrutura). Os dados
                        não são comercializados com terceiros.
                    </p>
                    <p className="indent-[1.25cm]">
                        O sistema pode registrar dados técnicos de sessão, como identificador de dispositivo e
                        endereço IP de acesso, exclusivamente para fins de segurança e prevenção de acessos não
                        autorizados. Esses dados não são utilizados para rastreamento comercial, criação de perfis
                        comportamentais ou qualquer finalidade além da segurança do sistema.
                    </p>

                    {/* ─── SEÇÃO 5 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">5. COMPARTILHAMENTO OPERACIONAL</h2>
                    <p className="indent-[1.25cm]">
                        Os dados são sigilosos e não são vendidos ou compartilhados comercialmente.
                        O compartilhamento ocorre apenas nos seguintes casos:
                    </p>
                    <ol className="list-decimal pl-[2.5cm]">
                        <li className="mb-2">
                            Com os provedores de infraestrutura (Cloudflare e Google Firebase), que atuam
                            exclusivamente como Operadores de Dados, sob obrigação contratual de sigilo.
                        </li>
                        <li className="mb-2">
                            Com órgãos governamentais de educação, exclusivamente por meio de dados estatísticos
                            agregados e anonimizados — nunca dados individuais identificáveis — e somente após
                            a formalização de instrumento contratual de operação de dados, nos termos do Art. 39 da LGPD.
                        </li>
                        <li className="mb-2">
                            Mediante ordem judicial formal de autoridade competente.
                        </li>
                    </ol>

                    {/* ─── SEÇÃO 6 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">6. DIREITOS DOS TITULARES</h2>
                    <p className="indent-[1.25cm]">
                        Os alunos (representados por seus responsáveis) e demais usuários podem, a qualquer momento,
                        exercer os seguintes direitos previstos no Art. 18 da LGPD:
                    </p>
                    <ul className="list-disc pl-[2.5cm]">
                        <li className="mb-2">Confirmação da existência de tratamento de seus dados pessoais.</li>
                        <li className="mb-2">Acesso aos dados armazenados pelo sistema.</li>
                        <li className="mb-2">Correção de dados incompletos, inexatos ou desatualizados.</li>
                        <li className="mb-2">Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a LGPD.</li>
                        <li className="mb-2">Portabilidade dos dados para outra instituição, mediante requisição formal.</li>
                        {exigeConsentimento && (
                            <li className="mb-2">Revogação do consentimento dado anteriormente, sem prejuízo da licitude do tratamento realizado antes da revogação.</li>
                        )}
                        <li className="mb-2">Informação sobre com quem os dados pessoais são compartilhados.</li>
                        <li className="mb-2">
                            Petição à Autoridade Nacional de Proteção de Dados (ANPD), nos termos do Art. 18,
                            VIII da LGPD, caso a solicitação não seja atendida pelo Controlador no prazo legal
                            de 15 (quinze) dias úteis.
                        </li>
                    </ul>
                    <p className="indent-[1.25cm]">
                        As solicitações serão respondidas em até 15 (quinze) dias úteis, conforme o §3º do
                        Art. 18 da LGPD.
                    </p>
                    <p className="indent-[1.25cm]">
                        Para exercer seus direitos, acesse o Portal do Titular:{' '}
                        {slugEscola ? (
                            <span
                                className="font-bold text-blue-600 underline cursor-pointer ml-1"
                                onClick={() => navegar(`/${slugEscola}/responsavel`)}
                            >
                                Acessar o Portal do Responsável
                            </span>
                        ) : (
                            <span className="font-bold ml-1">Para usuários escolares, acesse a URL específica da sua escola.</span>
                        )}
                    </p>

                    {/* ─── SEÇÃO 7 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">7. CONTATO DO ENCARREGADO DE DADOS (DPO)</h2>
                    <p className="indent-[1.25cm]">
                        O Encarregado de Dados (DPO — Data Protection Officer) é o responsável por receber
                        solicitações, dúvidas e reclamações relacionadas ao tratamento de dados pessoais,
                        conforme prevê o Art. 41 da LGPD.
                    </p>
                    <p className="indent-[1.25cm]">
                        <strong>Encarregado(a):</strong> {nomeEncarregadoDPO}
                        {emailEncarregadoDPO && (
                            <span><br /><strong>E-mail:</strong> {emailEncarregadoDPO}</span>
                        )}
                    </p>
                    {!emailEncarregadoDPO && daEscola && (
                        <p className="indent-[1.25cm]">
                            Para exercer seus direitos, compareça presencialmente à secretaria
                            do <strong>{nomeEscola}</strong> com documento de identificação com foto e solicite
                            a abertura de "Chamado — Direitos do Titular".
                        </p>
                    )}

                    {/* ─── SEÇÃO 8 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">8. INCIDENTE DE SEGURANÇA</h2>
                    <p className="indent-[1.25cm]">
                        Em caso de vazamento ou acesso não autorizado a dados pessoais, os titulares afetados
                        serão notificados de forma clara e tempestiva, com informações sobre quais dados foram
                        comprometidos e quais medidas foram adotadas.
                    </p>
                    <p className="indent-[1.25cm]">
                        A Autoridade Nacional de Proteção de Dados (ANPD) será notificada em até 72 horas
                        após a constatação do incidente, conforme o Art. 48 da LGPD.
                    </p>
                    <p className="indent-[1.25cm]">
                        As medidas de segurança técnicas e administrativas adotadas em conformidade com o
                        Art. 46 da LGPD incluem: autenticação via Google OAuth, criptografia dos dados em
                        repouso (AES-256) e em trânsito (TLS 1.2+), controle de acesso por perfil de usuário
                        e monitoramento de acessos suspeitos.
                    </p>
                    <p className="indent-[1.25cm]">
                        Por tratar-se de sistema desenvolvido e mantido por desenvolvedor independente,
                        o <strong>{nomeFornecedor}</strong> compromete-se a agir com diligência máxima dentro
                        de suas capacidades técnicas e a comunicar incidentes com total transparência,
                        sem omissão de informações relevantes aos titulares e à ANPD.
                    </p>

                    {/* Rodapé do documento */}
                    <div className="mt-16 text-center border-t border-slate-200 pt-8">
                        <p className="font-bold uppercase">Lei nº 13.709/2018 — LGPD (BR)</p>
                        <p className="text-slate-500 mt-2">Última revisão: {dataUltimaRevisao}.</p>
                    </div>

                </div>
            </div>
        </div>
    );
}