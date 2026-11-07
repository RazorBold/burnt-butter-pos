import type { Metadata } from "next"
import { Suspense } from "react"

import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { NewOrderWorkspace } from "@/features/orders/components/new-order-workspace"
import { ORDER_CHANNELS } from "@/features/orders/constants"
import { getOrderCatalog } from "@/features/orders/queries"
import { requirePageAccess } from "@/lib/auth"

export const metadata: Metadata = { title: "Input Pesanan" }

type SearchParams = PageProps<"/pesanan/baru">["searchParams"]

export default function InputPesananPage({ searchParams }: PageProps<"/pesanan/baru">) {
  return (
    <main className={PAGE_CONTAINER}>
      <PageHeader
        title="Input Pesanan"
        description="Pilih sumber pesanan, tempel pesan WhatsApp atau template Olshop, lalu Isi Otomatis."
      />
      <div className="mt-6">
        <Suspense fallback={<WorkspaceSkeleton />}>
          <Workspace searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}

async function Workspace({ searchParams }: { searchParams: SearchParams }) {
  // Role yang boleh membuka /pesanan (Admin, Kasir) sama dengan CAN_INPUT_ORDER.
  await requirePageAccess("/pesanan")
  const catalog = await getOrderCatalog()
  const { sumber } = await searchParams
  const channel = ORDER_CHANNELS.find((value) => value === sumber) ?? "whatsapp"
  return <NewOrderWorkspace catalog={catalog} initialChannel={channel} />
}

function WorkspaceSkeleton() {
  return (
    <div aria-hidden className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:gap-8">
      <Skeleton className="h-[420px] rounded-2xl" />
      <Skeleton className="h-[720px] rounded-2xl" />
    </div>
  )
}
