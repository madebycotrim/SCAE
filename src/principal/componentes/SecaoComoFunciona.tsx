import { motion, Variants } from 'framer-motion';
import { Users, Zap, Smartphone } from 'lucide-react';

interface Props {
    temaEscuro: boolean;
}

/**
 * Seção explicativa dos 3 passos do funcionamento do sistema com animações de revelação.
 */
export const SecaoComoFunciona = ({ temaEscuro }: Props) => {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
    };

    return (
        <section className={`relative z-20 w-full py-24 ${temaEscuro ? 'bg-[#050A1A]/90' : 'bg-[#F8FAFC] border-y border-slate-100'}`}>
            <div className="max-w-7xl mx-auto px-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className={`text-4xl md:text-5xl font-extrabold mb-4 tracking-tight ${temaEscuro ? 'text-white' : 'text-[#0d1f3c]'}`}>
                        Tecnologia a favor da fluidez
                    </h2>
                    <p className={`text-lg max-w-2xl mx-auto font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                        Do portão ao painel administrativo — segurança total sem gerar filas
                    </p>
                </motion.div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="relative grid grid-cols-1 md:grid-cols-3 gap-12"
                >
                    {/* Linha Conectora (Desktop) */}
                    <div className={`hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] ${temaEscuro ? 'bg-eletrico/20' : 'bg-eletrico/10'} z-0`}></div>

                    {/* Passo 1 */}
                    <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center group cursor-default">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 shadow-xl ${temaEscuro ? 'bg-slate-800 text-eletrico border border-slate-700' : 'bg-white text-[#2b59ff] border border-slate-100 group-hover:border-eletrico/30'}`}>
                            <Users className="w-9 h-9" />
                        </div>
                        <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-[#0d1f3c]'}`}><span className="text-eletrico">1.</span> Identificação Ágil</h3>
                        <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                            O aluno utiliza <strong>Biometria</strong> ou <strong>QR Code</strong> no terminal de acesso. Reconhecimento instantâneo que elimina gargalos na entrada
                        </p>
                    </motion.div>

                    {/* Passo 2 */}
                    <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center group cursor-default">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 shadow-xl ${temaEscuro ? 'bg-slate-800 text-eletrico border border-slate-700' : 'bg-white text-[#2b59ff] border border-slate-100 group-hover:border-eletrico/30'}`}>
                            <Zap className="w-9 h-9" />
                        </div>
                        <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-[#0d1f3c]'}`}><span className="text-eletrico">2.</span> Validação Instantânea</h3>
                        <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                            Nossa tecnologia de borda processa os dados localmente em milissegundos. Segurança máxima com tempo de resposta imperceptível
                        </p>
                    </motion.div>

                    {/* Passo 3 */}
                    <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center group cursor-default">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 shadow-xl ${temaEscuro ? 'bg-slate-800 text-eletrico border border-slate-700' : 'bg-white text-[#2b59ff] border border-slate-100 group-hover:border-eletrico/30'}`}>
                            <Smartphone className="w-9 h-9" />
                        </div>
                        <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-[#0d1f3c]'}`}><span className="text-eletrico">3.</span> Monitoramento Vivo</h3>
                        <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                            Acompanhe cada entrada através do painel administrativo em tempo real. Gestão transparente e dados precisos na palma da sua mão
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};


