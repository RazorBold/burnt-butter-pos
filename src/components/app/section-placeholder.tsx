import { Suspense } from "react"

import {
  PAGE_CONTAINER,
  PageHeader,
  PageHeaderSkeleton,
  UnderConstruction,
} from "@/components/app/page-header"
import type { Section } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"

type Props = { section: Section; title: string; description: string; plannedContent: string }

/** Halaman menu yang belum dibangun: tetap dicek aksesnya, lalu menampilkan judul + keterangan. */
export function SectionPlaceholder(props: Props) {
  return (
    <main className={PAGE_CONTAINER}>
      <Suspense fallback={<PageHeaderSkeleton />}>
        <Gate {...props} />
      </Suspense>
    </main>
  )
}

async function Gate({ section, title, description, plannedContent }: Props) {
  await requirePageAccess(section)
  return (
    <>
      <PageHeader title={title} description={description} />
      <UnderConstruction plannedContent={plannedContent} />
    </>
  )
}
