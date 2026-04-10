import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usarEscolaOpcional } from '@/escola/ProvedorEscola';
import { usarConteudoLegal } from '@/funcionalidades/usuarios/hooks/usarConteudoLegal';
import { Botao } from '@/compartilhado/componentes/UI';
import { motion } from 'framer-motion';

/**
 * Página pública de Política de Privacidade.
 * Documento alinhado à LGPD (Lei nº 13.709/2018), formatado em ABNT,
 * desenvolvido por estudante universitário — pessoa física, sem fins lucrativos.
 */
export default function PoliticaPrivacidade() {
    const navegar = useNavigate();
    const escola = usarEscolaOpcional();
    const nomeEscola = escola?.nomeEscola || 'Desenvolvedor Catraki';
    const nomeAmigavel = escola?.nomeEscola || 'Catraki';
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
            {/* Header Funcional - Alinhado a h-18 (72px) */}
            <header className="h-[72px] bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
                <div className="max-w-5xl h-full mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
                            <ShieldCheck className="text-emerald-600 w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-800 tracking-tight uppercase">Política de Privacidade</h1>
                            {daEscola && <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mt-1">{nomeAmigavel}</p>}
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
                        )} como os dados pessoais de alunos e colaboradores são coletados,
                        tratados e protegidos pela plataforma Catraki, operada tecnicamente por <strong>{nomeFornecedor}</strong> (Operador
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
                            <strong>Nome completo</strong> — Finalidade: identificação legível do aluno nos relatórios gerados para a gestão escolar.
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
                            <strong>Método de leitura (Biometria, QR Code ou manual)</strong> — Finalidade: auditoria e rastreabilidade do registro, permitindo identificar a origem de cada leitura realizada.
                        </li>
                        <li className="mb-2">
                            <strong>Template Biométrico (Impressão Digital)</strong> — Finalidade: identificação única e segura do aluno. Nota: O sistema armazena apenas representações matemáticas (hashes) da digital, sendo tecnicamente impossível reconstruir a imagem real a partir desses dados.
                        </li>
                    </ul>

                    <p className="indent-[1.25cm] font-bold mt-4">
                        O sistema NÃO coleta, em hipótese alguma, os seguintes dados: fotografia do rosto ou imagem real da digital;
                        número de telefone; CPF; endereço residencial; localização GPS; dados de saúde; dados bancários ou financeiros; nem qualquer
                        outro dado além dos expressamente listados acima.
                    </p>

                    {/* ─── SEÇÃO 2 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">2. DAS BASES LEGAIS</h2>
                    <p className="indent-[1.25cm]">
                        O tratamento de dados realizado por este sistema segue a Política de Privacidade do Catraki,
                        baseado nas seguintes hipóteses legais previstas na LGPD:
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
                    </ul>
                    <p className="indent-[1.25cm]">
                        Após o prazo aplicável, os dados são anonimizados de forma irreversível, conforme o Art. 16
                        da LGPD. Apenas estatísticas agregadas, sem identificação individual, são mantidas para fins
                        de histórico escolar.
                    </p>

                    {/* ─── SEÇÃO 4 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">4. INFRAESTRUTURA E SEGURANÇA NO EDGE</h2>
                    <p className="indent-[1.25cm]">
                        O sistema utiliza arquitetura de <strong>Processamento de Borda (Edge Computing)</strong>. Isso significa que os dados biométricos
                        mais sensíveis permanecem armazenados localmente no hardware da escola através do <strong>Catraki Edge Agent</strong>, protegidos por banco de dados cifrado (SQLCipher AES-256).
                    </p>
                    <p className="indent-[1.25cm]">
                        A sincronização de nuvem para gestão administrativa é realizada via <strong>Cloudflare Workers e D1 SQL</strong>, utilizando túneis de segurança criptografados.
                        Todas as informações em trânsito são protegidas por protocolos TLS 1.3 de última geração.
                    </p>
                    <p className="indent-[1.25cm]">
                        O sistema é projetado para minimizar o tráfego internacional de dados, utilizando as
                        regiões de disponibilidade mais próximas à jurisdição brasileira. Os dados pessoais
                        não são comercializados com terceiros em nenhuma hipótese.
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
                            Com os provedores de infraestrutura (Cloudflare), que atuam
                            exclusivamente como Operadores de Dados, sob obrigação contratual de sigilo.
                        </li>
                        <li className="mb-2">
                            Com órgãos governamentais de educação, exclusivamente por meio de dados estatísticos
                            agregados e anonimizados — nunca dados individuais identificáveis.
                        </li>
                        <li className="mb-2">
                            Mediante ordem judicial formal de autoridade competente.
                        </li>
                    </ol>

                    {/* ─── SEÇÃO 6 ─── */}
                    <h2 className="font-bold uppercase mt-8 mb-4 text-[12pt]">6. DIREITOS DOS TITULARES</h2>
                    <p className="indent-[1.25cm]">
                        Os alunos e demais usuários podem, a qualquer momento,
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
                        Art. 18 da LGPD. Para exercer seus direitos, compareça à secretaria da escola.
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
            </motion.div>
        </div>
    );
}
