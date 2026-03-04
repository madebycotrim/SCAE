import { motion } from 'framer-motion';

interface PainelMockupProps {
    temaEscuro: boolean;
}

export function PainelMockup({ temaEscuro }: PainelMockupProps) {
    return (
        <>
            {/* =========================================
                DESKTOP VIEW (Fake Browser Dashboard)
               ========================================= */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                className="mt-24 w-full max-w-5xl mx-auto relative z-30 hidden sm:block"
            >
                <motion.div
                    initial={{ rotateX: 15, scale: 0.95 }}
                    animate={{ rotateX: 0, scale: 1 }}
                    transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                    style={{ perspective: 1200 }}
                >
                    <div className={`w-full rounded-2xl border overflow-hidden shadow-2xl transition-all duration-500 ${temaEscuro ? 'bg-[#111827] border-slate-700/80 shadow-[0_20px_50px_rgb(0,0,0,0.5)] shadow-indigo-500/10' : 'bg-white border-slate-200 shadow-[0_20px_50px_rgb(0,0,0,0.1)]'}`}>
                        {/* Fake Browser/Header */}
                        <div className={`w-full h-12 flex items-center px-4 gap-2 border-b ${temaEscuro ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                            </div>
                            <div className={`mx-auto h-6 px-12 rounded-md flex items-center justify-center text-xs font-semibold ${temaEscuro ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400'}`}>
                                scae.com.br/painel
                            </div>
                        </div>
                        {/* Fake App Body */}
                        <div className="p-6 flex gap-6 h-[420px]">
                            {/* Sidebar Mock */}
                            <div className={`w-48 rounded-xl flex flex-col gap-3 p-4 hidden md:flex ${temaEscuro ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                <div className={`h-10 rounded-lg flex items-center px-3 gap-3 ${temaEscuro ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                    <div className="w-4 h-4 rounded bg-current opacity-80"></div>
                                    <div className="h-2 w-16 bg-current rounded opacity-80"></div>
                                </div>
                                <div className={`h-8 rounded-lg flex items-center px-3 gap-3 ${temaEscuro ? 'text-slate-500 hover:bg-slate-700/50' : 'text-slate-400 hover:bg-slate-200/50'}`}>
                                    <div className="w-4 h-4 rounded bg-current opacity-60"></div>
                                    <div className="h-2 w-20 bg-current rounded opacity-60"></div>
                                </div>
                                <div className={`h-8 rounded-lg flex items-center px-3 gap-3 ${temaEscuro ? 'text-slate-500 hover:bg-slate-700/50' : 'text-slate-400 hover:bg-slate-200/50'}`}>
                                    <div className="w-4 h-4 rounded bg-current opacity-60"></div>
                                    <div className="h-2 w-16 bg-current rounded opacity-60"></div>
                                </div>
                            </div>
                            {/* Main Content Mock */}
                            <div className="flex-1 flex flex-col gap-6">
                                {/* Top Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className={`h-28 rounded-2xl p-5 flex flex-col justify-between border relative overflow-hidden group transition-all duration-500 ${temaEscuro ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]'}`}>
                                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-all duration-700 group-hover:scale-150 ${temaEscuro ? 'bg-emerald-500/10' : 'bg-emerald-500/5'}`}></div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider relative z-10 ${temaEscuro ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-500'}`}>Entradas Hoje</div>
                                        <div className="flex items-end gap-3 relative z-10">
                                            <div className={`text-4xl font-black tracking-tighter ${temaEscuro ? 'text-emerald-400' : 'text-emerald-500'}`}>450</div>
                                            <div className="flex -space-x-2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-2 group-hover:translate-y-0">
                                                {[1, 2].map(i => (
                                                    <div key={i} className={`w-5 h-5 rounded-full border-2 flex flex-col items-center justify-center text-[7px] font-bold overflow-hidden ${temaEscuro ? 'border-slate-800 bg-slate-700 text-slate-300' : 'border-white bg-slate-100 text-slate-500'}`}>
                                                        {String.fromCharCode(64 + i)}
                                                    </div>
                                                ))}
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${temaEscuro ? 'border-slate-800 bg-emerald-500/20 text-emerald-400' : 'border-white bg-emerald-50 text-emerald-600'}`}>
                                                    +
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-[10px] font-bold flex items-center gap-1.5 relative z-10 mt-1 transition-colors ${temaEscuro ? 'text-emerald-500/80 group-hover:text-emerald-400' : 'text-emerald-600/80 group-hover:text-emerald-600'}`}>
                                            <div className="flex h-1.5 w-1.5 relative">
                                                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
                                                <div className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></div>
                                            </div>
                                            <span>+12% no horário marcado</span>
                                        </div>
                                    </div>
                                    <div className={`h-28 rounded-2xl p-5 flex flex-col justify-between border relative overflow-hidden group transition-all duration-500 ${temaEscuro ? 'bg-slate-800/80 border-slate-700 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white border-slate-100 shadow-sm hover:border-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]'}`}>
                                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-all duration-700 group-hover:scale-150 ${temaEscuro ? 'bg-amber-500/10' : 'bg-amber-500/5'}`}></div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider relative z-10 ${temaEscuro ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-500'}`}>Atrasos Registrados</div>
                                        <div className={`text-4xl font-black tracking-tighter relative z-10 ${temaEscuro ? 'text-amber-400' : 'text-amber-500'}`}>12</div>
                                        <div className={`text-[11px] font-semibold flex items-center gap-1.5 relative z-10 mt-1 ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${temaEscuro ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${temaEscuro ? 'bg-amber-500' : 'bg-amber-500'}`}></div>
                                            </div>
                                            Pais notificados agora
                                        </div>
                                    </div>
                                    <div className={`h-28 rounded-2xl p-5 flex flex-col justify-between border relative overflow-hidden group transition-all duration-500 ${temaEscuro ? 'bg-slate-800/80 border-slate-700 hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.05)]'}`}>
                                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-all duration-700 group-hover:scale-150 ${temaEscuro ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`}></div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider relative z-10 ${temaEscuro ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-500'}`}>Capacidade Ocupada</div>
                                        <div className={`text-4xl font-black tracking-tighter relative z-10 ${temaEscuro ? 'text-indigo-400' : 'text-indigo-600'}`}>98%</div>
                                        <div className={`text-[10px] font-bold flex flex-col justify-center relative z-10 mt-1 ${temaEscuro ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                            <div className={`w-full h-1.5 rounded-full overflow-hidden mt-0.5 ${temaEscuro ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[98%] relative">
                                                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Chart Area */}
                                <div className={`flex-1 rounded-2xl border p-5 flex flex-col gap-4 relative overflow-hidden group transition-all duration-500 ${temaEscuro ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]' : 'bg-white border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-[0_0_30px_rgba(99,102,241,0.05)]'}`}>
                                    <div className={`absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[150%] h-[150%] rounded-full blur-[100px] transition-opacity duration-1000 opacity-0 group-hover:opacity-100 pointer-events-none ${temaEscuro ? 'bg-indigo-500/5' : 'bg-indigo-500/5'}`}></div>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className={`text-[13px] font-extrabold tracking-wide uppercase ${temaEscuro ? 'text-slate-300' : 'text-slate-700'}`}>Fluxo de Acesso: Últimos 7 Dias</div>
                                        <div className="flex gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${temaEscuro ? 'bg-indigo-500' : 'bg-indigo-500'}`}></div>
                                            <div className={`w-1.5 h-1.5 rounded-full ${temaEscuro ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                                            <div className={`w-1.5 h-1.5 rounded-full ${temaEscuro ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                                        </div>
                                    </div>
                                    {/* Bar Chart Simulation */}
                                    <div className="flex-1 flex items-end justify-between gap-1.5 sm:gap-3 pt-2 relative z-10 pb-1">
                                        {[40, 70, 45, 95, 65, 30, 80].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-2.5 group/bar cursor-default h-full justify-end">
                                                <div
                                                    className={`w-full max-w-[40px] rounded-t-lg transition-all duration-700 ease-out relative overflow-hidden ${temaEscuro ? 'bg-indigo-500/40 group-hover/bar:bg-indigo-400 group-hover/bar:shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-indigo-200 group-hover/bar:bg-indigo-500 group-hover/bar:shadow-[0_0_15px_rgba(99,102,241,0.4)]'}`}
                                                    style={{ height: `${h}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/30 opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                                                    {i === 3 && (
                                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/20 blur-sm pointer-events-none"></div>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] font-bold transition-colors ${temaEscuro ? 'text-slate-500 group-hover/bar:text-slate-300' : 'text-slate-400 group-hover/bar:text-slate-700'}`}>
                                                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][i]}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* =========================================
                MOBILE VIEW (Fake iPhone Layout)
               ========================================= */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                className="mt-16 w-full max-w-[280px] mx-auto relative z-30 sm:hidden"
            >
                <div className={`w-full rounded-[2.5rem] border-[8px] p-3 shadow-2xl relative overflow-hidden transition-all duration-500 ${temaEscuro ? 'bg-[#0B0F19] border-slate-800 shadow-[0_20px_50px_rgb(0,0,0,0.5)] shadow-indigo-500/10' : 'bg-slate-50 border-slate-800 shadow-[0_20px_50px_rgb(0,0,0,0.2)]'}`}>

                    {/* iPhone Notch/Island */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-current rounded-b-2xl z-20 flex justify-center items-end pb-1.5 gap-2" style={{ color: temaEscuro ? '#1e293b' : '#0f172a' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800/50"></div>
                        <div className="w-10 h-1.5 rounded-full bg-slate-800/50"></div>
                    </div>

                    {/* App Header Mobile */}
                    <div className="pt-6 pb-4 flex justify-between items-center px-1">
                        <div>
                            <div className={`text-xs font-bold ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Visão Geral</div>
                            <div className={`text-xl font-black ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>Hoje</div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${temaEscuro ? 'bg-slate-800 text-indigo-400' : 'bg-white shadow-sm text-indigo-600'}`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        </div>
                    </div>

                    {/* Mobile Stats Stack */}
                    <div className="flex flex-col gap-3">
                        {/* Entradas Card */}
                        <div className={`rounded-2xl p-4 flex flex-col justify-between border relative overflow-hidden ${temaEscuro ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl ${temaEscuro ? 'bg-emerald-500/10' : 'bg-emerald-500/5'}`}></div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}>Entradas Registradas</div>
                            <div className="flex items-end justify-between mt-2">
                                <div className={`text-4xl font-black tracking-tighter ${temaEscuro ? 'text-emerald-400' : 'text-emerald-500'}`}>450</div>
                                <div className={`text-[10px] font-bold py-1 px-2 rounded-lg ${temaEscuro ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                    +12% hoje
                                </div>
                            </div>
                        </div>

                        {/* Atrasos e Ocupação Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-xl p-3 flex flex-col justify-between border relative overflow-hidden ${temaEscuro ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-xl ${temaEscuro ? 'bg-amber-500/10' : 'bg-amber-500/5'}`}></div>
                                <div className={`text-[9px] font-bold uppercase tracking-wider ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}>Atrasos</div>
                                <div className={`text-2xl font-black tracking-tighter mt-1 ${temaEscuro ? 'text-amber-400' : 'text-amber-500'}`}>12</div>
                            </div>

                            <div className={`rounded-xl p-3 flex flex-col justify-between border relative overflow-hidden ${temaEscuro ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-xl ${temaEscuro ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`}></div>
                                <div className={`text-[9px] font-bold uppercase tracking-wider ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}>Ocupação</div>
                                <div className={`text-2xl font-black tracking-tighter mt-1 ${temaEscuro ? 'text-indigo-400' : 'text-indigo-600'}`}>98%</div>
                                <div className={`w-full h-1 rounded-full overflow-hidden mt-1.5 ${temaEscuro ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                                    <div className="h-full bg-indigo-500 w-[98%]"></div>
                                </div>
                            </div>
                        </div>

                        {/* Tiny Chart */}
                        <div className={`rounded-2xl border p-4 flex flex-col gap-3 relative overflow-hidden h-32 ${temaEscuro ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>Fluxo Semanal</div>
                            <div className="flex-1 flex items-end justify-between gap-1 pt-1">
                                {[40, 70, 45, 95, 65, 30, 80].map((h, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                                        <div
                                            className={`w-full rounded-t-sm transition-all duration-700 relative overflow-hidden ${temaEscuro ? 'bg-indigo-500/40' : 'bg-indigo-200'}`}
                                            style={{ height: `${h}%` }}
                                        ></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Nav Bar Fake */}
                    <div className={`mt-4 pt-2 pb-1 border-t flex justify-around ${temaEscuro ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                        <div className={`w-5 h-5 rounded ${temaEscuro ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}></div>
                        <div className="w-5 h-5 rounded bg-current opacity-40"></div>
                        <div className="w-5 h-5 rounded bg-current opacity-40"></div>
                        <div className="w-5 h-5 rounded bg-current opacity-40"></div>
                    </div>

                </div>
            </motion.div>
        </>
    );
}

