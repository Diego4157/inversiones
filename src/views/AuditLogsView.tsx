import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  DollarSign,
  Lock,
  Snowflake,
  AlertCircle
} from 'lucide-react';
import { auditService } from '../services/api';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getLogs({
        action: selectedAction !== 'ALL' ? selectedAction : undefined,
        limit: 150
      });
      setLogs(data);
    } catch (err) {
      console.error('Error al cargar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const userName = log.user?.name?.toLowerCase() || '';
    const userEmail = log.user?.email?.toLowerCase() || '';
    const action = log.action?.toLowerCase() || '';
    const detailsStr = typeof log.details === 'string' ? log.details.toLowerCase() : JSON.stringify(log.details || {}).toLowerCase();
    return userName.includes(term) || userEmail.includes(term) || action.includes(term) || detailsStr.includes(term);
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREAR_CREDITO':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <DollarSign className="w-3 h-3 mr-1" /> Nuevo Crédito
          </span>
        );
      case 'ABONO_PAGO':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
            <CreditCard className="w-3 h-3 mr-1" /> Abono / Pago
          </span>
        );
      case 'AGREGAR_CAPITAL':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
            <DollarSign className="w-3 h-3 mr-1" /> Capital Adicionado
          </span>
        );
      case 'CONGELAR_CLIENTE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Snowflake className="w-3 h-3 mr-1" /> Congelar Cliente
          </span>
        );
      case 'CASTIGAR_CLIENTE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
            <AlertCircle className="w-3 h-3 mr-1" /> Castigar Cartera
          </span>
        );
      case 'REACTIVAR_CLIENTE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/15 text-teal-400 border border-teal-500/25">
            <RefreshCw className="w-3 h-3 mr-1" /> Reactivar Cliente
          </span>
        );
      case 'CIERRE_CAJA':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/25">
            <Lock className="w-3 h-3 mr-1" /> Cierre de Caja
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {action}
          </span>
        );
    }
  };

  const parseDetails = (detailsRaw: any) => {
    if (!detailsRaw) return null;
    if (typeof detailsRaw === 'object') return detailsRaw;
    try {
      return JSON.parse(detailsRaw);
    } catch {
      return { raw: detailsRaw };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Bitácora de Auditoría del Sistema</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Registro inmutable de movimientos críticos, cierres de caja y acciones operativas
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Actualizar Bitácora</span>
        </button>
      </div>

      {/* Filtros y Buscador */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuario, cliente, número de crédito o detalle..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
          >
            <option value="ALL">Todas las acciones</option>
            <option value="CREAR_CREDITO">Creación de Crédito</option>
            <option value="ABONO_PAGO">Abonos y Pagos</option>
            <option value="AGREGAR_CAPITAL">Adición de Capital</option>
            <option value="CONGELAR_CLIENTE">Congelar Cliente</option>
            <option value="CASTIGAR_CLIENTE">Castigar Cartera</option>
            <option value="REACTIVAR_CLIENTE">Reactivar Cliente</option>
            <option value="CIERRE_CAJA">Cierre de Caja Diario</option>
          </select>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
            Cargando registros de auditoría...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            No se encontraron eventos de auditoría para los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider bg-slate-950/40">
                  <th className="py-4 px-6">Fecha & Hora</th>
                  <th className="py-4 px-6">Usuario Responsable</th>
                  <th className="py-4 px-6">Acción Realizada</th>
                  <th className="py-4 px-6">Resumen del Evento</th>
                  <th className="py-4 px-6 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredLogs.map((log) => {
                  const details = parseDetails(log.details);
                  const isExpanded = expandedRowId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        {/* Fecha */}
                        <td className="py-4 px-6 whitespace-nowrap text-slate-300">
                          <div className="font-semibold text-white">
                            {new Date(log.createdAt).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(log.createdAt).toLocaleTimeString('es-CO')}
                          </div>
                        </td>

                        {/* Usuario */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {log.user ? (
                            <div>
                              <span className="font-bold text-white block">{log.user.name}</span>
                              <span className="text-[10px] text-slate-400">{log.user.email}</span>
                              <span className="inline-block mt-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                                {log.user.role}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Sistema / Automático</span>
                          )}
                        </td>

                        {/* Acción */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        {/* Resumen */}
                        <td className="py-4 px-6 text-slate-300">
                          {log.action === 'CREAR_CREDITO' && (
                            <span>
                              Crédito para <strong className="text-white">{details?.clientName}</strong> por{' '}
                              <strong className="text-emerald-400">${Number(details?.capitalAmount || 0).toLocaleString()}</strong>
                            </span>
                          )}
                          {log.action === 'ABONO_PAGO' && (
                            <span>
                              Abono de <strong className="text-emerald-400">${Number(details?.amountPaid || details?.amount || 0).toLocaleString()}</strong> ({details?.paymentMethod || 'EFECTIVO'})
                              {details?.clientName && <> a <strong className="text-white">{details.clientName}</strong></>}
                            </span>
                          )}
                          {log.action === 'AGREGAR_CAPITAL' && (
                            <span>
                              +<strong className="text-cyan-400">${Number(details?.addedAmount || 0).toLocaleString()}</strong> a crédito #{details?.loanId} de <strong className="text-white">{details?.clientName}</strong>
                            </span>
                          )}
                          {log.action === 'CONGELAR_CLIENTE' && (
                            <span>
                              Cliente <strong className="text-amber-400">{details?.clientName}</strong> congelado por cobros fallidos
                            </span>
                          )}
                          {log.action === 'CASTIGAR_CLIENTE' && (
                            <span>
                              Cliente <strong className="text-rose-400">{details?.clientName}</strong> enviado a cartera castigada
                            </span>
                          )}
                          {log.action === 'REACTIVAR_CLIENTE' && (
                            <span>
                              Cliente <strong className="text-teal-400">{details?.clientName}</strong> reactivado en ruta
                            </span>
                          )}
                          {log.action === 'CIERRE_CAJA' && (
                            <span>
                              Cierre del <strong className="text-white">{details?.date}</strong>. Recaudo: <strong className="text-emerald-400">${Number(details?.totalCollected || 0).toLocaleString()}</strong> | Neto a entregar: <strong className="text-white">${Number(details?.netToDeliver || 0).toLocaleString()}</strong>
                            </span>
                          )}
                          {!['CREAR_CREDITO', 'ABONO_PAGO', 'AGREGAR_CAPITAL', 'CONGELAR_CLIENTE', 'CASTIGAR_CLIENTE', 'REACTIVAR_CLIENTE', 'CIERRE_CAJA'].includes(log.action) && (
                            <span className="text-slate-400">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(details)}
                            </span>
                          )}
                        </td>

                        {/* Botón Ver Más */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Ver detalles técnicos completos"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Fila Desplegable con Detalles Técnicos */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={5} className="p-4 text-xs">
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                              <div className="flex justify-between items-center text-slate-400 text-[11px] pb-2 border-b border-slate-800">
                                <span>ID del Evento: #{log.id}</span>
                                {log.ipAddress && <span>Dirección IP: {log.ipAddress}</span>}
                              </div>
                              <div className="font-mono text-[11px] text-emerald-400 bg-slate-950 p-3 rounded-xl overflow-x-auto max-h-48">
                                <pre>{JSON.stringify(details, null, 2)}</pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
