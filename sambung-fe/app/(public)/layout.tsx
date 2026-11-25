import PublicNavbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import type { ReactNode } from "react";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
