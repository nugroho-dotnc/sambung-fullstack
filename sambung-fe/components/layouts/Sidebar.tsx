"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout, HelpCircle, ShieldAlert } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { GET_NAVIGATION_GROUPS } from "@/constant/navigation";

function isRouteActive(currentPath: string, targetPath: string): boolean {
  if (currentPath === targetPath) return true;
  // Jangan cocokkan root atau dashboard utama ke rute anak
  if (
    targetPath === "/" ||
    targetPath === "/petani" ||
    targetPath === "/pembeli" ||
    targetPath === "/admin"
  ) {
    return false;
  }
  // Rute anak wajib berakhiran slash: contoh "/petani/tawaran/123" cocok dengan "/petani/tawaran"
  return currentPath.startsWith(`${targetPath}/`);
}

export default function AppSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const navGroups = GET_NAVIGATION_GROUPS(role);

  return (
    <Sidebar className="border-r border-border/80 bg-card select-none print:hidden">
      <SidebarHeader className="py-5 px-4 border-b border-border/60">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
            <Sprout className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-base text-foreground tracking-tight leading-tight">
              SAMBUNG
            </span>
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              {role === "petani" ? "Ruang Petani" : role === "pembeli" ? "Ruang Pembeli" : "Pengawas Sistem"}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 space-y-4">
        {navGroups.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex} className="p-0">
            <SidebarGroupLabel className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {group.groupLabel}
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-1 mt-1">
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item.path);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      className={`min-h-11 px-3.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "!bg-emerald-600 !text-white font-semibold shadow-xs hover:!bg-emerald-700 hover:!text-white data-active:!bg-emerald-600 data-active:!text-white"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                      render={<Link href={item.path} />}
                    >
                      <Icon className={`w-4 h-4 mr-2.5 shrink-0 ${isActive ? "!text-white" : "text-muted-foreground"}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/60 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="min-h-10 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              render={<Link href="/bantuan" />}
            >
              <HelpCircle className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>Bantuan & Ketentuan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
