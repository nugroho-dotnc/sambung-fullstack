import { roleSchema, type Role, type SessionUser } from "@/features/auth/schemas";
import { ROLE_ENUM } from "@/constant/enum";
import { IS_MOCK_DATA } from "@/lib/config/fe-mode";

export const demoUsers: Record<Role, SessionUser> = {
  [ROLE_ENUM.FARMER]: {
    id: "demo-farmer",
    name: "Pak Subur",
    role: ROLE_ENUM.FARMER,
    phone: "081234567890",
    province: "Jawa Barat",
    regency: "Subang",
    district: "Pagaden",
    businessName: "Poktan Subur Makmur",
    status: "active",
  },
  [ROLE_ENUM.BUYER]: {
    id: "demo-buyer",
    name: "H. Hendra",
    role: ROLE_ENUM.BUYER,
    phone: "081398765432",
    province: "Jawa Barat",
    regency: "Karawang",
    district: "Telagasari",
    businessName: "CV Sumber Pangan Nusantara",
    status: "active",
  },
  [ROLE_ENUM.ADMIN]: {
    id: "demo-admin",
    name: "Pengelola Pusat SAMBUNG",
    role: ROLE_ENUM.ADMIN,
    phone: "081122334455",
    email: "admin@sambung.id",
    province: "DKI Jakarta",
    regency: "Jakarta Pusat",
    district: "Gambir",
    businessName: "Badan Layanan Agrikultur",
    status: "active",
  },
};

const key = "sambung:demo-role:v1";
const eventName = "sambung:demo-role-change";

export function getDemoRole(): Role {
  if (typeof window === "undefined") return ROLE_ENUM.FARMER;
  try {
    return roleSchema.catch(ROLE_ENUM.FARMER).parse(sessionStorage.getItem(key));
  } catch {
    return ROLE_ENUM.FARMER;
  }
}

export function setDemoRole(role: Role) {
  if (!IS_MOCK_DATA)
    throw new Error("Pergantian role hanya tersedia dalam mode data mock.");
  sessionStorage.setItem(key, roleSchema.parse(role));
  window.dispatchEvent(new Event(eventName));
}

export function subscribeDemoRole(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
