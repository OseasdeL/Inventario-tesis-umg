import React, { useState } from 'react';
import { Warehouse, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleIngresar = async (e) => {
    e.preventDefault();
    setError('');

    const emailLimpio = email.trim().toLowerCase();
    const claveLimpia = clave.trim();

    if (!emailLimpio) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    if (!claveLimpia) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    setCargando(true);

    try {
      // Validar usuario por email y password en la tabla usuarios
      const { data, error: errQuery } = await supabase
        .from('usuarios')
        .select('id, nombre, email, password, rol')
        .eq('email', emailLimpio)
        .eq('password', claveLimpia)
        .single();

      if (errQuery || !data) {
        setError('Correo o contraseña incorrectos');
        setCargando(false);
        return;
      }

      // Login exitoso pasando el usuario y su rol real
      onLogin({
        id: data.id,
        nombre: data.nombre,
        email: data.email,
        rol: data.rol || 'tecnico'
      });

    } catch (err) {
      console.error('Error al autenticar:', err);
      setError('Error inesperado al conectar.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-blue-600">
            <Warehouse className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Control de Bodegas</h1>
          <p className="text-xs text-slate-500">Ingresa tu correo y contraseña para acceder</p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleIngresar} className="space-y-4">
          
          {/* Campo de Correo Electrónico */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="email"
                placeholder="usuario@bodega.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={cargando}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Campo de Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contraseña / PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="password"
                placeholder="••••••••"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                disabled={cargando}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

      </div>
    </div>
  );
}