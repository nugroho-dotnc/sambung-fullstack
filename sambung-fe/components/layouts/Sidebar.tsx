"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
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
  const isAdmin = role === "admin";

  return (
    <Sidebar className="border-r border-border bg-card select-none print:hidden">
      <SidebarHeader className="py-4 px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo
            size={36}
            className="w-9 h-9 rounded-lg transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-base text-foreground tracking-tight leading-tight">
              SAMBUNG
            </span>
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              {role === "petani" ? "Ruang Petani" : role === "pembeli" ? "Ruang Produsen" : "Pengawas Sistem"}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className={`px-2.5 py-5 ${isAdmin ? "space-y-6" : "space-y-5"}`}>
        {navGroups.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex} className="p-0">
            <SidebarGroupLabel className="px-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {group.groupLabel}
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-1.5 mt-2">
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item.path);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      className={`min-h-11 px-3.5 text-sm font-medium transition-colors ${
                        isAdmin ? "py-2.5 rounded-lg admin-nav-link" : "rounded-xl"
                      } ${
                        isActive
                          ? isAdmin
                            ? "!bg-[#0D5907] !text-white font-semibold hover:!bg-[#2F8208] hover:!text-white active:!bg-[#0D5907] active:!text-white data-active:!bg-[#0D5907] data-active:!text-white"
                            : "!bg-primary !text-primary-foreground font-semibold shadow-xs hover:!bg-primary/90 hover:!text-primary-foreground active:!bg-primary active:!text-primary-foreground data-active:!bg-primary data-active:!text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                      render={
                        <Link
                          href={item.path}
                          aria-current={isActive ? "page" : undefined}
                        />
                      }
                    >
                      <Icon
                        aria-hidden="true"
                        className={`w-4 h-4 mr-2.5 shrink-0 ${
                          isActive
                            ? isAdmin
                              ? "!text-white"
                              : "!text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="min-h-10 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground"
              render={<Link href="/bantuan" />}
            >
              <HelpCircle className="w-4 h-4 mr-2 text-muted-foreground" aria-hidden="true" />
              <span>Bantuan &amp; Ketentuan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
