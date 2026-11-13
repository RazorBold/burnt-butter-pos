import { MapPinned, Plus, Truck } from "lucide-react"
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
import { setCourierActive } from "@/features/couriers/actions"
import { CourierFormDialog } from "@/features/couriers/components/courier-form-dialog"
import { listCouriers } from "@/features/couriers/queries"
import { COURIER_TYPE_LABEL } from "@/features/couriers/schemas"
import {
  ReadOnlyNote,
  SectionCard,
  SectionCardHeader,
  SectionCardSkeleton,
} from "@/features/master-data/components/section-card"
import { CAN_MANAGE_MASTER } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatPhone } from "@/lib/phone"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { setShippingOptionActive } from "@/features/shipping-options/actions"
import { ShippingOptionFormDialog } from "@/features/shipping-options/components/shipping-option-form-dialog"
import { shippingNote } from "@/features/shipping-options/options"
import { listShippingOptions } from "@/features/shipping-options/queries"

export const metadata: Metadata = { title: "Kurir & Pengiriman" }

export default function KurirPage() {
  return (
    <div className="space-y-6">
      <SectionCard>
        <Suspense fallback={<SectionCardSkeleton rows={3} />}>
          <CourierSection />
        </Suspense>
      </SectionCard>
      <SectionCard>
        <Suspense fallback={<SectionCardSkeleton rows={4} />}>
          <ShippingOptionSection />
        </Suspense>
      </SectionCard>
    </div>
  )
}

async function CourierSection() {
  const user = await requirePageAccess("/master-data")
  const canEdit = CAN_MANAGE_MASTER.includes(user.role)
  const couriers = await listCouriers()

  return (
    <>
      <SectionCardHeader
        icon={Truck}
        title="Kurir & Pengiriman"
        description="Kelola data kurir internal dan pengaturan pengiriman."
        actions={
          canEdit && (
            <CourierFormDialog
              trigger={
                <Button className="h-10 rounded-lg px-4 font-semibold">
                  <Plus className="size-[18px]" aria-hidden />
                  Tambah Kurir
                </Button>
              }
            />
          )
        }
      />

      {couriers.length === 0 ? (
        <div className="px-6 py-12">
          <p className="font-semibold text-brand-ink">Belum ada kurir.</p>
          <p className="mt-1 text-sm text-text-body">
            Tambahkan kurir internal agar bisa ditugaskan ke pesanan Kurir Internal.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Nama Kurir</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>No. Telp</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {couriers.map((courier) => (
                <TableRow
                  key={courier.id}
                  className={courier.isActive ? undefined : "text-text-body"}
                >
                  <TableCell className="pl-6 font-medium text-text-strong">
                    {courier.name}
                  </TableCell>
                  <TableCell>{COURIER_TYPE_LABEL[courier.type]}</TableCell>
                  <TableCell className="tabular-nums">{formatPhone(courier.phone)}</TableCell>
                  <TableCell>
                    <ActiveBadge active={courier.isActive} />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <CourierFormDialog
                          courier={courier}
                          trigger={<EditIconButton name={courier.name} />}
                        />
                        <ActiveToggleMenu
                          name={courier.name}
                          isActive={courier.isActive}
                          toggle={setCourierActive.bind(null, courier.id, !courier.isActive)}
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

      {!canEdit && <ReadOnlyNote>Hanya Admin yang bisa menambah atau mengubah kurir.</ReadOnlyNote>}
    </>
  )
}

/**
 * Kategori pengiriman (permintaan pemilik toko, 13 Nov 2026): Owner menambah/mengubah kategori
 * seperti GoSend atau Lalamove, memilih alur dasarnya, dan apakah memakai live tracking.
 */
async function ShippingOptionSection() {
  const user = await requirePageAccess("/master-data")
  const canEdit = CAN_MANAGE_MASTER.includes(user.role)
  const options = await listShippingOptions()

  return (
    <>
      <SectionCardHeader
        icon={MapPinned}
        title="Kategori Pengiriman"
        description="Pilihan pengiriman di form pesanan, beserta live tracking-nya."
        actions={
          canEdit && (
            <ShippingOptionFormDialog
              trigger={
                <Button className="h-10 rounded-lg px-4 font-semibold">
                  <Plus className="size-[18px]" aria-hidden />
                  Tambah Kategori
                </Button>
              }
            />
          )
        }
      />

      {options.length === 0 ? (
        <div className="px-6 py-12">
          <p className="font-semibold text-brand-ink">Belum ada kategori pengiriman.</p>
          <p className="mt-1 text-sm text-text-body">
            Tambahkan kategori seperti Pick Up, GoSend, atau Kurir Internal.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Nama Kategori</TableHead>
                <TableHead>Alur</TableHead>
                <TableHead>Live Tracking</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="pr-6 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((option) => (
                <TableRow
                  key={option.id}
                  data-testid={`kategori-kirim-${option.name}`}
                  className={option.isActive ? undefined : "text-text-body"}
                >
                  <TableCell className="max-w-[320px] pl-6">
                    <span className="block font-medium text-text-strong">{option.name}</span>
                    <span className="block text-[13px] text-text-body">{shippingNote(option)}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {SHIPPING_METHOD_LABEL[option.flow]}
                  </TableCell>
                  <TableCell>
                    {option.liveTracking ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-trend-up px-2.5 py-1 text-[13px] font-medium whitespace-nowrap text-trend-up-fg">
                        <MapPinned className="size-3.5" aria-hidden />
                        Ya
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-nav-active px-2.5 py-1 text-[13px] font-medium whitespace-nowrap text-text-body">
                        Tidak
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge active={option.isActive} />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <ShippingOptionFormDialog
                          option={option}
                          trigger={<EditIconButton name={option.name} />}
                        />
                        <ActiveToggleMenu
                          name={option.name}
                          isActive={option.isActive}
                          toggle={setShippingOptionActive.bind(null, option.id, !option.isActive)}
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
    </>
  )
}
