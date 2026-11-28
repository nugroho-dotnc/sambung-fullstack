import type { ComponentProps } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";

type AdminPageHeaderProps = ComponentProps<typeof PageHeader> & {
  section: string;
};

export function AdminPageHeader({ section, ...props }: AdminPageHeaderProps) {
  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin" className="font-semibold hover:text-primary hover:underline">
          Ringkasan Pengawasan
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="font-medium text-foreground">{section}</span>
      </nav>
      <PageHeader {...props} />
    </div>
  );
}
