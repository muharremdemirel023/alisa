"use client";

import { ChangeEvent, useState } from "react";

type CountMap = Record<string, number>;

type ImportRecord = {
  row_id?: number | string;
  raw_block?: string;
  personnel_name?: string;
  plate_no?: string;
  province?: string;
  district?: string;
  merchant_no?: string;
  parse_status?: string;
};

type ImportData = {
  total_records: number;
  summary: {
    by_personnel: CountMap;
    by_plate: CountMap;
    by_province: CountMap;
    by_district: CountMap;
    review_required_count: number;
  };
  records: ImportRecord[];
};

function countKeys(map: CountMap | undefined) {
  return Object.keys(map || {}).length;
}

function sortedEntries(map: CountMap | undefined) {
  return Object.entries(map || {}).sort((a, b) => b[1] - a[1]);
}

function isValidImport(data: unknown): data is ImportData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.total_records !== "number") return false;
  if (!d.summary || typeof d.summary !== "object") return false;
  if (!Array.isArray(d.records)) return false;
  return true;
}

export default function AdminUploadPage() {
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState<ImportData | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError("");
    setWarning("");
    setData(null);
    setFileName("");
    setOpenRows({});

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Sadece .json dosyası yükleyin.");
      return;
    }

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);

      if (!isValidImport(parsed)) {
        setError("Bu dosya Alisa import JSON formatına uygun değil.");
        return;
      }

      if (parsed.total_records !== parsed.records.length) {
        setWarning(
          `Uyarı: total_records (${parsed.total_records}) ile kayıt listesi uzunluğu (${parsed.records.length}) eşleşmiyor.`
        );
      }

      setFileName(file.name);
      setData(parsed);
    } catch {
      setError("Geçerli bir JSON dosyası yükleyin.");
    }
  }

  function toggleRow(rowId: string) {
    setOpenRows((current) => ({
      ...current,
      [rowId]: !current[rowId],
    }));
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">PDF Import Önizleme</h1>
          <p className="mt-2 text-slate-300">
            Python PDF Engine çıktısı olan JSON dosyasını yükleyin. Bu aşamada
            veri sadece önizlenir.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="inline-flex cursor-pointer rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white">
            JSON Dosyası Seç
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFile}
            />
          </label>

          {fileName ? (
            <p className="mt-4 text-sm text-slate-300">
              Seçilen dosya: <b>{fileName}</b>
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl bg-red-900/40 p-3 text-red-200">
              {error}
            </p>
          ) : null}

          {warning ? (
            <p className="mt-4 rounded-xl bg-yellow-900/40 p-3 text-yellow-200">
              {warning}
            </p>
          ) : null}
        </section>

        {data ? (
          <>
            <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <SummaryCard title="Toplam Kayıt" value={data.total_records} />
              <SummaryCard
                title="Personel Sayısı"
                value={countKeys(data.summary.by_personnel)}
              />
              <SummaryCard
                title="Plaka Sayısı"
                value={countKeys(data.summary.by_plate)}
              />
              <SummaryCard
                title="İl Sayısı"
                value={countKeys(data.summary.by_province)}
              />
              <SummaryCard
                title="İlçe Sayısı"
                value={countKeys(data.summary.by_district)}
              />
              <SummaryCard
                title="Kontrol Gereken"
                value={data.summary.review_required_count}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Distribution
                title="Personel Dağılımı"
                items={sortedEntries(data.summary.by_personnel)}
              />
              <Distribution
                title="Plaka Dağılımı"
                items={sortedEntries(data.summary.by_plate)}
              />
              <Distribution
                title="İl Dağılımı"
                items={sortedEntries(data.summary.by_province)}
              />
              <Distribution
                title="İlçe Dağılımı"
                items={sortedEntries(data.summary.by_district)}
              />
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-bold">İlk 20 Kayıt</h2>

              <div className="mt-4 space-y-3">
                {data.records.slice(0, 20).map((record, index) => {
                  const rowId = String(record.row_id ?? index + 1);

                  return (
                    <div
                      key={rowId}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
                        <Field label="row_id" value={record.row_id ?? index + 1} />
                        <Field label="personnel_name" value={record.personnel_name} />
                        <Field label="plate_no" value={record.plate_no} />
                        <Field label="province" value={record.province} />
                        <Field label="district" value={record.district} />
                        <Field label="merchant_no" value={record.merchant_no} />
                        <Field label="parse_status" value={record.parse_status} />
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleRow(rowId)}
                        className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-sm text-sky-300"
                      >
                        {openRows[rowId] ? "raw_block Gizle" : "raw_block Göster"}
                      </button>

                      {openRows[rowId] ? (
                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-xs text-slate-300">
                          {record.raw_block || "Ham blok bulunamadı."}
                        </pre>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Distribution({
  title,
  items,
}: {
  title: string;
  items: [string, number][];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Veri bulunamadı.</p>
      ) : (
        <div className="space-y-2">
          {items.map(([name, count]) => (
            <div
              key={name}
              className="flex justify-between rounded-xl bg-slate-950 px-4 py-3"
            >
              <span>{name}</span>
              <b>{count}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="truncate text-sm text-slate-200">{String(value ?? "-")}</p>
    </div>
  );
}
