import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Search, CheckCircle, AlertCircle, Shield, Key, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext'; // 1. Importar el hook de tema

export default function Usuarios({ usuario }) {
  const { darkMode, toggleDarkMode } = useTheme(); // Usar estado y función de cambio
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // Estado para formulario (Crear / Editar)
  const [modalOpen, setModalOpen] = useState(false);
  const [usuarioEdit, setUsuarioEdit] = useState(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rol, setRol] = useState('tecnico');

  // Estado para modal de confirmación de eliminación
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, nombre: '' });
  const [eliminando, setEliminando] = useState(false);

  // Feedback
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      mostrarMensaje('error', 'Error al cargar usuarios: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 6000);
  };

  const abrirModalCrear = () => {
    setUsuarioEdit(null);
    setNombre('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setRol('tecnico');
    setModalOpen(true);
  };

  const abrirModalEditar = (u) => {
    setUsuarioEdit(u);
    setNombre(u.nombre || '');
    setEmail(u.email || '');
    setPassword('');
    setShowPassword(false);
    setRol(u.rol || 'tecnico');
    setModalOpen(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;

    if (!usuarioEdit && !password.trim()) {
      mostrarMensaje('error', 'La contraseña es requerida para nuevos usuarios.');
      return;
    }

    if (!usuario?.id) {
      mostrarMensaje('error', 'No se identificó al usuario actual.');
      return;
    }

    setGuardando(true);
    try {
      if (usuarioEdit) {
        const { error } = await supabase.rpc('editar_usuario_admin', {
          p_id: usuarioEdit.id,
          p_nombre: nombre.trim(),
          p_email: email.trim(),
          p_password: password.trim() ? password.trim() : null,
          p_rol: rol,
          p_usuario_id: usuario.id
        });

        if (error) {
          mostrarMensaje('error', `Error Supabase (${error.code}): ${error.message}`);
          return;
        }

        mostrarMensaje('exito', 'Usuario actualizado correctamente.');
      } else {
        const { error } = await supabase.rpc('crear_usuario_admin', {
          p_nombre: nombre.trim(),
          p_email: email.trim(),
          p_password: password.trim(),
          p_rol: rol,
          p_usuario_id: usuario.id
        });

        if (error) {
          mostrarMensaje('error', `Error Supabase (${error.code}): ${error.message}`);
          return;
        }

        mostrarMensaje('exito', 'Usuario creado con éxito.');
      }

      setModalOpen(false);
      cargarUsuarios();
    } catch (err) {
      console.error('Error imprevisto:', err);
      mostrarMensaje('error', 'Error inesperado: ' + (err.message || 'Consulte la consola'));
    } finally {
      setGuardando(false);
    }
  };

  const solicitarEliminacion = (id, nombreUsuario) => {
    setConfirmModal({ open: true, id, nombre: nombreUsuario });
  };

  const ejecutarEliminacion = async () => {
    const { id } = confirmModal;

    if (!usuario?.id) {
      mostrarMensaje('error', 'No se identificó al usuario actual.');
      setConfirmModal({ open: false, id: null, nombre: '' });
      return;
    }

    setEliminando(true);
    try {
      const { error } = await supabase.rpc('eliminar_usuario_admin', {
        p_id: id,
        p_usuario_id: usuario.id
      });

      if (error) {
        mostrarMensaje('error', `Error al eliminar (${error.code}): ${error.message}`);
        return;
      }

      mostrarMensaje('exito', 'Usuario eliminado.');
      setConfirmModal({ open: false, id: null, nombre: '' });
      cargarUsuarios();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      mostrarMensaje('error', 'No se pudo eliminar el usuario.');
    } finally {
      setEliminando(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const coincideBusqueda = (u.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                            (u.email || '').toLowerCase().includes(busqueda.toLowerCase());
    const coincideRol = filtroRol ? u.rol === filtroRol : true;
    return coincideBusqueda && coincideRol;
  });

  return (
    <div className="space-y-4">
      {/* Notificaciones */}
      {mensaje.texto && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
          mensaje.tipo === 'exito' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Controles: Búsqueda, Filtro de Rol, Toggle Tema y Botón Crear */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap justify-between items-center gap-3 transition-colors">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <Shield className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todos los Roles</option>
              <option value="admin">Administrador</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Botón Switch Modo Claro/Oscuro */}
          {/*}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>*/}

          <button
            onClick={abrirModalCrear}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      {/*<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden transition-colors">*/}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Listado de Usuarios</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Correo</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-400 dark:text-slate-500 font-medium">#{u.id}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">{u.nombre}</td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.rol === 'admin' 
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {u.rol === 'admin' ? 'Admin' : u.rol === 'tecnico' ? 'Técnico' : u.rol}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirModalEditar(u)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title="Editar Usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => solicitarEliminacion(u.id, u.nombre)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {usuarioEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            <form onSubmit={handleGuardar} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {usuarioEdit ? 'Contraseña (Dejar en blanco para no cambiar)' : 'Contraseña *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!usuarioEdit}
                    placeholder={usuarioEdit ? '••••••••' : 'Ingrese contraseña'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rol de Sistema *</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tecnico">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : usuarioEdit ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 text-center space-y-4 transition-colors">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">¿Eliminar este usuario?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Estás a punto de eliminar a <span className="font-semibold text-slate-800 dark:text-slate-200">"{confirmModal.nombre}"</span>. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setConfirmModal({ open: false, id: null, nombre: '' })}
                className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-600 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={ejecutarEliminacion}
                className="w-full py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}