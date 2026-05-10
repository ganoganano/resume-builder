"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "プロフィール", href: "/edit/profile" },
  { label: "在籍履歴", href: "/edit/employment" },
  { label: "プロジェクト", href: "/edit/projects" },
  { label: "スキル", href: "/edit/skills" },
  { label: "資格", href: "/edit/certifications" },
  { label: "設定", href: "/edit/settings" },
  { label: "プレビュー", href: "/preview" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-56 min-h-screen bg-slate-900 text-white p-4 fixed left-0 top-0">
      <h2 className="font-bold mb-4 leading-snug text-white">職務経歴<br />管理システム</h2>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded text-sm text-white transition-colors ${
                active ? "bg-blue-600" : "bg-slate-800/40 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
