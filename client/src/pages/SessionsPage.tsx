import { useState, useEffect, useCallback } from 'react';
import { sessionApi } from '../utils/api';
import type { CountSession, Employee } from '../types';

interface SessionsPageProps {
  employee: Employee;
  onStartNewSession: (session: CountSession) => void;
  onResumeSession: (session: CountSession) => void;
  onViewAudit: () => void;
}

export default function SessionsPage({
  employee,
  onStartNewSession,
  onResumeSession,
  onViewAudit,
}: SessionsPageProps) {
  const [sessions, setSessions] = useState<CountSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState('COCINA');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionApi.list({ employee_id: employee.id });
      setSessions(data);
    } catch {
      setError('Error al cargar sesiones');
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleNewSession = async () => {
    setStarting(true);
    setError('');
    try {
      const session = await sessionApi.create(employee.id, location);
      // Refetch to get full session data
      const fullSession = await sessionApi.get(session.id);
      onStartNewSession({ ...session, ...fullSession, employee_code: employee.code, employee_name: employee.name });
    } catch {
      setError('Error al crear la sesión de conteo');
    } finally {
      setStarting(false);
    }
  };

  const openSessions = sessions.filter(s => s.status === 'open');
  const closedSessions = sessions.filter(s => s.status === 'closed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Conteo Inteligente</h1>
            <p className="text-blue-200 text-sm">Bienvenido, {employee.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onViewAudit}
              className="bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Auditoría
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* New session card */}
        <div className="card border-2 border-blue-200">
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Sesión de Conteo
          </h2>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
            >
              <option value="COCINA">🍳 Cocina Principal</option>
              <option value="BODEGA">📦 Bodega</option>
              <option value="ALMACEN_FRIO">❄️ Almacén Frío</option>
              <option value="PANADERIA">🥖 Panadería</option>
              <option value="BAR">🍷 Bar</option>
              <option value="CAFETERIA">☕ Cafetería</option>
            </select>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleNewSession}
            disabled={starting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {starting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creando sesión...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Iniciar Conteo
              </>
            )}
          </button>
        </div>

        {/* Open sessions */}
        {openSessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Sesiones Abiertas ({openSessions.length})
            </h2>
            <div className="space-y-2">
              {openSessions.map(s => (
                <div
                  key={s.id}
                  className="card border-l-4 border-l-green-500 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => onResumeSession(s)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Sesión #{s.id} · {s.location}
                      </p>
                      <p className="text-xs text-gray-500">
                        Iniciada: {new Date(s.started_at).toLocaleString('es-CO')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {s.item_count || 0} productos contados
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-success">Abierta</span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent closed sessions */}
        {closedSessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              Sesiones Cerradas
            </h2>
            <div className="space-y-2">
              {closedSessions.slice(0, 5).map(s => (
                <div key={s.id} className="card border-l-4 border-l-gray-300 opacity-80">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-700">
                        Sesión #{s.id} · {s.location}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(s.started_at).toLocaleDateString('es-CO')} ·{' '}
                        {s.item_count || 0} productos
                      </p>
                    </div>
                    <span className="badge-info">Cerrada</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
