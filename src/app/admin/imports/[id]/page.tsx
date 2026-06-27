"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type ImportDetail = {
  id: string;
  source_filename: string;
  total_records: number;
  personnel_count: number;
  vehicle_count: number;
  province_count: number;
  district_count: number;
  review_required_count: number;
  status: string;
  approved_at: string | null;
  created_at: string;
};

type RouteRecord = {
  id: string;
  company_name: string | null;
  personnel_name: string | null;
  vehicle_plate: string | null;
  province_name: string | null;
  district_name: string | null;
  neighborhood_name: string | null;
  raw_address: string | null;
  normalized_address: string | null;
  review_required: boolean;
  created_at: string;
};

type DetailResponse = {
  success: true;
  import: ImportDetail;
  records: RouteRecord[];
};

type ErrorResponse = { error?: string };

export default function ImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDetail() {
      try {
        const response = await fetch(`/api/admin/imports/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as DetailResponse | ErrorResponse;

        if (!response.ok || !("records" in result)) {
          throw new Error(
            "error" in result && result.error
              ? result.error
              : "Aktarım detayları yüklenemedi."
          );
        }

        setDetail(result.import);
        setRecords(result.records);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Aktarım detayları yüklenemedi."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadDetail();
    return () => controller.abort();
  }, [id]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <Link
            href="/admin/imports"
            className="text-sm text-sky-300 hover:text-sky-200"
          >
            ← Kayıt Geçmişine Dön
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Aktarım Detayı</h1>
          {detail ? (
            <p className="mt-2 break-all text-slate-300">
              Dosya: {detail.source_filename}
            </p>
          ) : null}
        </header>

        {loading ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
            Aktarım detayları yükleniyor...
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-800 bg-red-950/60 p-5 text-red-200">
            {error}
          </p>
        ) : null}

        {!loading && !error && detail ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <SummaryCard label="Toplam kayıt" value={detail.total_records} />
              <SummaryCard label="Personel sayısı" value={detail.personnel_count} />
              <SummaryCard label="Plaka sayısı" value={detail.vehicle_count} />
              <SummaryCard label="İl sayısı" value={detail.province_count} />
              <SummaryCard label="İlçe sayısı" value={detail.district_count} />
              <SummaryCard
                label="Kontrol gereken"
                value={detail.review_required_count}
              />
            </section>

            {records.length === 0 ? (
              <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
                Bu aktarımda kayıt bulunmuyor.
              </p>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        <TableHeader>Firma</TableHeader>
                        <TableHeader>Personel</TableHeader>
                        <TableHeader>Plaka</TableHeader>
                        <TableHeader>İl</TableHeader>
                        <TableHeader>İlçe</TableHeader>
                        <TableHeader>Mahalle</TableHeader>
                        <TableHeader>Adres</TableHeader>
                        <TableHeader>Kontrol</TableHeader>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {records.map((record) => (
                        <tr key={record.id} className="align-top text-slate-200">
                          <TableCell>{record.company_name || "-"}</TableCell>
                          <TableCell>{record.personnel_name || "-"}</TableCell>
                          <TableCell>{record.vehicle_plate || "-"}</TableCell>
                          <TableCell>{record.province_name || "-"}</TableCell>
                          <TableCell>{record.district_name || "-"}</TableCell>
                          <TableCell>{record.neighborhood_name || "-"}</TableCell>
                          <TableCell>
                            <span className="block min-w-64 whitespace-normal">
                              {record.normalized_address || record.raw_address || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                record.review_required
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                              }
                            >
                              {record.review_required ? "Gerekli" : "Gerekmiyor"}
                            </span>
                          </TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function TableHeader({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function TableCell({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4">{children}</td>;
}
