import React, { useState } from "react";
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff, UserPlus, LogIn, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

interface LoginFormProps {
  onLogin: (token: string, user: { id: number; email: string; role: "admin" | "user" }) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("iridology_theme") as "dark" | "light") || "dark"
  );

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    const root = document.documentElement;
    if (nextTheme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("iridology_theme", nextTheme);
  };

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);
    setError(null);

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || (mode === "login" ? "Credenciales incorrectas" : "Error al registrar el usuario"));
      }

      const data = await response.json();
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-slate-900/80 border border-slate-800 text-slate-300 rounded-xl hover:text-amber-400 transition-colors cursor-pointer flex items-center justify-center shadow-lg backdrop-blur"
          title={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950/0 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        {/* Title / Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-lg shadow-emerald-900/20">
            {mode === "login" ? <Lock className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Iridoclinic Suite</h2>
          <p className="text-xs text-slate-400 mt-2">
            {mode === "login" 
              ? "Inicie sesión para acceder al analizador clínico" 
              : "Regístrese para crear su cuenta de iridólogo"
            }
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex gap-3 items-start"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="text-rose-300 text-xs font-medium leading-relaxed">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="doctor@vitaleyes.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-100 text-sm pl-11 pr-4 py-3 rounded-xl transition-all outline-none"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-100 text-sm pl-11 pr-12 py-3 rounded-xl transition-all outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password input (Register Mode only) */}
          {mode === "register" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-100 text-sm pl-11 pr-12 py-3 rounded-xl transition-all outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/10 border border-emerald-500/40 flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === "login" ? "Autenticando..." : "Creando cuenta..."}</span>
              </>
            ) : mode === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Registrarse</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Link */}
        <div className="text-center mt-6">
          <button
            onClick={toggleMode}
            disabled={isLoading}
            className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline transition-colors font-medium cursor-pointer"
          >
            {mode === "login" 
              ? "¿No tiene cuenta? Regístrese aquí" 
              : "¿Ya tiene una cuenta? Inicie sesión aquí"
            }
          </button>
        </div>

        <div className="text-center mt-8 border-t border-slate-800/80 pt-6">
          <p className="text-[10px] text-slate-500 font-mono">
            Plataforma Profesional de Diagnóstico e Interpretación del Iris
          </p>
        </div>
      </motion.div>
    </div>
  );
}
