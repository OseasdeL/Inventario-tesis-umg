import React, { useState, useEffect } from 'react';
import { Building2, Warehouse, Box, QrCode, ArrowRightLeft, Search, LogOut, Plus, History, Package, Radio} from 'lucide-react';
import Login from './Login';
import NuevoActivoModal from './NuevoActivoModal';
import ScannerQRModal from './ScannerQRModal';
import SesionExpiradaModal from './SesionExpiradaModal';
import NuevoMovimientoModal from './NuevoMovimientoModal';
import PanelAprobacionesAdmin from './PanelAprobacionesAdmin';
import Estaciones from './Estaciones';
import { supabase } from './supabaseClient';

export default function App() {
  const TIEMPO_INACTIVIDAD_MS = 30 * 60 * 1000; // 30 minutos

  // Estado de Usuario (recupera de localStorage)
  const [usuario, setUsuario] = useState(() => {
    const sesionGuardada = localStorage.getItem('usuario_bodega');
    return sesionGuardada ? JSON.parse(sesionGuardada) : null;
  });

  const [activos, setActivos] = useState([]);
  const [sedeFiltro, setSedeFiltro] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para Modales
  const [isNuevoModalOpen, setIsNuevoModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
  const [showExpiradoModal, setShowExpiradoModal] = useState(false);

  const [vistaActiva, setVistaActiva] = useState('inventario'); // 'inventario' o 'solicitudes'
  
  // Historial de Movimientos desde Supabase
  const [movimientos, setMovimientos] = useState([]);

  const handleLogin = (datosUsuario) => {
    localStorage.setItem('usuario_bodega', JSON.stringify(datosUsuario));
    setUsuario(datosUsuario);
    setShowExpiradoModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario_bodega');
    setUsuario(null);
  };

  const handleConfirmarExpiracion = () => {
    setShowExpiradoModal(false);
    handleLogout();
  };

  // Temporizador de inactividad
  useEffect(() => {
    if (!usuario) return;

    let timerId;

    const reiniciarTemporizador = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        setShowExpiradoModal(true);
      }, TIEMPO_INACTIVIDAD_MS);
    };

    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarTemporizador));
    reiniciarTemporizador();

    return () => {
      if (timerId) clearTimeout(timerId);
      eventos.forEach((evento) => window.removeEventListener(evento, reiniciarTemporizador));
    };
  }, [usuario]);

  // Cargar activos y movimientos al iniciar la app
  useEffect(() => {
    if (usuario) {
      obtenerActivos();
      obtenerMovimientos();
    }
  }, [usuario]);

  const obtenerActivos = async () => {
    const { data, error } = await supabase
      .from('activos')
      .select(`
        id,
        qr,
        inventario,
        serial,
        categoria,
        estado,
        bodegas (
          nombre,
          sedes ( nombre )
        )
      `);

    if (error) {
      console.error('Error al cargar activos:', error);
    } else if (data) {
      const activosFormateados = data.map(item => ({
        id: item.id,
        qr: item.qr,
        inventario: item.inventario,
        serial: item.serial,
        categoria: item.categoria,
        estado: item.estado,
        bodega: item.bodegas?.nombre || 'Sin bodega',
        sede: item.bodegas?.sedes?.nombre || 'Sin sede'
      }));
      setActivos(activosFormateados);
    }
  };

  const obtenerMovimientos = async () => {
  // 1. Iniciamos la consulta base
  let query = supabase
    .from('movimientos')
    .select(`
      id,
      estado,
      observacion,
      fecha_solicitud,
      tecnico_id,
      usuarios!movimientos_tecnico_id_fkey ( nombre ),
      origen:bodegas!movimientos_bodega_origen_id_fkey ( nombre, sedes ( nombre ) ),
      destino:bodegas!movimientos_bodega_destino_id_fkey ( nombre, sedes ( nombre ) ),
      movimiento_detalles (
        id,
        tipo_item,
        cantidad,
        activos ( inventario, categoria ),
        consumibles ( nombre )
      )
    `);

  // 2. Si el usuario es técnico, filtramos solo sus movimientos
  if (usuario.rol === 'tecnico') {
    query = query.eq('tecnico_id', usuario.id);
  }

  // 3. Ordenamos por fecha descendente y ejecutamos
  const { data, error } = await query.order('fecha_solicitud', { ascending: false });

  if (error) {
    console.error('Error al cargar movimientos:', error);
  } else if (data) {
    setMovimientos(data);
  }
};

  // Si no hay usuario activo, renderiza únicamente Login
  if (!usuario) {
    return <Login onLogin={handleLogin} />;
  }

  const handleAgregarActivo = (nuevoActivo) => {
    setActivos([nuevoActivo, ...activos]);
  };

  const handleScanSuccess = (decodedText) => {
    setBusqueda(decodedText);
    setIsScannerOpen(false);
  };

  const activosFiltrados = activos.filter(activo => {
    const coincideSede = sedeFiltro === 'Todas' || activo.sede === sedeFiltro;
    const terminoBusqueda = busqueda.toLowerCase();
    const coincideBusqueda = activo.inventario.toLowerCase().includes(terminoBusqueda) || 
                             activo.serial.toLowerCase().includes(terminoBusqueda) ||
                             activo.qr.toLowerCase().includes(terminoBusqueda);
    return coincideSede && coincideBusqueda;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Header con Rol */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <Warehouse className="text-blue-400 w-6 h-6" />
          <h1 className="text-lg font-bold tracking-wide">Control de Bodegas</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${usuario.rol === 'admin' ? 'bg-purple-400' : 'bg-emerald-400'}`}></div>
            <span><strong>{usuario.nombre}</strong></span>
            
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
              usuario.rol === 'admin' 
                ? 'bg-purple-900/60 text-purple-300 border border-purple-700' 
                : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
            }`}>
              {usuario.rol === 'admin' ? 'Admin' : 'Técnico'}
            </span>
          </div>

          <button 
            onClick={handleLogout}
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

    {/* Subbarram/Pestañas de Navegación Superior */}
<div className="bg-slate-900 border-t border-slate-800 shadow-md">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-2">
    <button
      onClick={() => setVistaActiva('inventario')}
      className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
        vistaActiva === 'inventario'
          ? 'border-blue-500 text-blue-400 bg-slate-800/50'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      <Box className="w-4 h-4" />
      Inventario de Activos
    </button>

    <button
      onClick={() => setVistaActiva('solicitudes')}
      className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
        vistaActiva === 'solicitudes'
          ? 'border-blue-500 text-blue-400 bg-slate-800/50'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      <ArrowRightLeft className="w-4 h-4" />
      Gestión de Solicitudes
    </button>

    <button
      onClick={() => setVistaActiva('estaciones')}
      className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
        vistaActiva === 'estaciones'
          ? 'border-blue-500 text-blue-400 bg-slate-800/50'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      <Radio className="w-4 h-4" />
      Estaciones
    </button>

  </div>

  
</div>
        
   <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

  {/* PESTAÑA 1: INVENTARIO DE ACTIVOS */}
  {vistaActiva === 'inventario' && (
    <>
      {/* Barra superior de Inventario: Solo la búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por Inventario o Serie..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabla de Inventario de Activos Fijos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
          <h2 className="font-bold text-slate-800 text-base">Inventario de Activos Fijos</h2>
          <button 
            onClick={() => setIsNuevoModalOpen(true)}
            className="flex-1 sm:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs font-medium"
          >
            <Plus className="w-4 h-4" /> Nuevo Activo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 sm:px-6 py-3">Código QR</th>
                <th className="px-4 sm:px-6 py-3">No. Inventario</th>
                <th className="px-4 sm:px-6 py-3">No. Serie</th>
                <th className="px-4 sm:px-6 py-3">Ubicación Actual</th>
                <th className="px-4 sm:px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    No se encontraron activos registrados.
                  </td>
                </tr>
              ) : (
                activosFiltrados.map((activo) => (
                  <tr key={activo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 sm:px-6 py-3.5 font-mono text-[11px] font-semibold text-blue-600">
                      <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{activo.qr}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 font-semibold text-slate-900 font-mono">{activo.inventario}</td>
                    <td className="px-4 sm:px-6 py-3.5 font-mono text-slate-600">{activo.serial}</td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="font-medium text-slate-800">{activo.bodega}</div>
                      <div className="text-[11px] text-slate-400">{activo.sede}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        activo.estado === 'Excelente' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : activo.estado === 'Bueno'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {activo.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

  {/* PESTAÑA 2: GESTIÓN DE SOLICITUDES */}
  {vistaActiva === 'solicitudes' && (
    <div className="space-y-4">
      {/* Botón de Acción para Solicitar Traslado */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-end">
        <button 
          onClick={() => setIsMovimientoModalOpen(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors shadow-xs"
        >
          <ArrowRightLeft className="w-4 h-4" /> Solicitar Traslado Multiactivo
        </button>
      </div>

      {/* Componente del Panel de Solicitudes */}
      <PanelAprobacionesAdmin 
        movimientos={movimientos}
        usuarioAdmin={usuario}
        onMovimientoProcesado={() => {
          obtenerMovimientos();
          obtenerActivos();
        }}
      />
    </div>
  )}


{vistaActiva === 'estaciones' && (
          <Estaciones 
            userRole={usuario.rol} 
            sedes={[]} 
          />
        )}
  

</main>

      {/* Modales */}
      <NuevoActivoModal 
        isOpen={isNuevoModalOpen} 
        onClose={() => setIsNuevoModalOpen(false)} 
        onAgregar={handleAgregarActivo} 
      />

      <ScannerQRModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      <NuevoMovimientoModal
        isOpen={isMovimientoModalOpen}
        onClose={() => setIsMovimientoModalOpen(false)}
        usuario={usuario}
        onMovimientoCreado={obtenerMovimientos}
      />

      <SesionExpiradaModal 
        isOpen={showExpiradoModal} 
        onAceptar={handleConfirmarExpiracion} 
      />
    </div>
  );
}