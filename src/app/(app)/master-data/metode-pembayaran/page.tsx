import { Plus, WalletCards } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { ActiveBadge } from "@/components/app/active-badge"
import { ActiveToggleMenu, EditIconButton } from "@/components/app/row-actions"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ReadOnlyNote,
  SectionCard,
  SectionCardHeader,
  SectionCardSkeleton,
} from "@/features/master-data/components/section-card"
import { setPaymentMethodActive } from "@/features/payment-methods/actions"
import { PaymentMethodFormDialog } from "@/features/payment-methods/components/payment-method-form-dialog"
import { listPaymentMethods } from "@/features/payment-methods/queries"
import { PAYMENT_METHOD_TYPE_LABEL } from "@/features/payment-methods/schemas"
import { CAN_MANAGE_MASTER } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"

export const metadata: Metadata = { title: "Metode Pembayaran" }

export default function MetodePembayaranPage() {
  return (
    <SectionCard>
      <Suspense fallback={<SectionCardSkeleton rows={4} />}>
        <PaymentMethodSection />
      </Suspense>
    </SectionCard>
  )
}

async function PaymentMethodSection() {
  const user = await requirePageAccess("/master-data")
  const canEdit = CAN_MANAGE_MASTER.includes(user.role)
  const methods = await listPaymentMethods()

  return (
    <>
      <SectionCardHeader
        icon={WalletCards}
        title="Metode Pembayaran"
        description="Kelola metode pembayaran yang digunakan."
        actions={
          canEdit && (
            <PaymentMethodFormDialog
              trigger={
                <Button className="h-10 rounded-lg px-4 font-semibold">
                  <Plus className="size-[18px]" aria-hidden />
                  Tambah Metode
                </Button>
              }
            />
          )
        }
      />

      {methods.length === 0 ? (
        <div className="px-6 py-12">
          <p className="font-semibold text-brand-ink">Belum ada metode pembayaran.</p>
          <p className="mt-1 text-sm text-text-body">
            Tambahkan metode seperti transfer bank, e-wallet, atau cash.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Nama Metode</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((method) => (
                <TableRow
                  key={method.id}
                  className={method.isActive ? undefined : "text-text-body"}
                >
                  <TableCell className="pl-6 font-medium text-text-strong">{method.name}</TableCell>
                  <TableCell>{PAYMENT_METHOD_TYPE_LABEL[method.type]}</TableCell>
                  <TableCell>
                    <ActiveBadge active={method.isActive} />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <PaymentMethodFormDialog
                          method={method}
                          trigger={<EditIconButton name={method.name} />}
                        />
                        <ActiveToggleMenu
                          name={method.name}
                          isActive={method.isActive}
                          toggle={setPaymentMethodActive.bind(null, method.id, !method.isActive)}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!canEdit && (
        <ReadOnlyNote>Hanya Admin yang bisa menambah atau mengubah metode pembayaran.</ReadOnlyNote>
      )}
    </>
  )
}
