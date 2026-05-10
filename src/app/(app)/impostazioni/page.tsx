import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { OverheadRateForm } from "./overhead-form"
import { UserManagement } from "./user-form"
import { PushToggle } from "@/components/push-toggle"
import { fmtEuro } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ImpostazioniPage() {
  const [rates, palletConfigs, users, session] = await Promise.all([
    db.overheadRate.findMany({ orderBy: { fiscalYear: "desc" } }),
    db.palletConfig.findMany(),
    db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    auth(),
  ])
  const currentUserId = (session?.user as { id?: string })?.id ?? ""
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN"

  return (
    <div className="flex flex-col gap-6 p-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Impostazioni</h1>
        <p className="mt-1 text-sm text-slate-500">Configurazione parametri globali dell'applicazione</p>
      </div>

      {/* Overhead rates */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Incidenza costi aziendali</h2>
          <p className="text-xs text-slate-500 mt-0.5">Calcolata annualmente dal Conto Economico — usata per il costo industriale prodotti</p>
        </div>
        <div className="divide-y divide-slate-50">
          {rates.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-slate-900">Anno {r.fiscalYear}</p>
                <div className="flex items-center gap-4 mt-0.5">
                  {r.revenueEur && (
                    <span className="text-xs text-slate-400">
                      Fatturato: {fmtEuro(Number(r.revenueEur))}
                    </span>
                  )}
                  {r.totalCostEur && (
                    <span className="text-xs text-slate-400">
                      Costi: {fmtEuro(Number(r.totalCostEur))}
                    </span>
                  )}
                  {r.notes && <span className="text-xs text-slate-400">{r.notes}</span>}
                </div>
              </div>
              <span className="text-2xl font-bold text-indigo-600 tabular">
                {(Number(r.ratePct) * 100).toFixed(2)}%
              </span>
            </div>
          ))}
          {rates.length === 0 && (
            <div className="px-6 py-6 text-sm text-slate-400">
              Nessun tasso overhead configurato. Aggiungi l&apos;anno corrente.
            </div>
          )}
        </div>
        <div className="border-t border-slate-100 px-6 py-4">
          <OverheadRateForm />
        </div>
      </div>

      {/* Utenti */}
      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Utenti</h2>
            <p className="text-xs text-slate-500 mt-0.5">Gestisci gli accessi all&apos;applicazione</p>
          </div>
          <UserManagement users={users} currentUserId={currentUserId} />
        </div>
      )}

      {/* Notifiche push */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Notifiche push</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ricevi una notifica su questo dispositivo quando un ordine è completamente preparato
          </p>
        </div>
        <div className="px-6 py-4">
          <PushToggle />
        </div>
      </div>

      {/* Pallet config */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Configurazione pallet</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {palletConfigs.map((p) => (
            <div key={p.id} className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="font-medium text-slate-900">{p.name}</p>
                {p.isDefault && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                    Default
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Lunghezza", value: `${p.lengthCm} cm` },
                  { label: "Larghezza", value: `${p.widthCm} cm` },
                  { label: "Altezza max", value: `${p.maxHeightCm} cm` },
                  { label: "Peso max", value: `${p.maxWeightKg} kg` },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 tabular">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
