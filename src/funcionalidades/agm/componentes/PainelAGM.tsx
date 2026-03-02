export default function PainelAGM() {
    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex flex-col gap-1 bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-sm">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Infrastructure Master</p>
                <h2 className="text-2xl font-bold text-white">Painel de Controle Mestre</h2>
                <p className="text-slate-400 text-sm mt-1">Visão global e telemetria da infraestrutura Multi-tenant <strong>SCAE Intelligence</strong>.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm group hover:border-slate-600 transition-colors">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Unidades Ativas</h3>
                    <p className="text-4xl font-bold text-white group-hover:text-indigo-400 transition-colors">0</p>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-medium text-emerald-400">Sincronizado</span>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm group hover:border-slate-600 transition-colors">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Operadores Globais</h3>
                    <p className="text-4xl font-bold text-white group-hover:text-indigo-400 transition-colors">0</p>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-xs font-medium text-indigo-400">Base Consolidada</span>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm group hover:border-rose-900 transition-colors">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Eventos Críticos (24h)</h3>
                    <p className="text-4xl font-bold text-white group-hover:text-rose-400 transition-colors">0</p>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                        <span className="text-xs font-medium text-slate-500">Zero Ocorrências</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
