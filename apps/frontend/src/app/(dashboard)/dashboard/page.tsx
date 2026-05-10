export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Bem-vindo ao PanificaPro</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Pedidos de Hoje', value: '24', color: 'bg-blue-500' },
          { label: 'Produção em Andamento', value: '12', color: 'bg-amber-500' },
          { label: 'Alertas de Estoque', value: '3', color: 'bg-red-500' },
          { label: 'Vendas (Hoje)', value: 'R$ 1.250', color: 'bg-green-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`w-2 h-12 rounded-full ${stat.color}`} />
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Visão Geral</h2>
        <div className="h-64 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
          Gráficos de evolução serão exibidos aqui.
        </div>
      </div>
    </div>
  );
}
