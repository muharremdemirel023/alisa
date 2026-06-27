import Link from "next/link";

const adminLinks = [
  { label: "Adres Yükle", href: "#" },
  { label: "İl / İlçe / Mahalle Grupları", href: "#" },
  { label: "Personel Yönetimi", href: "#" },
  { label: "Atamalar", href: "#" },
  { label: "Kontrol Gerekli", href: "#" },
  { label: "Harita Takip", href: "#" },
];

export default function AdminPanelPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-black px-4 py-12">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 text-center">
          Admin Paneli
        </h1>

        <div className="grid grid-cols-1 gap-3">
          {adminLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}