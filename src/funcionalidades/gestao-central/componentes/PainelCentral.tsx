import { Building2, Users, AlertOctagon, Activity, Server, Zap } from 'lucide-react';
import { CartaoConteudo } from '@compartilhado/componentes/UI';

export default function PainelCentral() {
    return (
        <div className="space-y-10 animate-fade-in pb-12">
            {/* Header de Telemetria */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 shadow-xl">
                        <Activity size={32} className="animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1.5">Hypervisor Monitoring</p>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Infraestrutura SCAE Core</h2>
                        <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-wider">Telemetria Global em Tempo Real • Nodes Ativos: 2</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="px-6 py-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status do Registro</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Operacional</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Grid de Métricas Master */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MetricCard
                    label="Unidades Ativas"
                    valor="0"
                    sub="Clusters Federados"
                    icone={Building2}
                    cor="indigo"
                />
                <MetricCard
                    label="Contas Master"
                    valor="0"
                    sub="Operadores com Root"
                    icone={Users}
                    cor="blue"
                />
                <MetricCard
                    label="Incidentes (24h)"
                    valor="0"
                    sub="Nenhum Evento Crítico"
                    icone={AlertOctagon}
                    cor="rose"
                />
            </div>

            {/* Seção de Status dos Serviços de Infra */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CartaoConteudo className="bg-slate-900 border-slate-800 p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <Server size={18} className="text-indigo-400" /> Back-end Nodes
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">v2.4.0-stable</span>
                    </div>
                    <div className="space-y-6">
                        <StatusItem label="API Gateway (Cloudflare)" status="Online" latency="12ms" />
                        <StatusItem label="Database Cluster (D1)" status="Online" latency="8ms" />
                        <StatusItem label="Auth Sovereign (Firebase)" status="Online" latency="45ms" />
                    </div>
                </CartaoConteudo>

                <CartaoConteudo className="bg-slate-900 border-slate-800 p-8 outline outline-1 outline-indigo-500/10">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                            <Zap size={18} className="text-amber-400" /> Performance Global
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-emerald-400">99.9% Uptime</span>
                    </div>
                    <div className="h-32 flex items-end gap-1.5">
                        {/* Mock de visual de performance */}
                        {[40, 60, 45, 70, 50, 80, 55, 90, 65, 85, 40, 60, 50, 75].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-indigo-500/20 rounded-t-sm hover:bg-indigo-500/40 transition-colors"
                                style={{ height: `${h}%` }}
                            ></div>
                        ))}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-6 text-center">Throughput de eventos em tempo real</p>
                </CartaoConteudo>
            </div>
        </div>
    );
}

function MetricCard({ label, valor, sub, icone: Icone, cor }: { label: string, valor: string, sub: string, icone: any, cor: 'indigo' | 'blue' | 'rose' }) {
    const colorMap = {
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-900/10',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-900/10',
        rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-900/10'
    };

    return (
        <CartaoConteudo className={`bg-slate-900 border-slate-800 p-8 group hover:border-slate-700 transition-all active:scale-[0.99] shadow-2xl`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-xl border ${colorMap[cor]} shadow-lg`}>
                    <Icone size={24} />
                </div>
            </div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</h3>
            <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black text-white tracking-tighter group-hover:text-indigo-400 transition-colors">{valor}</p>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-4 uppercase tracking-widest">{sub}</p>
        </CartaoConteudo>
    );
}

function StatusItem({ label, status, latency }: { label: string, status: string, latency: string }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{label}</span>
            <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono font-bold text-slate-500">{latency}</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{status}</span>
            </div>
        </div>
    );
}
