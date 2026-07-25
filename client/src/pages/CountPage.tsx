import { useState, useCallback, useEffect } from 'react';
import { sessionApi, productApi } from '../utils/api';
import type { CountItem, CountSession, Employee, InputMethod } from '../types';
import VoiceInput from '../components/VoiceInput';
import CameraInput from '../components/CameraInput';

interface CountPageProps {
  employee: Employee;
  session: CountSession;
  onSessionClose: () => void;
}

export default function CountPage({ employee, session, onSessionClose }: CountPageProps) {
  const [items, setItems] = useState<CountItem[]>([]);
  const [activeTab, setActiveTab] = useState<InputMethod>('manual');
  const [manualCode, setManualCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lookupProduct, setLookupProduct] = useState<{ code: string; name: string; unit: string } | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const data = await sessionApi.get(session.id);
      setItems(data.items);
    } catch {
      // ignore
    }
  }, [session.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const lookupProductCode = useCallback(async (code: string) => {
    if (!code) return;
    try {
      const product = await productApi.getByCode(code);
      setLookupProduct({ code: product.code, name: product.name, unit: product.unit });
    } catch {
      setLookupProduct(null);
    }
  }, []);

  const handleCodeInput = useCallback((code: string, method: InputMethod) => {
    setManualCode(code);
    setActiveTab(method);
    lookupProductCode(code);
  }, [lookupProductCode]);

  const handleVoiceResult = useCallback((code: string) => {
    handleCodeInput(code, 'voice');
  }, [handleCodeInput]);

  const handleCameraResult = useCallback((code: string) => {
    handleCodeInput(code, 'camera');
  }, [handleCodeInput]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddItem = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) {
      setError('Ingrese el código del producto');
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const item = await sessionApi.addItem(session.id, code, qty, activeTab);
      setItems(prev => [item, ...prev]);
      setManualCode('');
      setQuantity('1');
      setLookupProduct(null);
      showSuccess(`✅ ${item.product_name || code} agregado`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Error al agregar el item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: CountItem) => {
    try {
      await sessionApi.deleteItem(session.id, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      setError('Error al eliminar el item');
    }
  };

  const handleCloseSession = async () => {
    if (!window.confirm('¿Está seguro de cerrar esta sesión de conteo?')) return;
    setSubmitLoading(true);
    try {
      await sessionApi.close(session.id);
      onSessionClose();
    } catch {
      setError('Error al cerrar la sesión');
    } finally {
      setSubmitLoading(false);
    }
  };

  const inputMethodIcon = (method: InputMethod) => {
    if (method === 'voice') return '🎙️';
    if (method === 'camera') return '📷';
    return '⌨️';
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-800 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Conteo de Inventario</h1>
            <p className="text-blue-200 text-xs">
              {employee.name} · Sesión #{session.id} · {session.location}
            </p>
          </div>
          <button
            onClick={handleCloseSession}
            disabled={submitLoading}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            {submitLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Finalizar
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Input Method Tabs */}
        <div className="card">
          <div className="flex rounded-xl bg-gray-100 p-1 mb-4">
            {(['manual', 'voice', 'camera'] as InputMethod[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'manual' && '⌨️ Manual'}
                {tab === 'voice' && '🎙️ Voz'}
                {tab === 'camera' && '📷 Cámara'}
              </button>
            ))}
          </div>

          {/* Manual input */}
          {activeTab === 'manual' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código del Producto
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setManualCode(v);
                    if (v.length >= 3) lookupProductCode(v);
                    else setLookupProduct(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  placeholder="Ingrese código del producto"
                  className="input-field font-mono uppercase"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* Voice input */}
          {activeTab === 'voice' && (
            <VoiceInput onResult={handleVoiceResult} disabled={loading} />
          )}

          {/* Camera/barcode input */}
          {activeTab === 'camera' && (
            <CameraInput onResult={handleCameraResult} disabled={loading} />
          )}

          {/* Product lookup result */}
          {lookupProduct && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-600 font-medium">Producto encontrado:</p>
              <p className="text-blue-800 font-semibold">{lookupProduct.name}</p>
              <p className="text-blue-600 text-sm">Unidad: {lookupProduct.unit}</p>
            </div>
          )}

          {/* Code display for non-manual methods */}
          {activeTab !== 'manual' && manualCode && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código capturado
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="input-field font-mono uppercase"
                placeholder="Código del producto"
              />
            </div>
          )}

          {/* Quantity */}
          {manualCode && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad {lookupProduct ? `(${lookupProduct.unit})` : ''}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(prev => String(Math.max(0.5, parseFloat(prev || '1') - 1)))}
                  className="w-12 h-12 rounded-xl bg-gray-200 text-gray-700 text-xl font-bold hover:bg-gray-300 active:bg-gray-400 flex items-center justify-center"
                >−</button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0.1"
                  step="0.5"
                  className="input-field text-center text-xl font-semibold flex-1"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(prev => String(parseFloat(prev || '0') + 1))}
                  className="w-12 h-12 rounded-xl bg-gray-200 text-gray-700 text-xl font-bold hover:bg-gray-300 active:bg-gray-400 flex items-center justify-center"
                >+</button>
              </div>
            </div>
          )}

          {/* Error/Success messages */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
              {successMsg}
            </div>
          )}

          {/* Add button */}
          <button
            type="button"
            onClick={handleAddItem}
            disabled={loading || !manualCode.trim()}
            className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            Agregar al Conteo
          </button>
        </div>

        {/* Count Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              Productos Contados ({items.length})
            </h2>
            <span className="badge-info">
              Total: {totalItems.toFixed(1)} uds
            </span>
          </div>

          {items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              No hay productos contados aún.<br />
              Agregue el primer producto usando los controles de arriba.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{inputMethodIcon(item.input_method as InputMethod)}</span>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-gray-800 truncate">
                          {item.product_code}
                        </p>
                        {item.product_name && (
                          <p className="text-xs text-gray-500 truncate">{item.product_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <span className="text-base font-bold text-blue-700 whitespace-nowrap">
                      {item.quantity} {item.unit || ''}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
