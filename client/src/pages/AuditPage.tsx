import { useState, useEffect, useCallback } from 'react';
import { auditApi } from '../utils/api';
import type { AuditResult, AuditComparison, AnalyticsData } from '../types';

interface AuditPageProps {
  onBack: () => void;
}

export default function AuditPage({ onBack }: AuditPageProps) {
  const [tab, setTab] = useState<'audit' | 'analytics'>('audit');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [auditData, setAuditData] = useState<AuditResult | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'match' | 'surplus' | 'deficit'>('all');

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await auditApi.getAudit({ date });
      setAuditData(data);
    } catch {
      setError('Error al cargar la auditoría. Intente otra fecha.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await auditApi.getAnalytics(30);
      setAnalyticsData(data);
    } catch {
      setError('Error al cargar el análisis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'audit') loadAudit();
    else loadAnalytics();
  }, [tab, loadAudit, loadAnalytics]);

  const filteredComparison = auditData?.comparison.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  }) || [];

  const statusBadge = (item: AuditComparison) => {
    if (item.status === 'match') return <span className="badge-success">✓ Coincide</span>;
    if (item.status === 'surplus') return <span className="badge-warning">↑ Exceso</span>;
    return <span className="badge-danger">↓ Faltante</span>;
  };

  const formatNum = (n: number) => n.toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-blue-700 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold">Auditoría & Análisis</h1>
            <p className="text-blue-200 text-sm">Control vs Oracle Inventory</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-3 gap-2">
          <button
            onClick={() => setTab('audit')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === 'audit' ? 'bg-white text-blue-800' : 'text-blue-200 hover:bg-blue-700'
            }`}
          >
            📋 Auditoría
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === 'analytics' ? 'bg-white text-blue-800' : 'text-blue-200 hover:bg-blue-700'
            }`}
          >
            📊 Análisis
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Audit Tab */}
        {tab === 'audit' && (
          <>
            {/* Date selector */}
            <div className="card">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Auditoría</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field flex-1"
                  max={new Date().toISOString().substring(0, 10)}
                />
                <button
                  onClick={loadAudit}
                  disabled={loading}
                  className="btn-primary px-4 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Cargar
                </button>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {auditData && !loading && (
              <>
                {/* Summary cards */}
                {auditData.summary && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card text-center">
                      <p className="text-3xl font-bold text-blue-700">{auditData.summary.total}</p>
                      <p className="text-xs text-gray-500 mt-1">Total Productos</p>
                    </div>
                    <div className="card text-center">
                      <p className="text-3xl font-bold text-green-600">{auditData.summary.match}</p>
                      <p className="text-xs text-gray-500 mt-1">Coincidencias</p>
                    </div>
                    <div className="card text-center">
                      <p className="text-3xl font-bold text-yellow-600">{auditData.summary.surplus}</p>
                      <p className="text-xs text-gray-500 mt-1">Con Exceso</p>
                    </div>
                    <div className="card text-center">
                      <p className="text-3xl font-bold text-red-600">{auditData.summary.deficit}</p>
                      <p className="text-xs text-gray-500 mt-1">Faltantes</p>
                    </div>
                  </div>
                )}

                {/* Filter */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(['all', 'match', 'surplus', 'deficit'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterStatus(f)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        filterStatus === f
                          ? 'bg-blue-700 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {f === 'all' && `Todos (${auditData.comparison.length})`}
                      {f === 'match' && `✓ Coincide (${auditData.summary?.match || 0})`}
                      {f === 'surplus' && `↑ Exceso (${auditData.summary?.surplus || 0})`}
                      {f === 'deficit' && `↓ Falta (${auditData.summary?.deficit || 0})`}
                    </button>
                  ))}
                </div>

                {/* Comparison table */}
                {filteredComparison.length === 0 ? (
                  <div className="card text-center py-8 text-gray-500">
                    {auditData.comparison.length === 0
                      ? 'No hay datos de conteo o ERP para esta fecha.'
                      : 'No hay productos en esta categoría.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredComparison.map((item) => (
                      <div key={item.product_code} className={`card border-l-4 ${
                        item.status === 'match' ? 'border-l-green-400' :
                        item.status === 'surplus' ? 'border-l-yellow-400' :
                        'border-l-red-400'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-semibold text-gray-800">{item.product_code}</p>
                            <p className="text-sm text-gray-600 truncate">{item.product_name}</p>
                            <div className="flex gap-3 mt-1 text-xs text-gray-500">
                              <span>ERP: <strong>{formatNum(item.expected_quantity)}</strong> {item.unit}</span>
                              <span>Conteo: <strong>{formatNum(item.counted_quantity)}</strong> {item.unit}</span>
                            </div>
                          </div>
                          <div className="ml-3 flex flex-col items-end gap-1">
                            {statusBadge(item)}
                            <span className={`text-sm font-bold ${
                              item.difference > 0 ? 'text-yellow-600' :
                              item.difference < 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {item.difference > 0 ? '+' : ''}{formatNum(item.difference)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <>
            {loading && (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {analyticsData && !loading && (
              <>
                <div className="card">
                  <p className="text-sm text-gray-500 mb-3">
                    Análisis de los últimos {analyticsData.days} días
                  </p>

                  {/* Input method stats */}
                  {analyticsData.inputMethodStats.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Método de Entrada</h3>
                      <div className="flex gap-2 flex-wrap">
                        {analyticsData.inputMethodStats.map(stat => (
                          <div key={stat.input_method} className="flex-1 min-w-0 p-3 bg-gray-50 rounded-xl text-center">
                            <p className="text-lg">
                              {stat.input_method === 'manual' ? '⌨️' :
                               stat.input_method === 'voice' ? '🎙️' : '📷'}
                            </p>
                            <p className="text-2xl font-bold text-blue-700">{stat.count}</p>
                            <p className="text-xs text-gray-500 capitalize">{stat.input_method}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Top products */}
                <div className="card">
                  <h3 className="text-base font-semibold text-gray-800 mb-3">
                    🏆 Top Productos Consumidos
                  </h3>
                  {analyticsData.topProducts.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No hay datos de consumo en los últimos {analyticsData.days} días.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {analyticsData.topProducts.map((product, index) => {
                        const maxQty = analyticsData.topProducts[0].total_quantity;
                        const pct = (product.total_quantity / maxQty) * 100;
                        return (
                          <div key={product.product_code} className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-500 w-5 text-right">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {product.product_name || product.product_code}
                                </p>
                                <p className="text-sm font-bold text-blue-700 ml-2 whitespace-nowrap">
                                  {product.total_quantity.toFixed(1)} {product.unit}
                                </p>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {analyticsData?.topProducts.length === 0 && !loading && (
              <div className="card text-center py-8">
                <p className="text-gray-400">
                  Complete y cierre sesiones de conteo para ver el análisis de consumo.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
