import type { Metadata } from "next"
import { Suspense } from "react"

import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { NewOrderWorkspace } from "@/features/orders/components/new-order-workspace"
import { getOrderCatalog } from "@/features/orders/queries"
import { requirePageAccess } from "@/lib/auth"

export const metadata: Metadata = { title: "Input Pesanan" }

export default function InputPesananPage() {
  return (
    <main className={PAGE_CONTAINER}>
      <PageHeader
        title="Input Pesanan"
        description="Tempel pesan WhatsApp, cek hasil Isi Otomatis, lalu lengkapi yang masih kosong."
      />
      <div className="mt-6">
        <Suspense fallback={<WorkspaceSkeleton />}>
          <Workspace />
        </Suspense>
      </div>
    </main>
  )
}

async function Workspace() {
  // Role yang boleh membuka /pesanan (Admin, Kasir) sama dengan CAN_INPUT_ORDER.
  await requirePageAccess("/pesanan")
  const catalog = await getOrderCatalog()
  return <NewOrderWorkspace catalog={catalog} />
}

function WorkspaceSkeleton() {
  return (
    <div aria-hidden className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:gap-8">
      <Skeleton className="h-[420px] rounded-2xl" />
      <Skeleton className="h-[720px] rounded-2xl" />
    </div>
  )
}
