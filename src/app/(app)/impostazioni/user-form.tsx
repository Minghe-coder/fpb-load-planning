"use client"

import { useState, useTransition } from "react"
import { createUser, deleteUser } from "@/lib/actions/user"
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Warehouse, User } from "lucide-react"

type UserRow = { id: string; name: string | null; email: string; role: string; createdAt: Date }

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ADMIN:     { label: "Admin",      icon: <ShieldCheck className="h-3.5 w-3.5" />, color: "bg-indigo-100 text-indigo-700" },
  USER:      { label: "Utente",     icon: <User className="h-3.5 w-3.5" />,        color: "bg-slate-100 text-slate-600" },
  WAREHOUSE: { label: "Magazzino",  icon: <Warehouse className="h-3.5 w-3.5" />,   color: "bg-amber-100 text-amber-700" },
}

export function UserManagement({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("USER")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function resetForm() {
    setName(""); setEmail(""); setPassword(""); setRole("USER")
    setError(""); setSuccess("")
  }

  function handleCreate() {
    setError(""); setSuccess("")
    startTransition(async () => {
      const res = await createUser({ name, email, password, role })
      if (res.error) { setError(res.error); return }
      setSuccess(`Utente ${email} creato.`)
      resetForm()
      setShowForm(false)
    })
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteUser(id)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Lista utenti */}
      <div className="divide-y divide-slate-50">
        {users.map((u) => {
          const rc = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.USER
          const isSelf = u.id === currentUserId
          return (
            <div key={u.id} className="flex items-center gap-4 px-6 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{u.name ?? "—"}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${rc.color}`}>
                {rc.icon}{rc.label}
              </span>
              {!isSelf && (
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={isPending && deletingId === u.id}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {isPending && deletingId === u.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              )}
              {isSelf && <span className="text-xs text-slate-400 pr-1.5">tu</span>}
            </div>
          )
        })}
      </div>

      {/* Feedback */}
      {success && (
        <div className="mx-6 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Toggle form */}
      <div className="border-t border-slate-100 px-6 pt-4">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Plus className="h-4 w-4" /> Aggiungi utente
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Nuovo utente</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mario Rossi"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mario@fpb.it"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min. 8 caratteri"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ruolo</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="USER">Utente</option>
                  <option value="ADMIN">Admin</option>
                  <option value="WAREHOUSE">Magazzino</option>
                </select>
              </div>
            </div>

            {role === "WAREHOUSE" && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Gli utenti Magazzino accedono solo a <strong>/magazzino</strong> — vedono solo gli ordini da preparare.
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crea utente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
