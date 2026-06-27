"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_CODE = "MERCH745";
const CODE_PATTERN = /^[A-Z]{5}\d+$/;

export default function PersonnelLoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleInput(value: string) {
    setCode(value.toUpperCase());
    setError("");
  }

  function handleSubmit() {
    const trimmed = code.trim();

    if (!trimmed) {
      setError("Personel kodu 5 harf ve devamında rakamlardan oluşmalıdır.");
      return;
    }

    if (!CODE_PATTERN.test(trimmed)) {
      setError("Personel kodu 5 harf ve devamında rakamlardan oluşmalıdır.");
      return;
    }

    if (trimmed !== DEMO_CODE) {
      setError("Geçersiz personel kodu");
      return;
    }

    router.push("/personnel");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Alisa
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sesli destekli saha görev asistanı
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <input
            type="text"
            placeholder="Personel Kodu Örn: MERCH745"
            value={code}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-12 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
          />
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 text-center">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full h-12 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Giriş Yap
          </button>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Personel kodunuz ile giriş yapın
        </p>
      </div>
    </div>
  );
}