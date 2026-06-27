"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Personnel = {
  id: string;
  full_name: string;
  phone: string | null;
  login_code: string;
  is_active: boolean;
  created_at: string;
};

function getErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return fallback;
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPersonnel() {
      try {
        const response = await fetch("/api/admin/personnel", {
          signal: controller.signal,
        });
        const result: unknown = await response.json();

        if (
          !response.ok ||
          !result ||
          typeof result !== "object" ||
          !("personnel" in result) ||
          !Array.isArray(result.personnel)
        ) {
          throw new Error(
            getErrorMessage(result, "Personel listesi yüklenemedi.")
          );
        }

        setPersonnel(result.personnel as Personnel[]);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Personel listesi yüklenemedi."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPersonnel();
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/personnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, loginCode, isActive }),
      });
      const result: unknown = await response.json();

      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("personnel" in result)
      ) {
        setFormError(getErrorMessage(result, "Personel eklenemedi."));
        return;
      }

      setPersonnel((current) => [result.personnel as Personnel, ...current]);
      setFullName("");
      setPhone("");
      setLoginCode("");
      setIsActive(true);
      setSuccess("Personel sisteme kaydedildi.");
    } catch {
      setFormError("Personel eklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  const inputClassName =
    "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500";

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <Link href="/admin" className="text-sm text-sky-300 hover:text-sky-200">
            ← Admin panele dön
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Personel Yönetimi</h1>
          <p className="mt-2 text-slate-300">
            Personel kayıtlarını görüntüleyin ve sisteme yeni personel ekleyin.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Yeni Personel</h2>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-200">
                Ad Soyad
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClassName}
                  autoComplete="name"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-200">
                Telefon <span className="text-slate-500">(opsiyonel)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={inputClassName}
                  autoComplete="tel"
                />
              </label>

              <label className="block text-sm font-medium text-slate-200">
                Giriş Kodu
                <input
                  value={loginCode}
                  onChange={(event) => setLoginCode(event.target.value)}
                  className={inputClassName}
                  autoComplete="off"
                  required
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="size-4 accent-sky-500"
                />
                Personel aktif olarak eklensin
              </label>

              {formError ? (
                <p className="rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
                  {formError}
                </p>
              ) : null}

              {success ? (
                <p className="rounded-xl border border-emerald-800 bg-emerald-950/60 p-3 text-sm text-emerald-200">
                  {success}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {saving ? "Kaydediliyor..." : "Personel Ekle"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Personel Listesi</h2>
              {!loading && !loadError ? (
                <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                  {personnel.length} personel
                </span>
              ) : null}
            </div>

            {loading ? (
              <p className="mt-5 text-slate-300">Personel listesi yükleniyor...</p>
            ) : null}

            {loadError ? (
              <p className="mt-5 rounded-xl border border-red-800 bg-red-950/60 p-4 text-red-200">
                {loadError}
              </p>
            ) : null}

            {!loading && !loadError && personnel.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center text-slate-400">
                Henüz personel eklenmedi. İlk personel kaydını formdan
                oluşturabilirsiniz.
              </p>
            ) : null}

            {!loading && !loadError && personnel.length > 0 ? (
              <div className="mt-5 space-y-3">
                {personnel.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-white">
                          {item.full_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.phone || "Telefon bilgisi eklenmemiş"}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          Giriş kodu:{" "}
                          <span className="font-medium text-slate-100">
                            {item.login_code}
                          </span>
                        </p>
                      </div>
                      <span
                        className={
                          item.is_active
                            ? "w-fit rounded-full bg-emerald-950 px-3 py-1 text-sm text-emerald-300"
                            : "w-fit rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-400"
                        }
                      >
                        {item.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}