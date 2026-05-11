"use client";

import { useEffect, useState } from "react";
import { exportBackup, fetchSettings, importBackup, ResumeSettings, updateSettings } from "@/lib/api";

const defaultSettings: ResumeSettings = {
  skills_on_new_page: false,
  certifications_on_new_page: false,
  allow_section_split: false,
  font_scale: 1.0,
  section_order: ["self_pr", "employment", "skills", "certifications"],
  section_page_breaks: {
    self_pr: false,
    employment: false,
    skills: false,
    certifications: false,
  },
};

const sectionLabels: Record<ResumeSettings["section_order"][number], string> = {
  self_pr: "自己PR",
  employment: "職務経歴",
  skills: "スキル",
  certifications: "資格",
};

export default function SettingsPage() {
  const [form, setForm] = useState<ResumeSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then(setForm)
      .finally(() => setLoading(false));
  }, []);

  const moveSection = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= form.section_order.length) return;
    const nextOrder = [...form.section_order];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    setForm({ ...form, section_order: nextOrder });
  };

  const save = async () => {
    const saved = await updateSettings(form);
    setForm(saved);
  };

  const handleExport = async () => {
    const blob = await exportBackup();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resume-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importBackup(parsed);
      const settings = await fetchSettings();
      setForm(settings);
      window.alert("バックアップを取り込みました。");
    } catch (error) {
      window.alert(`インポートに失敗しました: ${String(error)}`);
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <p>読み込み中...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">設定</h2>

      <div className="card space-y-4">
        <div className="space-y-3">
          <h3 className="text-base font-semibold">ページ設定</h3>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.skills_on_new_page}
              onChange={(e) => setForm({ ...form, skills_on_new_page: e.target.checked })}
            />
            <div>
              <div className="font-medium">スキルを新しいページから開始する</div>
              <p className="text-sm text-slate-500">有効にすると、スキルセクションは前の内容から切り離して次ページの先頭から出力します。</p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.certifications_on_new_page}
              onChange={(e) => setForm({ ...form, certifications_on_new_page: e.target.checked })}
            />
            <div>
              <div className="font-medium">資格を新しいページから開始する</div>
              <p className="text-sm text-slate-500">有効にすると、資格セクションは前の内容から切り離して次ページの先頭から出力します。</p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.allow_section_split}
              onChange={(e) => setForm({ ...form, allow_section_split: e.target.checked })}
            />
            <div>
              <div className="font-medium">セクションの内容が改ページをまたいでもよい</div>
              <p className="text-sm text-slate-500">有効にすると、職務経歴などのまとまりを 1 ページ内に閉じ込めず、途中で次ページへ続けて出力します。余白が減る代わりに、セクションがページ途中で分かれることがあります。</p>
            </div>
          </label>

          <div className="space-y-2">
            <div className="font-medium">フォントサイズ</div>
            <input
              type="range"
              min="0.85"
              max="1.25"
              step="0.05"
              value={form.font_scale}
              onChange={(e) => setForm({ ...form, font_scale: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-sm text-slate-500">現在: {Math.round(form.font_scale * 100)}% 。PDF とプレビューの本文サイズに反映します。</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold">大段落の並び順</h3>
          <p className="text-sm text-slate-500">プレビューと PDF に表示するセクション順です。上下ボタンで並び替えます。</p>

          <div className="rounded border divide-y">
            {form.section_order.map((sectionKey, index) => (
              <div key={sectionKey} className="flex items-center justify-between px-4 py-3 bg-white">
                <div className="space-y-2">
                  <span className="font-medium">{sectionLabels[sectionKey]}</span>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.section_page_breaks[sectionKey]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          section_page_breaks: { ...form.section_page_breaks, [sectionKey]: e.target.checked },
                        })
                      }
                    />
                    新しいページから開始
                  </label>
                </div>
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs whitespace-nowrap"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs whitespace-nowrap"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === form.section_order.length - 1}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold">バックアップ</h3>
          <p className="text-sm text-slate-500">プロフィール、職務経歴、プロジェクト、スキル、資格、設定を JSON で保存・復元できます。</p>

          <div className="flex flex-wrap gap-3 items-center">
            <button className="btn-secondary" onClick={handleExport}>JSONをエクスポート</button>
            <label className="btn-secondary cursor-pointer">
              JSONをインポート
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  void handleImport(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn-primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  );
}
