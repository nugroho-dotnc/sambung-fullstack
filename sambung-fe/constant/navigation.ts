import {
  Home,
  FileText,
  ScrollText,
  Scale,
  TrendingUp,
  Map as MapIcon,
  Calendar,
  LayoutGrid,
  ShoppingBag,
  BarChart3,
  Database,
  SlidersHorizontal,
  Users,
  Cpu,
  HelpCircle,
  AlertTriangle,
  History,
  Crown,
} from "lucide-react";
import type { ElementType } from "react";
import { ROLE_ENUM } from "./enum";

export type NavItem = {
  id: string;
  label: string;
  icon: ElementType;
  path: string;
};

export type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

export const FARMER_NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupLabel: "Ruang Hasil Panen",
    items: [
      { id: "farmer-home", label: "Beranda Petani", icon: Home, path: "/petani" },
      { id: "farmer-offers", label: "Tawaran Saya", icon: FileText, path: "/petani/tawaran" },
      { id: "farmer-contracts", label: "Kontrak & Kesepakatan", icon: ScrollText, path: "/kontrak" },
    ],
  },
  {
    groupLabel: "Intelijen Pasar Gabah",
    items: [
      { id: "market-price-board", label: "Papan Rantai Harga", icon: TrendingUp, path: "/harga" },
      { id: "market-price-map", label: "Peta Sebaran Harga", icon: MapIcon, path: "/peta" },
      { id: "market-forecast", label: "Prakiraan Tren AI", icon: Calendar, path: "/prakiraan" },
      { id: "market-fair-price", label: "Acuan Harga Wajar", icon: Scale, path: "/harga-wajar" },
    ],
  },
];

export const BUYER_NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupLabel: "Transaksi Pasokan",
    items: [
      { id: "buyer-home", label: "Dasbor Pembeli", icon: LayoutGrid, path: "/pembeli" },
      { id: "buyer-catalog", label: "Katalog Pasokan", icon: ShoppingBag, path: "/pembeli/katalog" },
      { id: "buyer-contracts", label: "Kontrak & Kesepakatan", icon: ScrollText, path: "/kontrak" },
      { id: "buyer-subscription", label: "Langganan Pro", icon: Crown, path: "/langganan" },
    ],
  },
  {
    groupLabel: "Intelijen Pasar Gabah",
    items: [
      { id: "market-price-board", label: "Papan Rantai Harga", icon: TrendingUp, path: "/harga" },
      { id: "market-price-map", label: "Peta Sebaran Harga", icon: MapIcon, path: "/peta" },
      { id: "market-forecast", label: "Prakiraan Tren AI", icon: Calendar, path: "/prakiraan" },
      { id: "market-fair-price", label: "Acuan Harga Wajar", icon: Scale, path: "/harga-wajar" },
    ],
  },
];

export const ADMIN_NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupLabel: "Pengawasan & Transaksi",
    items: [
      { id: "admin-home", label: "Ringkasan Pengawasan", icon: BarChart3, path: "/admin" },
      { id: "admin-moderation", label: "Moderasi Tawaran", icon: AlertTriangle, path: "/admin/moderasi" },
      { id: "admin-catalog", label: "Pemantauan Pasokan", icon: ShoppingBag, path: "/admin/katalog" },
      { id: "admin-contracts", label: "Pemantauan Kontrak", icon: ScrollText, path: "/admin/kontrak" },
    ],
  },
  {
    groupLabel: "Data & Tata Kelola",
    items: [
      { id: "admin-price-data", label: "Observasi Data Harga", icon: Database, path: "/admin/data-harga" },
      { id: "admin-parameters", label: "Parameter Sistem & HPP", icon: SlidersHorizontal, path: "/admin/parameter" },
      { id: "admin-users", label: "Manajemen Pengguna", icon: Users, path: "/admin/pengguna" },
      { id: "admin-audit", label: "Log Audit Sistem", icon: History, path: "/admin/log" },
      { id: "admin-model", label: "Evaluasi Model AI", icon: Cpu, path: "/admin/model" },
    ],
  },
];

export const PUBLIC_NAVIGATION_ITEMS: NavItem[] = [
  { id: "public-home", label: "Beranda", icon: Home, path: "/" },
  { id: "public-price-map", label: "Peta & Papan Harga", icon: MapIcon, path: "/peta-harga" },
  { id: "public-help", label: "Bantuan", icon: HelpCircle, path: "/bantuan" },
];

export const GET_NAVIGATION_GROUPS = (role?: string): NavGroup[] => {
  switch (role) {
    case ROLE_ENUM.FARMER:
      return FARMER_NAVIGATION_GROUPS;
    case ROLE_ENUM.BUYER:
      return BUYER_NAVIGATION_GROUPS;
    case ROLE_ENUM.ADMIN:
      return ADMIN_NAVIGATION_GROUPS;
    default:
      return [
        {
          groupLabel: "Navigasi Publik",
          items: PUBLIC_NAVIGATION_ITEMS,
        },
      ];
  }
};
