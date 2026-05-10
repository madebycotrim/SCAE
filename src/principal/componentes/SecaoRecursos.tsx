import { motion, Variants } from 'framer-motion';
import { ArrowRight, Users, WifiOff, Palette, ShieldCheck } from 'lucide-react';

interface Props {
    temaEscuro: boolean;
    aoAbrirModalSobre: () => void;
}

/**
 * Seção de cards com os principais recursos e funcionalidades do sistema com animações.
 */
export const SecaoRecursos = ({ temaEscuro, aoAbrirModalSobre }: Props) => {
    const recursos = [
        {
            icone: <Users className="w-7 h-7" />,
            titulo: 'Acesso Versátil',
            descricao: 'Escolha o método ideal para sua infraestrutura: reconhecimento biométrico ou leitura instantânea de QR Code.',
            estiloIcone: temaEscuro ? 'bg-eletrico/10 text-eletrico' : 'bg-blue-50 text-eletrico'
        },
        {
            icone: <WifiOff className="w-7 h-7" />,
            titulo: 'Totalmente Offline',
            descricao: 'A operação no portão nunca para. O sistema registra tudo localmente e sincroniza quando a rede retorna.',
            estiloIcone: temaEscuro ? 'bg-marinho/50 text-blue-300' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-eletrico'
        },
        {
            icone: <Palette className="w-7 h-7" />,
            titulo: 'Personalização White-label',
            descricao: 'URL exclusiva, cores personalizadas e a marca da sua escola presente em todos os pontos de contato.',
            estiloIcone: temaEscuro ? 'bg-eletrico/20 text-eletrico' : 'bg-eletrico/10 text-eletrico'
        },
        {
            icone: <ShieldCheck className="w-7 h-7" />,
            titulo: 'Privacidade Blindada',
            descricao: 'Os dados de identificação são processados de forma privada, garantindo conformidade total com a LGPD.',
            estiloIcone: temaEscuro ? 'bg-eletrico/20 text-eletrico' : 'bg-eletrico/10 text-eletrico'
        }
    ];

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, scale: 0.9, y: 30 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
    };

    return (
        <section className={`relative z-20 w-full py-24 ${temaEscuro ? 'bg-[#080C16]' : 'bg-white'}`}>
            <div className="max-w-6xl mx-auto px-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className={`text-4xl md:text-5xl font-extrabold mb-4 tracking-tight ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                        Infraestrutura de alta performance
                    </h2>
                    <p className={`text-lg max-w-2xl mx-auto font-medium ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                        Uma solução robusta desenhada para atender as demandas críticas de segurança e monitoramento das escolas mais exigentes
                    </p>
                </motion.div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
                >
                    {recursos.map((recurso, index) => (
                        <motion.div 
                            key={index}
                            variants={itemVariants}
                            className={`p-8 rounded-[2rem] border transition-all duration-500 group ${temaEscuro ? 'bg-marinho/30 border-slate-800/60 hover:border-eletrico/40 hover:bg-marinho/40' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-premium'}`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 ${recurso.estiloIcone}`}>
                                {recurso.icone}
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${temaEscuro ? 'text-slate-200' : 'text-slate-900'}`}>{recurso.titulo}</h3>
                            <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>{recurso.descricao}</p>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <button
                        onClick={aoAbrirModalSobre}
                        className={`group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-sm transition-all hover:scale-105 ${temaEscuro
                            ? 'bg-eletrico/90 text-white hover:bg-eletrico shadow-suave'
                            : 'bg-eletrico text-white hover:bg-eletrico/90 shadow-suave'
                            }`}
                    >
                        Explorar todas as funcionalidades
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </motion.div>
            </div>
        </section>
    );
};

