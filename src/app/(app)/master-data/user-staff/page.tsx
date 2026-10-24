import { Plus, UsersRound } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { ActiveBadge } from "@/components/app/active-badge"
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
  SectionCard,
  SectionCardHeader,
  SectionCardSkeleton,
} from "@/features/master-data/components/section-card"
import { setStaffActive } from "@/features/staff/actions"
import { StaffFormDialog } from "@/features/staff/components/staff-form-dialog"
import { StaffRowActions } from "@/features/staff/components/staff-row-actions"
import { listStaff } from "@/features/staff/queries"
import { ROLE_LABEL } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatWaktuDibuat } from "@/lib/format"

export const metadata: Metadata = { title: "User / Staff" }

export default function UserStaffPage() {
  return (
    <SectionCard>
      <Suspense fallback={<SectionCardSkeleton rows={4} />}>
        <StaffSection />
      </Suspense>
    </SectionCard>
  )
}

async function StaffSection() {
  // Hanya Admin (lihat SUBSECTION_ACCESS): daftar ini memuat email dan akses akun.
  const user = await requirePageAccess("/master-data/user-staff")
  const staff = await listStaff()

  return (
    <>
      <SectionCardHeader
        icon={UsersRound}
        title="User / Staff"
        description="Kelola akses pengguna sistem."
        actions={
          <StaffFormDialog
            trigger={
              <Button className="h-10 rounded-lg px-4 font-semibold">
                <Plus className="size-[18px]" aria-hidden />
                Tambah User
              </Button>
            }
          />
        }
      />

      <div className="overflow-x-auto">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Nama</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Terakhir masuk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => {
              const isSelf = member.id === user.id
              return (
                <TableRow
                  key={member.id}
                  className={member.isActive ? undefined : "text-text-body"}
                >
                  <TableCell className="pl-6">
                    <span className="flex items-center gap-2 font-medium text-text-strong">
                      {member.name}
                      {isSelf && (
                        <span className="rounded-md bg-nav-active px-1.5 py-0.5 text-xs font-semibold text-brand-ink">
                          Kamu
                        </span>
                      )}
                    </span>
                    <span className="block text-[13px] text-text-body">{member.email}</span>
                  </TableCell>
                  <TableCell>{ROLE_LABEL[member.role]}</TableCell>
                  <TableCell className="tabular-nums">
                    {member.lastSignInAt ? formatWaktuDibuat(member.lastSignInAt) : "Belum pernah"}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge active={member.isActive} />
                  </TableCell>
                  <TableCell className="pr-6">
                    <StaffRowActions
                      staff={member}
                      isSelf={isSelf}
                      toggle={
                        isSelf ? undefined : setStaffActive.bind(null, member.id, !member.isActive)
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
