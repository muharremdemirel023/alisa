"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ImportSummary = {
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

type ImportsResponse = {
  success: true;
  imports: ImportSummary[];
};

type ErrorResponse = { error?: string };

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  previewed: "Önizlendi",
  approved: "Onaylandı",
  imported: "Kaydedildi",
  failed: "Başarısız",
  archived: "Arşivlendi",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR");
}

export default function ImportsPage() {
  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadImports() {
      try {
        const response = await fetch("/api/admin/imports", {
          signal: controller.signal,
        });
        const result = (await response.json()) as ImportsResponse | ErrorResponse;

        if (!response.ok || !("imports" in result)) {
          throw new Error(
            "error" in result && result.error
              ? result.error
              : "Kayıt geçmişi yüklenemedi."
          );
        }

        setImports(result.imports);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Kayıt geçmişi yüklenemedi."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadImports();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <Link href="/admin" className="text-sm text-sky-300 hover:text-sky-200">
            ← Admin panele dön
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Kayıt Geçmişi</h1>
          <p className="mt-2 text-slate-300">
            Veritabanına kaydedilen adres aktarım paketlerini buradan
            inceleyebilirsiniz.
          </p>
        </header>

        {loading ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
            Kayıt geçmişi yükleniyor...
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-800 bg-red-950/60 p-5 text-red-200">
            {error}
          </p>
        ) : null}

        {!loading && !error && imports.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
            Henüz kaydedilmiş aktarım yok.
          </p>
        ) : null}

        {!loading && !error && imports.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {imports.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Dosya adı
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-white">
                      {item.source_filename}
                    </h2>
                  </div>
                  <span className="w-fit rounded-full bg-sky-950 px-3 py-1 text-sm text-sky-200">
                    {statusLabels[item.status] ?? "Bilinmiyor"}
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <Metric label="Toplam kayıt" value={item.total_records} />
                  <Metric label="Personel" value={item.personnel_count} />
                  <Metric label="Plaka" value={item.vehicle_count} />
                  <Metric
                    label="İl / ilçe"
                    value={`${item.province_count} / ${item.district_count}`}
                  />
                  <Metric
                    label="Kontrol gereken"
                    value={item.review_required_count}
                  />
                  <Metric
                    label="Tarih"
                    value={formatDate(item.approved_at ?? item.created_at)}
                  />
                </dl>

                <Link
                  href={`/admin/imports/${item.id}`}
                  className="mt-5 inline-flex rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-400"
                >
                  Detayı Gör
                </Link>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-100">{value}</dd>
    </div>
  );
}
