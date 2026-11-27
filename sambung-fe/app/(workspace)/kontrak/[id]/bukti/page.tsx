"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, ShieldCheck, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { DocumentSheetSkeleton } from "@/components/shared/page-skeletons";
import { useContract } from "@/features/contracts/hooks/use-contracts";
import {
  computeContractPaymentBreakdown,
  formatPaymentChannel,
  formatPaymentDateTime,
  getPaymentStatusMeta,
} from "@/features/contracts/domain/payment-helpers";
import { formatRupiah } from "@/features/offers/components/offer-summary";
import { useMobile } from "@/hooks/use-mobile";

export default function DigitalContractProofPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isMobile = useMobile();
  const { id } = use(params);
  const { data: contract, isLoading, isError } = useContract(id);

  if (isLoading) {
    return (
      <PageContainer>
        <DocumentSheetSkeleton label="Menyiapkan surat kesepakatan..." />
      </PageContainer>
    );
  }

  if (isError || !contract || !["approved", "signed", "shipping", "completed"].includes(contract.status)) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-dashed p-12 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Dokumen Tidak Ditemukan</h2>
          <Button
            render={<Link href="/kontrak">Kembali ke Daftar Kontrak</Link>}
            className="mt-3 min-h-10 text-xs"
          />
        </div>
      </PageContainer>
    );
  }

  const breakdown = computeContractPaymentBreakdown(contract);
  const totalValue = breakdown.contractAmount;
  const paymentMeta = getPaymentStatusMeta(contract);

  return (
    <PageContainer className="print:p-0 print:max-w-none">
      {/* Non-print action header */}
      <div className="print:hidden flex items-center justify-between gap-4 mb-6">
        <Link
          href={`/kontrak/${contract.id}`}
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          {isMobile ? "Kembali" : "Kembali ke Ruang Kesepakatan"}
        </Link>

        <Button
          className="min-h-10 text-xs gap-1.5"
          onClick={() => window.print()}
        >
          <Printer className="w-4 h-4" />
          {isMobile ? "Cetak PDF" : "Cetak Surat Kesepakatan (PDF)"}
        </Button>
      </div>

      {/* Official Agreement Sheet (Print-optimized) */}
      <div className="rounded-2xl border border-border/90 bg-card p-8 sm:p-12 shadow-sm space-y-8 text-foreground print:border-none print:shadow-none print:p-0 print:m-0 print:space-y-4">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-foreground/20 pb-6 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                S
              </div>
              <span className="font-extrabold text-base tracking-wider uppercase font-display">
                SAMBUNG
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              SIMULASI · Bukti kesepakatan pasokan gabah
            </p>
          </div>

          <div className="text-left sm:text-right space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Nomor Surat Kesepakatan
            </span>
            <span className="font-bold text-sm text-foreground">
              {contract.id.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground block">
              Diterbitkan: {new Date(contract.updatedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1 py-2">
          <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide font-display text-foreground">
            Surat Bukti Kesepakatan Pasokan Gabah
          </h1>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto">
            Komitmen pasokan digital yang telah disepakati bersama antara pihak Petani dan Pembeli melalui platform SAMBUNG.
          </p>
        </div>

        {/* Parties Box */}
        <div className="grid sm:grid-cols-2 gap-6 text-xs">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
              Pihak Pertama (Petani / Poktan)
            </span>
            <p className="text-sm font-bold text-foreground">
              {contract.farmerBusiness || contract.farmerName}
            </p>
            <p className="text-muted-foreground">
              Penanggung Jawab: {contract.farmerName}
            </p>
            <p className="text-muted-foreground ">
              {contract.farmerPhone && "Kontak: "+contract.farmerPhone}
            </p>
            <p className="text-muted-foreground">
              Lokasi: Kec. {contract.district}, Kab. {contract.regency}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 block">
              Pihak Kedua (Pembeli / Penggilingan)
            </span>
            <p className="text-sm font-bold text-foreground">
              {contract.buyerBusiness || contract.buyerName}
            </p>
            <p className="text-muted-foreground">
              Penanggung Jawab: {contract.buyerName}
            </p>
            <p className="text-muted-foreground ">
              {contract.buyerPhone && "Kontak: "+contract.buyerPhone}
            </p>
            <p className="text-muted-foreground">
              Wilayah Operasional: Kab. {contract.regency}
            </p>
          </div>
        </div>

        {/* Commodity and Agreed Value */}
        <div className="rounded-xl border border-border/80 overflow-x-auto text-xs">
          <table className="w-full min-w-[500px] text-left">
            <thead className="bg-muted/60 border-b border-border/80 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="p-3.5">Komoditas Gabah</th>
                <th className="p-3.5 text-right">Volume Komitmen</th>
                <th className="p-3.5 text-right">Harga Disepakati</th>
                <th className="p-3.5 text-right">Total Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="p-3.5 font-semibold">
                  Gabah {contract.grainType} ({contract.grainType === "GKP" ? "Kering Panen" : "Kering Giling"})
                </td>
                <td className="p-3.5 text-right tabular-nums">
                  {contract.volumeKg.toLocaleString("id-ID")} kg
                </td>
                <td className="p-3.5 text-right tabular-nums">
                  {formatRupiah(contract.currentPrice)} / kg
                </td>
                <td className="p-3.5 text-right tabular-nums font-bold text-foreground">
                  {formatRupiah(totalValue)}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-muted/30 border-t border-border/80">
              <tr className="border-b border-border/50">
                <td colSpan={3} className="px-3.5 py-2.5 text-right text-xs font-medium text-muted-foreground">
                  Nilai Bersih Gabah (100% Hak Petani):
                </td>
                <td className="px-3.5 py-2.5 text-right tabular-nums text-xs font-semibold text-foreground">
                  {formatRupiah(breakdown.contractAmount)}
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td colSpan={3} className="px-3.5 py-2.5 text-right text-xs font-medium text-muted-foreground">
                  Biaya Layanan Pembayaran (0,5% · Ditanggung Pembeli):
                </td>
                <td className="px-3.5 py-2.5 text-right tabular-nums text-xs font-semibold text-foreground">
                  {formatRupiah(breakdown.buyerFeeAmount)}
                </td>
              </tr>
              <tr className="font-bold">
                <td colSpan={3} className="p-3.5 text-right text-xs">
                  Total Tagihan Escrow (Midtrans):
                </td>
                <td className="p-3.5 text-right tabular-nums text-sm text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(breakdown.grossAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bukti Pembayaran & Status Escrow (Midtrans Sandbox) */}
        {(Boolean(contract.payment) ||
          ["signed", "shipping", "completed"].includes(contract.status)) && (
          <div className="rounded-xl border border-border/80 bg-muted/15 p-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bukti Pembayaran &amp; Status Escrow (Midtrans Sandbox)</span>
              </div>
              <span className="font-semibold text-foreground">
                {paymentMeta.label}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono font-semibold text-foreground">
                  {contract.payment?.orderId ?? "-"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Kanal Pembayaran:</span>
                <span className="font-semibold text-foreground">
                  {contract.payment
                    ? formatPaymentChannel(contract.payment)
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Referensi / Nomor VA:</span>
                <span className="font-mono font-semibold text-foreground">
                  {contract.payment?.paymentReference ?? "-"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">ID Transaksi Midtrans:</span>
                <span className="font-mono text-foreground">
                  {contract.payment?.midtransTransactionId ?? "-"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Waktu Pelunasan:</span>
                <span className="tabular-nums text-foreground">
                  {formatPaymentDateTime(contract.payment?.paidAt)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Waktu Pencairan Escrow:</span>
                <span className="tabular-nums font-medium text-foreground">
                  {contract.payment?.escrowStatus === "released"
                    ? formatPaymentDateTime(contract.payment.releasedAt)
                    : contract.payment?.escrowStatus === "held"
                    ? "Ditahan sampai serah terima selesai"
                    : "-"}
                </span>
              </div>
              {contract.payment?.status !== "paid" &&
                (contract.paymentDueAt || contract.paymentGraceEndsAt) && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Tenggat Bayar (7 Hari):</span>
                      <span className="tabular-nums text-foreground">
                        {formatPaymentDateTime(contract.paymentDueAt)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Batas Masa Tenggang (+3 Hari):</span>
                      <span className="tabular-nums text-foreground">
                        {formatPaymentDateTime(contract.paymentGraceEndsAt)}
                      </span>
                    </div>
                  </>
                )}
            </div>
          </div>
        )}

        {/* Clauses / Legal Disclaimer */}
        <div className="rounded-xl bg-muted/20 p-4 border border-border/60 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          <p className="font-semibold text-foreground">Ketentuan Komitmen:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>
              Bukti simulasi ini mencatat volume dan harga yang disepakati di SAMBUNG. {contract.priceReference && "Sumber acuan: "+contract.priceReference.referenceSource+" "+(contract.priceReference.sourceDate ?? "")}
            </li>
            <li>
              Penimbangan tonase riil, pemeriksaan mutu/kadar air fisik, dan serah terima gabah dilakukan secara mandiri di lokasi penjemputan gabah.
            </li>
            <li>
              Pembayaran transaksi diproses melalui escrow Midtrans Sandbox (nilai gabah 100% menjadi hak bersih Petani ditambah biaya layanan 0,5% yang ditanggung Pembeli) dalam tenggat 7 hari sejak penandatanganan lengkap dengan masa tenggang 3 hari; dana escrow dicairkan kepada Petani setelah Pembeli mengonfirmasi penerimaan gabah.
            </li>
          </ol>
        </div>

        {/* Digital Signatures and QR Code Mockup */}
        <div className="pt-6 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 items-end text-center text-xs">
          {/* Pihak Pertama (Petani) */}
          <div className="space-y-3 order-1 sm:order-none">
            <span className="text-muted-foreground text-xs font-semibold block">Pihak Pertama</span>
            <div className="min-h-16 flex flex-col items-center justify-center">
              {contract.farmerSignature ? (
                contract.farmerSignatureType === "draw" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={contract.farmerSignature}
                    alt={`Tanda tangan ${contract.farmerName}`}
                    className="h-16 max-w-[180px] object-contain dark:invert print:invert-0"
                  />
                ) : (
                  <span className="font-signature text-2xl sm:text-3xl text-foreground tracking-wide py-2">
                    {contract.farmerSignature}
                  </span>
                )
              ) : (
                <span className="text-xs text-muted-foreground italic border border-dashed border-border px-3 py-2 rounded-lg">
                  Menunggu Tanda Tangan
                </span>
              )}
            </div>
            <div className="border-t border-foreground/30 pt-1">
              <p className="font-bold text-foreground">{contract.farmerName}</p>
              <p className="text-xs text-muted-foreground">Petani / Poktan</p>
              {contract.farmerSignedAt && (
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Ditandatangani: {new Date(contract.farmerSignedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Status QR Code Verification */}
          <div className="space-y-2 flex flex-col items-center order-3 sm:order-none pt-2 sm:pt-0">
            <div className="w-16 h-16 rounded-xl border border-border/80 bg-muted/40 flex items-center justify-center text-muted-foreground">
              <QrCode className="w-10 h-10 text-foreground/80" />
            </div>
            <span className="text-xs text-muted-foreground block font-medium">
              {contract.status === "signed" || contract.status === "shipping" || contract.status === "completed"
                ? "Terverifikasi Sah Digital"
                : "Draf Kesepakatan"}
            </span>
          </div>

          {/* Pihak Kedua (Pembeli) */}
          <div className="space-y-3 order-2 sm:order-none">
            <span className="text-muted-foreground text-xs font-semibold block">Pihak Kedua</span>
            <div className="min-h-16 flex flex-col items-center justify-center">
              {contract.buyerSignature ? (
                contract.buyerSignatureType === "draw" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={contract.buyerSignature}
                    alt={`Tanda tangan ${contract.buyerName}`}
                    className="h-16 max-w-[180px] object-contain dark:invert print:invert-0"
                  />
                ) : (
                  <span className="font-signature text-2xl sm:text-3xl text-foreground tracking-wide py-2">
                    {contract.buyerSignature}
                  </span>
                )
              ) : (
                <span className="text-xs text-muted-foreground italic border border-dashed border-border px-3 py-2 rounded-lg">
                  Menunggu Tanda Tangan
                </span>
              )}
            </div>
            <div className="border-t border-foreground/30 pt-1">
              <p className="font-bold text-foreground">{contract.buyerName}</p>
              <p className="text-xs text-muted-foreground">Pembeli / Penggilingan</p>
              {contract.buyerSignedAt && (
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Ditandatangani: {new Date(contract.buyerSignedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
