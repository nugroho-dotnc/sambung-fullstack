"use client";

import Link from "next/link";
import { Bell, Crown, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/use-auth";
import { ProBadge } from "@/features/subscription/components/pro-badge";

export default function TopBar() {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();
  const isBuyerPro = user?.role === "pembeli" && Boolean(user?.isPro);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "petani":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">Petani</Badge>;
      case "pembeli":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">Pembeli</Badge>;
      case "admin":
        return (
          <Badge
            variant="outline"
            className="admin-brand-pill rounded-md px-2 py-0.5 text-xs font-semibold"
          >
            Pengawas Data
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">Pengguna</Badge>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "SB";
    const parts = name.trim().split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const isAdmin = user?.role === "admin";

  return (
    <header
      className={`sticky top-0 z-40 w-full h-16 border-b transition-colors print:hidden ${
        isAdmin
          ? "border-border bg-card/95 backdrop-blur-sm"
          : "border-border/80 bg-card/90 backdrop-blur-md shadow-2xs"
      }`}
    >
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger size="lg" />
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span>Wilayah:</span>
            <span className="font-semibold text-foreground">
              {user?.district ? `${user.district}, ${user.regency}` : "Nasional"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifikasi In-App */}
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full relative cursor-pointer hover:bg-muted active:scale-95 transition-all"
            nativeButton={false}
            render={<Link href="/notifikasi" aria-label="Notifikasi transaksi" />}
          >
            <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" aria-hidden="true" />
            <span
              aria-hidden="true"
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                isAdmin ? "admin-live-dot bg-[#78B000]" : "bg-emerald-600 animate-pulse"
              }`}
            />
          </Button>

          {/* User Profile Dropdown Menu (Tanpa Role Switcher!) */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`flex items-center gap-2.5 p-1.5 rounded-full hover:bg-muted/70 active:scale-[0.98] transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isAdmin ? "hover:ring-2 hover:ring-[#C08809]/60" : ""
              }`}
            >
              <Avatar className="w-9 h-9 border border-border">
                <AvatarFallback
                  className={`font-bold text-xs ${
                    isAdmin ? "bg-[#0D5907] text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col text-left mr-1">
                <span className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                  <span>{user?.name || "Pengguna"}</span>
                  {isBuyerPro && <ProBadge size="xs" />}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {user?.businessName || user?.role || "SAMBUNG"}
                </span>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 p-2 rounded-xl shadow-lg">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-bold leading-none text-foreground">{user?.name || "Pengguna"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.phone || user?.email || "-"}</p>
                    <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                      {getRoleBadge(user?.role)}
                      {isBuyerPro && <ProBadge size="xs" />}
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2 px-2 py-2 text-xs"
                render={<Link href="/profil" />}
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Profil & Pengaturan</span>
              </DropdownMenuItem>

              {user?.role === "pembeli" && (
                <DropdownMenuItem
                  className="cursor-pointer flex items-center gap-2 px-2 py-2 text-xs"
                  render={<Link href="/langganan" />}
                >
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>{isBuyerPro ? "Kelola Pembeli Pro" : "Langganan Pembeli Pro"}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="cursor-pointer flex items-center gap-2 px-2 py-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="w-4 h-4" />
                <span>{logoutMutation.isPending ? "Keluar..." : "Keluar dari Akun"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
