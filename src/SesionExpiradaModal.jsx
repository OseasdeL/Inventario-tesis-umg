import React from 'react';
import { Clock, LogIn } from 'lucide-react';

export default function SesionExpiradaModal({ isOpen, onAceptar }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-100 transform transition-all">
        
        {/* Icono de advertencia */}
        <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>

        {/* Mensaje */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">Sesión Expirada</h3>
          <p className="text-slate-500 text-xs sm:text-sm">
            Tu sesión ha finalizado automáticamente por inactividad (30 min) para proteger tus datos.
          </p>
        </div>

        {/* Botón Aceptar */}
        <button
          onClick={onAceptar}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-md"
        >
          <LogIn className="w-4 h-4" />
          Volver a Iniciar Sesión
        </button>
      </div>
    </div>
  );
}