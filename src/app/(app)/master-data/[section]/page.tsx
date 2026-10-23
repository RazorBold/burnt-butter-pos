import { notFound } from "next/navigation"
import { Suspense } from "react"

import { PageHeader, PageHeaderSkeleton, UnderConstruction } from "@/components/app/page-header"
import { MASTER_DATA_SECTIONS } from "@/features/master-data/sections"
import { requirePageAccess } from "@/lib/auth"

// Bagian Master Data yang belum dibangun. Produk & Menu punya halaman sendiri (produk-menu/).
export default function MasterDataSectionPage({ params }: PageProps<"/master-data/[section]">) {
  return (
    <Suspense fallback={<PageHeaderSkeleton />}>
      <Section params={params} />
    </Suspense>
  )
}

async function Section({ params }: Pick<PageProps<"/master-data/[section]">, "params">) {
  const { section: slug } = await params
  const section = MASTER_DATA_SECTIONS.find((item) => item.slug === slug)
  if (!section) notFound()
  await requirePageAccess("/master-data")

  return (
    <>
      <PageHeader title={section.label} description={section.planned} />
      <UnderConstruction plannedContent="Fitur untuk mengelola data ini menyusul setelah Produk & Menu." />
    </>
  )
}
