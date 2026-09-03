import React, { useState, useEffect } from 'react';
import { Building2, Warehouse, Box, QrCode, ArrowRightLeft, Search, LogOut, Plus, History, Package, Radio, Boxes, Users, Edit2, Trash2, Upload } from 'lucide-react';
import Login from './Login';
import NuevoActivoModal from './NuevoActivoModal';
import ScannerQRModal from './ScannerQRModal';
import SesionExpiradaModal from './SesionExpiradaModal';
import NuevoMovimientoModal from './NuevoMovimientoModal';
import PanelAprobacionesAdmin from './PanelAprobacionesAdmin';
import Estaciones from './Estaciones';
import ConsumiblesTab from './ConsumiblesTab';
import Sedes from './Sedes';
import Bodegas from './Bodegas';
import Usuarios from './Usuarios';
import ImportarCSVModal from './ImportarCSVModal';
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

  // --- ESTADOS PARA EDICIÓN Y ELIMINACIÓN DE ACTIVOS ---
const [activoAEditar, setActivoAEditar] = useState(null);
const [isEditarModalOpen, setIsEditarModalOpen] = useState(false);

const [activoAEliminarId, setActivoAEliminarId] = useState(null);
const [isEliminarModalOpen, setIsEliminarModalOpen] = useState(false);
const [cargandoAccion, setCargandoAccion] = useState(false);
  
  // Estados para Modales
  const [isNuevoModalOpen, setIsNuevoModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
  const [showExpiradoModal, setShowExpiradoModal] = useState(false);
  const [isImportActivosOpen, setIsImportActivosOpen] = useState(false);

  // Vista activa: 'inventario' | 'consumibles' | 'solicitudes' | 'estaciones' | 'sedes' | 'bodegas' | 'usuarios'
  const [vistaActiva, setVistaActiva] = useState('inventario'); 
  
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

  // --- HANDLERS DE EDICIÓN ---
const abrirModalEditar = (activo) => {
  setActivoAEditar({
    id: activo.id,
    qr: activo.qr || '',
    inventario: activo.inventario || '',
    serial: activo.serial || '',
    tipo_activo_id: activo.tipo_activo_id || '',
    marca_id: activo.marca_id || '',
    especificacion: activo.especificacion || '',
    propiedad: activo.propiedad || 'Propio',
    estado: activo.estado || 'Disponible',
    sede_id: activo.sede_id || '',
    bodega_id: activo.bodega_id || '',
    estacion_id: activo.estacion_id || ''
  });
  setIsEditarModalOpen(true);
};

const handleGuardarEdicion = async (e) => {
  e.preventDefault();
  setCargandoAccion(true);

  try {
    const payload = {
      qr: activoAEditar.qr,
      inventario: activoAEditar.inventario,
      serial: activoAEditar.serial,
      especificacion: activoAEditar.especificacion,
      propiedad: activoAEditar.propiedad,
      estado: activoAEditar.estado,
    };

    if (activoAEditar.tipo_activo_id) payload.tipo_activo_id = Number(activoAEditar.tipo_activo_id);
    if (activoAEditar.marca_id) payload.marca_id = Number(activoAEditar.marca_id);
    if (activoAEditar.sede_id) payload.sede_id = Number(activoAEditar.sede_id);
    if (activoAEditar.bodega_id) payload.bodega_id = Number(activoAEditar.bodega_id);
    if (activoAEditar.estacion_id) payload.estacion_id = Number(activoAEditar.estacion_id);

    const { error } = await supabase
      .from('activos')
      .update(payload)
      .eq('id', activoAEditar.id);

    if (error) throw error;

    // Recargar la lista de activos llamando a la función existente en tu código
    if (typeof fetchActivos === 'function') {
      await fetchActivos();
    } else if (typeof cargarActivos === 'function') {
      await cargarActivos();
    }

    setIsEditarModalOpen(false);
    setActivoAEditar(null);
  } catch (err) {
    alert('Error al actualizar el activo: ' + err.message);
  } finally {
    setCargandoAccion(false);
  }
};

// --- HANDLERS DE ELIMINACIÓN ---
const solicitarEliminacion = (id) => {
  setActivoAEliminarId(id);
  setIsEliminarModalOpen(true);
};

const handleConfirmarEliminacion = async () => {
  if (!activoAEliminarId) return;
  setCargandoAccion(true);

  try {
    const { error } = await supabase
      .from('activos')
      .delete()
      .eq('id', activoAEliminarId);

    if (error) throw error;

    // Recargar la lista de activos
    if (typeof fetchActivos === 'function') {
      await fetchActivos();
    } else if (typeof cargarActivos === 'function') {
      await cargarActivos();
    }

    setIsEliminarModalOpen(false);
    setActivoAEliminarId(null);
  } catch (err) {
    alert('Error al eliminar el activo: ' + err.message);
  } finally {
    setCargandoAccion(false);
  }
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
      cargarActivos();
      obtenerMovimientos();
    }
  }, [usuario]);

  const cargarActivos = async () => {
    const { data, error } = await supabase
      .from('activos')
      .select(`
        id,
        qr,
        inventario,
        serial,
        especificacion,
        propiedad,
        estado,
        sedes ( id, nombre ),
        bodegas ( id, nombre ),
        estaciones ( id, nombre ),
        tipos_activo ( id, nombre ),
        marcas ( id, nombre )
      `)
      .order('id', { ascending: false });

    if (error) {
      console.error('Error al cargar activos:', error);
    } else {
      setActivos(data);
    }
  };

  const obtenerMovimientos = async () => {
    try {
      const { data, error } = await supabase
        .from('movimientos')
        .select(`
          *,
          usuarios:tecnico_id ( id, nombre, rol ),
          sedes(nombre),
          bodega_origen:bodegas!bodega_origen_id(nombre),
          bodega_destino:bodegas!bodega_destino_id(nombre),
          estacion_origen:estaciones!estacion_origen_id(nombre),
          estacion_destino:estaciones!estacion_destino_id(nombre),
          movimiento_detalles (
            id,
            tipo_item,
            cantidad,
            estado_retorno_bodega,
            activos!activo_id ( id, inventario, serial, especificacion ),
            consumibles!consumible_id ( id, nombre )
          )
        `)
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;

      console.log('Movimientos cargados:', data);
      setMovimientos(data);
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    }
  };

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
    const coincideSede = sedeFiltro === 'Todas' || activo.sedes?.nombre === sedeFiltro;
    const terminoBusqueda = busqueda.toLowerCase();
    const coincideBusqueda = (activo.inventario || '').toLowerCase().includes(terminoBusqueda) || 
                             (activo.serial || '').toLowerCase().includes(terminoBusqueda) ||
                             (activo.qr || '').toLowerCase().includes(terminoBusqueda);
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

      {/* Subbarra/Pestañas de Navegación Superior */}
      <div className="bg-slate-900 border-t border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto">
          {/* Pestaña Inventario */}
          <button
            onClick={() => setVistaActiva('inventario')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              vistaActiva === 'inventario'
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-4 h-4" />
            Inventario de Activos
          </button>

          {/* Pestaña Consumibles */}
          <button
            onClick={() => setVistaActiva('consumibles')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              vistaActiva === 'consumibles'
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Consumibles
          </button>

          {/* Pestaña Solicitudes */}
          <button
            onClick={() => setVistaActiva('solicitudes')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              vistaActiva === 'solicitudes'
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Gestión de Solicitudes
          </button>

          {/* Pestaña Estaciones */}
          <button
            onClick={() => setVistaActiva('estaciones')}
            className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              vistaActiva === 'estaciones'
                ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Estaciones
          </button>

          {/* Pestañas de Administración (EXCLUSIVAS PARA ADMIN) */}
          {usuario.rol === 'admin' && (
            <>
              {/* Pestaña Sedes */}
              <button
                onClick={() => setVistaActiva('sedes')}
                className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  vistaActiva === 'sedes'
                    ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Sedes
              </button>

              {/* Pestaña Bodegas */}
              <button
                onClick={() => setVistaActiva('bodegas')}
                className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  vistaActiva === 'bodegas'
                    ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Warehouse className="w-4 h-4" />
                Bodegas
              </button>

              {/* Pestaña Usuarios */}
              <button
                onClick={() => setVistaActiva('usuarios')}
                className={`py-3 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  vistaActiva === 'usuarios'
                    ? 'border-blue-500 text-blue-400 bg-slate-800/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Usuarios
              </button>
            </>
          )}
        </div>
      </div>
        
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

       {/* PESTAÑA 1: INVENTARIO DE ACTIVOS */}
{vistaActiva === 'inventario' && (
  <>
    {/* Búsqueda */}
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center transition-colors">
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input 
          type="text" 
          placeholder="Buscar por Inventario o Serie..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-300 bg-white text-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>
    </div>

    {/* Tabla de Activos Fijos */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-colors">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
        <h2 className="font-bold text-slate-800 text-base">Inventario de Activos Fijos</h2>
        
        {/* RESTRICCIÓN DE ROL: Solo administradores pueden agregar nuevos activos */}
        {usuario?.rol === 'admin' && (

          <div className="flex items-center gap-2">
          <button
              onClick={() => setIsImportActivosOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs font-medium"
            >
              <Upload className="w-4 h-4 text-slate-600" /> Importar CSV
            </button>  

          <button 
            onClick={() => setIsNuevoModalOpen(true)}
            className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs font-medium"
          >
            <Plus className="w-4 h-4" /> Nuevo Activo
          </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 sm:px-6 py-3">Código QR</th>
              <th className="px-4 sm:px-6 py-3">No. Inventario / Serie</th>
              <th className="px-4 sm:px-6 py-3">Equipo</th>
              <th className="px-4 sm:px-6 py-3">Ubicación Actual</th>
              <th className="px-4 sm:px-6 py-3">Propiedad</th>
              <th className="px-4 sm:px-6 py-3">Estado</th>
              {usuario?.rol === 'admin' && (
                <th className="px-4 sm:px-6 py-3 text-right">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={usuario?.rol === 'admin' ? 7 : 6} className="px-6 py-8 text-center text-slate-400">
                  No se encontraron activos registrados.
                </td>
              </tr>
            ) : (
              activosFiltrados.map((activo) => {
                const ubicacionNombre = activo.bodegas?.nombre 
                  ? `Bodega: ${activo.bodegas.nombre}`
                  : activo.estaciones?.nombre 
                  ? `Estación: ${activo.estaciones.nombre}`
                  : 'Sin Ubicación';

                const esBodega = Boolean(activo.bodegas?.nombre);

                return (
                  <tr key={activo.id} className="hover:bg-slate-50 transition-colors">
                    {/* QR */}
                    <td className="px-4 sm:px-6 py-3.5 font-mono text-[11px] font-semibold text-blue-600">
                      <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {activo.qr}
                      </span>
                    </td>

                    {/* Inventario y Serial */}
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="font-semibold text-slate-900 font-mono">{activo.inventario}</div>
                      <div className="text-[11px] font-mono text-slate-400">SN: {activo.serial}</div>
                    </td>

                    {/* Tipo, Marca y Especificación */}
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="font-medium text-slate-800">
                        {activo.tipos_activo?.nombre || 'General'} - {activo.marcas?.nombre || 'N/A'}
                      </div>
                      {activo.especificacion && (
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          {activo.especificacion}
                        </div>
                      )}
                    </td>

                    {/* Ubicación (Bodega o Estación + Sede) */}
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className={`font-medium ${esBodega ? 'text-blue-700' : 'text-purple-700'}`}>
                        {ubicacionNombre}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {activo.sedes?.nombre || 'Sede N/A'}
                      </div>
                    </td>

                    {/* Propiedad */}
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        activo.propiedad === 'Leasing'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {activo.propiedad || 'Propio'}
                      </span>
                    </td>

                    {/* Estado Operativo */}
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        activo.estado === 'Disponible'
                          ? 'bg-emerald-100 text-emerald-700'
                          : activo.estado === 'Asignado'
                          ? 'bg-blue-100 text-blue-700'
                          : activo.estado === 'En diagnostico'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {activo.estado}
                      </span>
                    </td>

                    {/* RESTRICCIÓN DE ROL: Acciones solo para Admin */}
                    {usuario?.rol === 'admin' && (
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirModalEditar(activo)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar Activo"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => solicitarEliminacion(activo.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar Activo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  </>
)}

        {/* PESTAÑA 2: CONSUMIBLES */}
        {vistaActiva === 'consumibles' && (
          <ConsumiblesTab usuario={usuario}/>
        )}

        {/* PESTAÑA 3: GESTIÓN DE SOLICITUDES */}
        {vistaActiva === 'solicitudes' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-end">
              <button 
                onClick={() => setIsMovimientoModalOpen(true)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors shadow-xs"
              >
                <ArrowRightLeft className="w-4 h-4" /> Solicitar Traslado Multiactivo
              </button>
            </div>

            <PanelAprobacionesAdmin 
              movimientos={movimientos}
              usuarioAdmin={usuario}
              onMovimientoProcesado={() => {
                obtenerMovimientos();
                cargarActivos();
              }}
            />
          </div>
        )}

        {/* PESTAÑA 4: ESTACIONES */}
        {vistaActiva === 'estaciones' && (
          <Estaciones userRole={usuario.rol} />
        )}

        {/* PESTAÑA 5: SEDES (SOLO ADMIN) */}
        {vistaActiva === 'sedes' && usuario.rol === 'admin' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-800 mb-2">Gestión de Sedes</h2>
            <Sedes usuario={usuario}/>
          </div>
        )}

        {/* PESTAÑA 6: BODEGAS (SOLO ADMIN) */}
        {vistaActiva === 'bodegas' && usuario.rol === 'admin' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-800 mb-2">Gestión de Bodegas</h2>
            <Bodegas usuario={usuario} />
          </div>
        )}

        {/* PESTAÑA 7: USUARIOS (SOLO ADMIN) */}
        {vistaActiva === 'usuarios' && usuario.rol === 'admin' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-800 mb-2">Gestión de Usuarios</h2>
            <Usuarios usuario={usuario} />
          </div>
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

      <ImportarCSVModal
          isOpen={isImportActivosOpen}
          onClose={() => setIsImportActivosOpen(false)}
          tipo="activos"
          onImportSuccess={cargarActivos}
        />

      {/* MODAL DE EDICIÓN DE ACTIVO */}
{isEditarModalOpen && activoAEditar && (
  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-100">
      <h3 className="text-lg font-bold mb-4">Editar Activo Fijo</h3>
      
      <form onSubmit={handleGuardarEdicion} className="space-y-4 text-xs sm:text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Código QR</label>
            <input
              type="text"
              required
              value={activoAEditar.qr}
              onChange={(e) => setActivoAEditar({...activoAEditar, qr: e.target.value})}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">No. Inventario</label>
            <input
              type="text"
              required
              value={activoAEditar.inventario}
              onChange={(e) => setActivoAEditar({...activoAEditar, inventario: e.target.value})}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Número de Serie</label>
            <input
              type="text"
              value={activoAEditar.serial}
              onChange={(e) => setActivoAEditar({...activoAEditar, serial: e.target.value})}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Propiedad</label>
            <select
              value={activoAEditar.propiedad}
              onChange={(e) => setActivoAEditar({...activoAEditar, propiedad: e.target.value})}
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="Propio">Propio</option>
              <option value="Leasing">Leasing</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Estado Operativo</label>
          <select
            value={activoAEditar.estado}
            onChange={(e) => setActivoAEditar({...activoAEditar, estado: e.target.value})}
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="Disponible">Disponible</option>
            <option value="Asignado">Asignado</option>
            <option value="En diagnostico">En diagnóstico</option>
            <option value="Baja">Baja</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Especificaciones / Detalles</label>
          <textarea
            rows="3"
            value={activoAEditar.especificacion}
            onChange={(e) => setActivoAEditar({...activoAEditar, especificacion: e.target.value})}
            className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setIsEditarModalOpen(false)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cargandoAccion}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
          >
            {cargandoAccion ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* MODAL CONFIRMAR ELIMINACIÓN */}
{isEliminarModalOpen && (
  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 dark:border-slate-700 text-center text-slate-800 dark:text-slate-100">
      <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3">
        <Trash2 className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold mb-1">¿Eliminar este activo?</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
        Esta acción es permanente y no se podrá deshacer.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsEliminarModalOpen(false)}
          className="flex-1 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirmarEliminacion}
          disabled={cargandoAccion}
          className="flex-1 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-xs sm:text-sm font-semibold disabled:opacity-50"
        >
          {cargandoAccion ? 'Eliminando...' : 'Sí, eliminar'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}