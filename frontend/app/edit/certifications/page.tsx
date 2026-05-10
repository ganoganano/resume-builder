"use client";

import { useEffect, useState } from "react";
import {
  createCertification,
  deleteCertification,
  fetchCertifications,
  Certification,
  reorderCertifications,
  updateCertification,
} from "@/lib/api";

function RequiredLabel({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={`text-sm font-medium ${disabled ? "text-slate-400" : ""}`}>
      {children}
      <span className="text-red-600 ml-1">*</span>
    </label>
  );
}

export default function CertificationsPage() {
  const [rows, setRows] = useState<Certification[]>([]);
  const [draft, setDraft] = useState({ date: "", name: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isFormEnabled = isCreating || editingId !== null;
  const actionButtonClass = "btn-secondary px-3 py-1.5 text-xs whitespace-nowrap";

  const load = () => fetchCertifications().then(setRows);
  useEffect(() => {
    load();
  }, []);

  const validDate = (v: string) => !v || /^\d{4}-\d{2}$/.test(v);

  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    const next = [...rows];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setRows(next.map((row, idx) => ({ ...row, sort_order: idx })));

    try {
      await reorderCertifications(next.map((row) => row.id));
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "並び替えに失敗しました");
      await load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">資格編集</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setDraft({ date: "", name: "" });
          }}
        >
          新規追加
        </button>
      </div>
      <div className="card space-y-2">
        <label className={`text-sm font-medium ${!isFormEnabled ? "text-slate-400" : ""}`}>取得年月</label>
        <input className="input disabled:bg-slate-100 disabled:text-slate-500" disabled={!isFormEnabled} type="month" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <RequiredLabel disabled={!isFormEnabled}>資格名</RequiredLabel>
        <input className="input disabled:bg-slate-100 disabled:text-slate-500" disabled={!isFormEnabled} placeholder="資格名" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" disabled={!isFormEnabled} onClick={async () => {
            if (!validDate(draft.date)) return alert("日付形式は YYYY-MM");
            if (editingId) await updateCertification(editingId, draft);
            else await createCertification(draft);
            setDraft({ date: "", name: "" });
            setEditingId(null);
            setIsCreating(false);
            await load();
          }}>保存</button>
          <button
            className="btn-secondary disabled:opacity-50"
            disabled={!isFormEnabled}
            onClick={() => {
              setDraft({ date: "", name: "" });
              setEditingId(null);
              setIsCreating(false);
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-3">資格一覧</h3>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-36" />
                <col />
                <col className="w-56" />
              </colgroup>
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2 pr-4 font-medium">取得年月</th>
                  <th className="py-2 pr-4 font-medium">資格名</th>
                  <th className="py-2 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
                  <tr key={r.id} className="border-b last:border-b-0 align-top">
                    <td className="py-3 pr-4 text-slate-600">{r.date || "-"}</td>
                    <td className="py-3 pr-4 break-words">{r.name}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <button className={actionButtonClass} onClick={() => move(index, -1)}>↑</button>
                        <button className={actionButtonClass} onClick={() => move(index, 1)}>↓</button>
                        <button className={actionButtonClass} onClick={() => { setIsCreating(false); setEditingId(r.id); setDraft({ date: r.date || "", name: r.name || "" }); }}>編集</button>
                        <button className={actionButtonClass} onClick={async () => { if (confirm("削除しますか？")) { await deleteCertification(r.id); await load(); } }}>削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">資格なし</p>
        )}
      </div>
    </div>
  );
}
