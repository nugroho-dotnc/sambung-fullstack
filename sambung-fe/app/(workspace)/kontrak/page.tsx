"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ScrollText,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  CheckCheck,
  PenTool,
  Truck,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { AsyncBoundary } from "@/components/shared/async-boundary";
import { ListPagination, paginateItems } from "@/components/shared/list-pagination";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { useContracts } from "@/features/contracts/hooks/use-contracts";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { CONTRACT_STATUS_LABELS } from "@/features/contracts/domain/state-machine";
import {
  getPaymentDeadlineInfo,
  getPaymentStatusMeta,
  isContractPaid,
} from "@/features/contracts/domain/payment-helpers";
import { ProBadge } from "@/features/subscription/components/pro-badge";
import { useMobile } from "@/hooks/use-mobile";

function getPaymentBadgeClasses(tone: "emerald" | "blue" | "amber" | "danger" | "neutral"): string {
  switch (tone) {
    case "emerald":
      return "bg-primary/15 text-primary border border-primary/30";
    case "blue":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300/70 dark:border-blue-800/60";
    case "amber":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60";
    case "danger":
      return "bg-destructive/15 text-destructive border border-destructive/40";
    default:
      return "bg-muted text-muted-foreground border border-border/60";
  }
}

export default function ContractsListPage() {
  const isMobile = useMobile();
  const { data: user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<string>("all");
  const { data: contracts = [], isLoading, isError, error, refetch } = useContracts();
  const [now, setNow] = useState(() => Date.now());
  const contractsPageSize = 6;
  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: activeTab,
    page: 1,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const contractTabOptions = useMemo(
    () => [
      { value: "all", label: `Semua Kesepakatan (${contracts.length})` },
      { value: "pending", label: "Menunggu Kesepakatan" },
      { value: "approved", label: "Disetujui" },
      { value: "completed", label: "Selesai" },
      { value: "cancelled", label: "Dibatalkan / Berakhir" },
    ],
    [contracts.length]
  );

  const filteredContracts = useMemo(() => {
    if (activeTab === "all") return contracts;
    if (activeTab === "pending") return contracts.filter((c) => c.status === "pending");
    if (activeTab === "approved") {
      return contracts.filter(
        (c) => c.status === "approved" || c.status === "signed" || c.status === "shipping"
      );
    }
    if (activeTab === "completed") return contracts.filter((c) => c.status === "completed");
    if (activeTab === "cancelled") {
      return contracts.filter(
        (c) => c.status === "cancelled" || c.status === "rejected" || c.status === "expired"
      );
    }
    return contracts;
  }, [contracts, activeTab]);

  const pagedContracts = paginateItems(
    filteredContracts,
    pageState.key === activeTab ? pageState.page : 1,
    contractsPageSize
  );

  return (
    <PageContainer>
      <PageHeader
        title="Kontrak & Kesepakatan Pasokan"
        description="Pantau dan kelola seluruh kesepakatan pasokan gabah Anda, mulai dari proses tawar-menawar harga hingga serah terima fisik selesai."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Mobile Filter: Select Dropdown */}
        <div className="sm:hidden">
          <Select
            items={contractTabOptions}
            value={activeTab}
            onValueChange={(val) => {
              if (val) setActiveTab(val);
            }}
          >
            <SelectTrigger className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium shadow-2xs">
              <SelectValue placeholder="Pilih status kesepakatan" />
            </SelectTrigger>
            <SelectContent>
              {contractTabOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tablet & Desktop: TabsList */}
        <TabsList className="hidden sm:flex bg-muted/80 p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="all" className="px-3 text-xs rounded-lg cursor-pointer">
            Semua Kesepakatan ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className=" px-3 text-xs rounded-lg cursor-pointer">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Menunggu Kesepakatan
          </TabsTrigger>
          <TabsTrigger value="approved" className=" px-3 text-xs rounded-lg cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Disetujui
          </TabsTrigger>
          <TabsTrigger value="completed" className=" px-3 text-xs rounded-lg cursor-pointer">
            <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Selesai
          </TabsTrigger>
          <TabsTrigger value="cancelled" className=" px-3 text-xs rounded-lg cursor-pointer">
            <XCircle className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Dibatalkan / Berakhir
          </TabsTrigger>
        </TabsList>

        <AsyncBoundary
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
          isEmpty={filteredContracts.length === 0}
          emptyFallback={
            <Card className="rounded-2xl border-border/80 bg-card p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <ScrollText className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Belum Ada Kesepakatan di Kategori Ini
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                {user?.role === "petani"
                  ? "Saat produsen mengajukan pesanan atas tawaran panen Anda, lembar kesepakatan akan langsung terbit di sini untuk Anda tinjau atau negosiasikan."
                  : "Saat Anda mengajukan pesanan pasokan dari katalog panen, lembar kesepakatan akan langsung terbit di sini untuk bernegosiasi dengan petani."}
              </p>
              {user?.role === "pembeli" && (
                <ButtonLink
                  href="/pembeli/katalog"
                  className="mt-3 min-h-10 text-xs"
                >
                  {isMobile ? "Buka Katalog" : "Buka Katalog Pasokan"}
                </ButtonLink>
              )}
            </Card>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {pagedContracts.items.map((contract) => {
              const partnerName =
                user?.role === "petani"
                  ? contract.buyerBusiness || contract.buyerName
                  : contract.farmerBusiness || contract.farmerName;

              const statusMeta = CONTRACT_STATUS_LABELS[contract.status];
              const totalValue = contract.volumeKg * contract.currentPrice;
              const paymentMeta = getPaymentStatusMeta(contract);
              const paid = isContractPaid(contract);
              const deadline = getPaymentDeadlineInfo(contract, now);

              return (
                <Card
                  key={contract.id}
                  className="rounded-2xl border-border/80 bg-card p-5 space-y-4 hover:border-foreground/30 transition shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary whitespace-nowrap">
                          Gabah {contract.grainType}
                        </span>

                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                            contract.status === "signed" || contract.status === "completed"
                              ? "bg-primary/15 text-primary"
                              : contract.status === "shipping"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                              : contract.status === "approved" || contract.status === "pending"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block">
                        Mitra Transaksi:
                      </span>
                      <h3 className="font-bold text-base text-foreground flex items-center gap-2 flex-wrap">
                        <span>{partnerName}</span>
                        {user?.role === "petani" && contract.buyerIsPro && (
                          <ProBadge size="xs" />
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Kec. {contract.district}, Kab. {contract.regency}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-muted-foreground">Harga Kesepakatan / Nego:</span>
                        <span className="text-base font-bold tabular-nums text-foreground">
                          {formatRupiah(contract.currentPrice)}{" "}
                          <span className="text-xs font-normal text-muted-foreground font-sans">
                            / kg
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-xs text-muted-foreground">Volume Komitmen:</span>
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {contract.volumeKg.toLocaleString("id-ID")} kg
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1 border-t border-border/40">
                        <span className="text-xs font-semibold text-foreground">Total Nilai:</span>
                        <span className="text-sm font-bold tabular-nums text-primary">
                          {formatRupiah(totalValue)}
                        </span>
                      </div>
                    </div>

                    {(["signed", "shipping", "completed"].includes(contract.status) ||
                      Boolean(contract.payment)) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-1">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                          <CreditCard className="w-3.5 h-3.5" />
                          Pembayaran Escrow:
                        </span>
                        <span
                          className={`font-semibold px-2.5 py-0.5 rounded-full ${getPaymentBadgeClasses(
                            paymentMeta.tone
                          )}`}
                        >
                          {paymentMeta.shortLabel}
                        </span>
                      </div>
                    )}

                    {/* Pending Urgency or Confirmation Status */}
                    {contract.status === "pending" && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {contract.currentTurnRole === user?.role
                            ? "Giliran Anda untuk menanggapi negosiasi harga."
                            : "Menunggu tanggapan harga dari mitra."}
                        </span>
                      </div>
                    )}

                    {contract.status === "approved" && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                        <PenTool className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Harga disepakati. Menunggu kelengkapan tanda tangan digital.
                        </span>
                      </div>
                    )}

                    {contract.status === "signed" && !paid && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                        {deadline.phase === "grace" || deadline.phase === "overdue" ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>
                          {deadline.phase === "grace"
                            ? "Masa tenggang 3 hari pembayaran escrow sedang berjalan."
                            : deadline.phase === "overdue"
                            ? "Batas waktu pembayaran escrow telah terlewati."
                            : user?.role === "pembeli"
                            ? "Menunggu Anda menyelesaikan pembayaran escrow (7 hari)."
                            : "Menunggu produsen melunasi pembayaran escrow sebelum kirim."}
                        </span>
                      </div>
                    )}

                    {contract.status === "signed" && paid && (
                      <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/25">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Pembayaran escrow lunas — siap untuk pengiriman gabah.
                        </span>
                      </div>
                    )}

                    {contract.status === "shipping" && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60">
                        <Truck className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Gabah sedang dalam proses pengiriman armada.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <ButtonLink
                      className="w-full min-h-10 text-xs font-semibold justify-between"
                      variant="outline"
                      href={`/kontrak/${contract.id}`}
                    >
                      {isMobile ? "Buka Kesepakatan" : "Buka Ruang Kesepakatan"}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </ButtonLink>
                  </div>
                </Card>
              );
            })}
          </div>
          <ListPagination
            totalItems={pagedContracts.totalItems}
            currentPage={pagedContracts.currentPage}
            pageSize={contractsPageSize}
            onPageChange={(page) => setPageState({ key: activeTab, page })}
            itemLabel="kesepakatan"
            className="pt-4"
          />
        </AsyncBoundary>
      </Tabs>
    </PageContainer>
  );
}
