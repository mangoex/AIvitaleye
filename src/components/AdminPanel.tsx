import React, { useState, useEffect } from "react";
import { User } from "../types";
import { UserPlus, Edit2, Trash2, Loader2, Shield, Mail, X, Key, UserCheck } from "lucide-react";

interface AdminPanelProps {
  token: string;
}

export default function AdminPanel({ token }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("No se pudieron cargar los usuarios");
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message || "Error de red al cargar usuarios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedUser(null);
    setEmail("");
    setPassword("");
    setRole("user");
    setActionError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setModalMode("edit");
    setSelectedUser(user);
    setEmail(user.email);
    setPassword(""); // Leave blank unless changing
    setRole(user.role);
    setActionError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || (modalMode === "create" && !password.trim())) {
      setActionError("Todos los campos obligatorios deben completarse");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    const url = modalMode === "create" ? "/api/admin/users" : `/api/admin/users/${selectedUser?.id}`;
    const method = modalMode === "create" ? "POST" : "PUT";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          role,
          ...(password.trim() ? { password } : {}),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al procesar la solicitud");
      }

      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setActionError(err.message || "Ocurrió un error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: number, emailToDelete: string) => {
    if (emailToDelete === "mangoex@gmail.com") {
      alert("No se puede eliminar al Super Administrador principal");
      return;
    }

    if (!confirm(`¿Está seguro de que desea eliminar al usuario ${emailToDelete}? Esta acción es irreversible.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al eliminar usuario");
      }

      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm space-y-6" id="admin-panel">
      {/* Title block */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Panel de Administración de Usuarios
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestione las cuentas de iridólogos autorizados para acceder a la plataforma
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/10 cursor-pointer border border-emerald-500/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Iridólogo</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Cargando base de usuarios registrados...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
          <p className="text-rose-300 text-sm">{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-xs font-mono uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3.5">ID</th>
                <th scope="col" className="px-6 py-3.5">Usuario (Email)</th>
                <th scope="col" className="px-6 py-3.5">Rol</th>
                <th scope="col" className="px-6 py-3.5">Fecha Registro</th>
                <th scope="col" className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500">{u.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-100 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {u.email}
                    {u.email === "mangoex@gmail.com" && (
                      <span className="text-[9px] bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                        Super Admin
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      u.role === "admin"
                        ? "bg-purple-950/40 border-purple-800/40 text-purple-300"
                        : "bg-blue-950/40 border-blue-800/40 text-blue-300"
                    }`}>
                      {u.role === "admin" ? "Administrador" : "Iridólogo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("es-ES") : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors border border-transparent hover:border-slate-700/50 cursor-pointer"
                      title="Editar usuario"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {u.email !== "mangoex@gmail.com" && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="p-1.5 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-rose-950/50 cursor-pointer"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              {modalMode === "create" ? "Registrar Nuevo Iridólogo" : "Editar Iridólogo"}
            </h3>

            {actionError && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4 text-xs text-rose-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase block">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting || (modalMode === "edit" && selectedUser?.email === "mangoex@gmail.com")}
                    placeholder="doctor@vitaleyes.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-200 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300 uppercase block">Contraseña</label>
                  {modalMode === "edit" && (
                    <span className="text-[10px] text-slate-500">Dejar en blanco para no cambiar</span>
                  )}
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={modalMode === "create" ? "••••••••" : "Nueva contraseña"}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-slate-200 text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none"
                    required={modalMode === "create"}
                  />
                </div>
              </div>

              {/* Role selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase block">Rol de Usuario</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "user")}
                  disabled={isSubmitting || (modalMode === "edit" && selectedUser?.email === "mangoex@gmail.com")}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-sm p-2.5 rounded-xl outline-none cursor-pointer"
                >
                  <option value="user">Iridólogo (Lecturas y Diagnósticos)</option>
                  <option value="admin">Administrador (Gestión + Diagnósticos)</option>
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg border border-emerald-500/20 flex items-center justify-center gap-2 mt-6 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <span>{modalMode === "create" ? "Registrar Iridólogo" : "Guardar Cambios"}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
