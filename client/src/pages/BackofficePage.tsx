import { useCallback, useEffect, useMemo, useState } from 'react';
import { auditApi, sessionApi } from '../utils/api';
import type { AnalyticsData, AuditResult, CountSession } from '../types';

interface BackofficePageProps {
  onBack: () => void;
}

type BackofficeTab = 'overview' | 'audit';

export default function BackofficePage({ onBack }: BackofficePageProps) {
  const [tab, setTab] = useState<BackofficeTab>('overview');
  const [sessions, setSessions] = useState<CountSession[]>([]);
  const [auditDate, setAuditDate] = useState(new Date().toISOString().substring(0, 10));
  const [auditData, setAuditData] = useState<AuditResult | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [allSessions, analytics] = await Promise.all([
        sessionApi.list(),
        auditApi.getAnalytics(30),
      ]);
      setSessions(allSessions);
      setAnalyticsData(analytics);
    } catch {
      setError('No se pudo cargar la información del backoffice.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const audit = await auditApi.getAudit({ date: auditDate });
      setAuditData(audit);
    } catch {
      setError('No se pudo cargar la auditoría para la fecha seleccionada.');
    } finally {
      setLoading(false);
    }
  }, [auditDate]);

  useEffect(() => {
    if (tab === 'overview') {
      void loadOverview();
      return;
    }
    void loadAudit();
  }, [loadAudit, loadOverview, tab]);

  const openCount = useMemo(
    () => sessions.filter((session) => session.status === 'open').length,
    [sessions],
  );
  const closedCount = useMemo(
    () => sessions.filter((session) => session.status === 'closed').length,
    [sessions],
  );

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100 md:px-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">Zona Interna</p>
              <h1 className="font-display text-3xl text-white">Backoffice de Auditoría</h1>
              <p className="text-sm text-slate-400">Supervisión consolidada de conteos y diferencias ERP.</p>
            </div>
            <button onClick={onBack} className="btn-secondary">
              Cambiar ambiente
            </button>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setTab('overview')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === 'overview' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-200'
              }`}
            >
              Resumen operativo
            </button>
            <button
              onClick={() => setTab('audit')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === 'audit' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-200'
              }`}
            >
              Auditoría diaria
            </button>
          </div>
        </header>

        {error && <div className="rounded-2xl border border-rose-700 bg-rose-900/50 p-4 text-rose-100">{error}</div>}

        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
            Cargando datos del backoffice...
          </div>
        )}

        {!loading && tab === 'overview' && (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <article className="rounded-2xl border border-cyan-700/40 bg-cyan-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Sesiones</p>
                <p className="mt-2 text-3xl font-bold text-cyan-100">{sessions.length}</p>
                <p className="text-xs text-cyan-200/80">Total registradas</p>
              </article>
              <article className="rounded-2xl border border-emerald-700/40 bg-emerald-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Abiertas</p>
                <p className="mt-2 text-3xl font-bold text-emerald-100">{openCount}</p>
                <p className="text-xs text-emerald-200/80">Requieren seguimiento</p>
              </article>
              <article className="rounded-2xl border border-indigo-700/40 bg-indigo-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Cerradas</p>
                <p className="mt-2 text-3xl font-bold text-indigo-100">{closedCount}</p>
                <p className="text-xs text-indigo-200/80">Listas para auditoría</p>
              </article>
              <article className="rounded-2xl border border-amber-700/40 bg-amber-300/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Top producto</p>
                <p className="mt-2 truncate text-lg font-semibold text-amber-100">
                  {analyticsData?.topProducts[0]?.product_name || 'Sin datos'}
                </p>
                <p className="text-xs text-amber-200/80">Mayor consumo 30 días</p>
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Sesiones recientes
                </h2>
                <div className="space-y-2">
                  {sessions.slice(0, 8).map((session) => (
                    <div key={session.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-100">#{session.id} · {session.location}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            session.status === 'open'
                              ? 'bg-emerald-400/20 text-emerald-200'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{session.employee_name} · items: {session.item_count || 0}</p>
                    </div>
                  ))}
                  {sessions.length === 0 && <p className="text-sm text-slate-400">No hay sesiones registradas.</p>}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Métodos de entrada
                </h2>
                <div className="space-y-2">
                  {(analyticsData?.inputMethodStats || []).map((stat) => (
                    <div key={stat.input_method} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center justify-between">
                        <p className="capitalize text-slate-200">{stat.input_method}</p>
                        <p className="text-xl font-bold text-cyan-200">{stat.count}</p>
                      </div>
                    </div>
                  ))}
                  {(analyticsData?.inputMethodStats.length || 0) === 0 && (
                    <p className="text-sm text-slate-400">No hay estadísticas de entrada disponibles.</p>
                  )}
                </div>
              </article>
            </div>
          </section>
        )}

        {!loading && tab === 'audit' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <label className="mb-2 block text-sm text-slate-300">Fecha para auditoría</label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={auditDate}
                  onChange={(event) => setAuditDate(event.target.value)}
                  className="input-field max-w-xs bg-slate-950 text-slate-100"
                />
                <button onClick={loadAudit} className="btn-primary">
                  Consultar
                </button>
              </div>
            </div>

            {auditData?.summary && (
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</p>
                  <p className="text-3xl font-bold text-white">{auditData.summary.total}</p>
                </div>
                <div className="rounded-2xl border border-emerald-700/40 bg-emerald-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Coincide</p>
                  <p className="text-3xl font-bold text-emerald-100">{auditData.summary.match}</p>
                </div>
                <div className="rounded-2xl border border-amber-700/40 bg-amber-300/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Exceso</p>
                  <p className="text-3xl font-bold text-amber-100">{auditData.summary.surplus}</p>
                </div>
                <div className="rounded-2xl border border-rose-700/40 bg-rose-300/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-rose-200">Faltante</p>
                  <p className="text-3xl font-bold text-rose-100">{auditData.summary.deficit}</p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Resultado de comparación
              </h2>
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {(auditData?.comparison || []).map((row) => (
                  <div key={row.product_code} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-cyan-200">{row.product_code}</p>
                        <p className="text-sm text-slate-200">{row.product_name}</p>
                        <p className="text-xs text-slate-500">
                          ERP {row.expected_quantity.toFixed(2)} {row.unit} · Conteo {row.counted_quantity.toFixed(2)} {row.unit}
                        </p>
                      </div>
                      <p
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.status === 'match'
                            ? 'bg-emerald-400/20 text-emerald-200'
                            : row.status === 'surplus'
                              ? 'bg-amber-400/20 text-amber-200'
                              : 'bg-rose-400/20 text-rose-200'
                        }`}
                      >
                        {row.status} ({row.difference > 0 ? '+' : ''}{row.difference.toFixed(2)})
                      </p>
                    </div>
                  </div>
                ))}
                {(auditData?.comparison.length || 0) === 0 && (
                  <p className="text-sm text-slate-400">No hay datos para la fecha seleccionada.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
