"use client";

import { useEffect, useState } from "react";
import {
  createEmployment,
  deleteEmployment,
  Employment,
  fetchEmployments,
  reorderEmployments,
  updateEmployment,
} from "@/lib/api";

type Draft = { company_name: string; start_date: string; end_date: string; note: string };
const emptyDraft: Draft = { company_name: "", start_date: "", end_date: "", note: "" };

function RequiredLabel({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={`text-sm font-medium ${disabled ? "text-slate-400" : ""}`}>
      {children}
      <span className="text-red-600 ml-1">*</span>
    </label>
  );
}

export default function EmploymentPage() {
  const [rows, setRows] = useState<Employment[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isFormEnabled = isCreating || editingId !== null;
  const actionButtonClass = "btn-secondary px-3 py-1.5 text-xs whitespace-nowrap";

  const load = () => fetchEmployments().then(setRows);
  useEffect(() => {
    load();
  }, []);

  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    const next = [...rows];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setRows(next.map((row, idx) => ({ ...row, sort_order: idx })));

    try {
      await reorderEmployments(next.map((row) => row.id));
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "並び替えに失敗しました");
      await load();
    }
  };

  const save = async () => {
    const datePattern = /^\d{4}-\d{2}$/;
    const normalized = {
      company_name: draft.company_name.trim(),
      start_date: draft.start_date.trim(),
      end_date: draft.end_date.trim() || null,
      note: draft.note.trim() || null,
    };

    if (!normalized.company_name) {
      alert("会社名は必須です");
      return;
    }
    if (!normalized.start_date || !datePattern.test(normalized.start_date)) {
      alert("開始年月は YYYY-MM 形式で入力してください");
      return;
    }
    if (normalized.end_date && !datePattern.test(normalized.end_date)) {
      alert("終了年月は YYYY-MM 形式で入力してください");
      return;
    }

    try {
      if (editingId) await updateEmployment(editingId, normalized);
      else await createEmployment(normalized);
      setDraft(emptyDraft);
      setEditingId(null);
      setIsCreating(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">在籍履歴編集</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setDraft(emptyDraft);
          }}
        >
          新規追加
        </button>
      </div>
      <div className="card space-y-2">
        <RequiredLabel disabled={!isFormEnabled}>会社名</RequiredLabel>
        <input className="input disabled:bg-slate-100 disabled:text-slate-500" disabled={!isFormEnabled} placeholder="会社名" value={draft.company_name} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} />
        <RequiredLabel disabled={!isFormEnabled}>開始年月</RequiredLabel>
        <input className="input disabled:bg-slate-100 disabled:text-slate-500" disabled={!isFormEnabled} type="month" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
        <label className={`text-sm font-medium ${!isFormEnabled ? "text-slate-400" : ""}`}>終了年月</label>
        <input className="input disabled:bg-slate-100 disabled:text-slate-500" disabled={!isFormEnabled} type="month" min={draft.start_date || undefined} value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} />
        <label className={`text-sm font-medium ${!isFormEnabled ? "text-slate-400" : ""}`}>備考</label>
        <textarea className="input min-h-20 disabled:bg-slate-100 disabled:text-slate-500" disabled={!isFormEnabled} placeholder="メモ" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" disabled={!isFormEnabled} onClick={save}>保存</button>
          <button className="btn-secondary disabled:opacity-50" disabled={!isFormEnabled} onClick={() => { setDraft(emptyDraft); setEditingId(null); setIsCreating(false); }}>キャンセル</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">在籍企業一覧</h3>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-56" />
                <col className="w-40" />
                <col />
                <col className="w-56" />
              </colgroup>
              <thead>
                <tr className="border-b text-left text-slate-600">
                  <th className="py-2 pr-4 font-medium">会社名</th>
                  <th className="py-2 pr-4 font-medium">期間</th>
                  <th className="py-2 pr-4 font-medium">備考</th>
                  <th className="py-2 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((employment, index) => (
                  <tr key={employment.id} className="border-b last:border-b-0 align-top">
                    <td className="py-3 pr-4 font-medium">{employment.company_name}</td>
                    <td className="py-3 pr-4 text-slate-600">{employment.start_date} - {employment.end_date || "現在"}</td>
                    <td className="py-3 pr-4 break-words">{employment.note || "-"}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <button className={actionButtonClass} onClick={() => move(index, -1)}>↑</button>
                        <button className={actionButtonClass} onClick={() => move(index, 1)}>↓</button>
                        <button className={actionButtonClass} onClick={() => {
                          setIsCreating(false);
                          setEditingId(employment.id);
                          setDraft({
                            company_name: employment.company_name || "",
                            start_date: employment.start_date || "",
                            end_date: employment.end_date || "",
                            note: employment.note || "",
                          });
                        }}>編集</button>
                        <button className={actionButtonClass} onClick={async () => {
                          if (!confirm("削除しますか？")) return;
                          await deleteEmployment(employment.id);
                          await load();
                        }}>削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">在籍企業なし</p>
        )}
      </div>
    </div>
  );
}
