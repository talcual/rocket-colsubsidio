interface ModeSelectorPageProps {
  onSelectBackoffice: () => void;
  onSelectExternal: () => void;
}

export default function ModeSelectorPage({
  onSelectBackoffice,
  onSelectExternal,
}: ModeSelectorPageProps) {
  return (
    <div className="min-h-screen ambient-bg text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="mb-10 flex items-center justify-between rounded-3xl border border-white/60 bg-white/70 p-5 shadow-xl backdrop-blur-md">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Rocket Colsubsidio</p>
            <h1 className="text-2xl font-display text-slate-900 md:text-3xl">Centro de Inventario</h1>
          </div>
          <span className="rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-700">
            Plataforma unificada
          </span>
        </header>

        <main className="grid flex-1 gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={onSelectBackoffice}
            className="group rounded-3xl border border-teal-200 bg-white p-8 text-left shadow-lg transition-transform hover:-translate-y-1 hover:shadow-2xl"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-teal-700">Ambiente Interno</p>
            <h2 className="mb-2 font-display text-3xl text-slate-900">Backoffice Auditor</h2>
            <p className="mb-6 text-slate-600">
              Monitorea sesiones, cruza conteos con ERP y revisa tendencias de consumo.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
              Ingresar al backoffice
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectExternal}
            className="group rounded-3xl border border-sky-200 bg-white p-8 text-left shadow-lg transition-transform hover:-translate-y-1 hover:shadow-2xl"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-sky-700">Ambiente Operativo</p>
            <h2 className="mb-2 font-display text-3xl text-slate-900">Vista Externa</h2>
            <p className="mb-6 text-slate-600">
              Flujo rápido para operarios: autenticación, apertura de sesión y captura de inventario.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white">
              Iniciar operación
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>
        </main>
      </div>
    </div>
  );
}
