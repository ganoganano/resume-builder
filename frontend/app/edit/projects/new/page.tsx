"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TagInput from "@/components/ui/TagInput";
import { createProject, Employment, fetchEmployments } from "@/lib/api";

const blank = {
  employment_id: 0,
  start_date: "",
  end_date: "",
  title: "",
  overview: "",
  role: "",
  team_size: "",
  phases: [] as string[],
  tasks: "",
  achievements: "",
  os: [] as string[],
  languages: [] as string[],
  frameworks: [] as string[],
  databases: [] as string[],
  others: [] as string[],
};

function clampProjectDates(
  startDate: string,
  endDate: string,
  employment?: Employment
): { startDate: string; endDate: string } {
  if (!employment) return { startDate, endDate };

  const min = employment.start_date || "";
  const max = employment.end_date || "";

  let nextStart = startDate;
  let nextEnd = endDate;

  if (min && nextStart && nextStart < min) nextStart = min;
  if (max && nextStart && nextStart > max) nextStart = max;
  if (min && nextEnd && nextEnd < min) nextEnd = min;
  if (max && nextEnd && nextEnd > max) nextEnd = max;
  if (nextStart && nextEnd && nextEnd < nextStart) nextEnd = nextStart;

  return { startDate: nextStart, endDate: nextEnd };
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium">
      {children}
      <span className="text-red-600 ml-1">*</span>
    </label>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [form, setForm] = useState(blank);
  const selectedEmployment = employments.find((employment) => employment.id === form.employment_id);

  useEffect(() => {
    fetchEmployments().then((rows) => {
      setEmployments(rows);
      const q = Number(new URLSearchParams(window.location.search).get("employment_id"));
      const employmentId = q || rows[0]?.id || 0;
      const employment = rows.find((row) => row.id === employmentId);
      const clamped = clampProjectDates("", "", employment);
      setForm((f) => ({ ...f, employment_id: employmentId, start_date: clamped.startDate, end_date: clamped.endDate }));
    });
  }, []);

  const save = async () => {
    await createProject(form);
    router.push("/edit/projects");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">プロジェクト新規作成</h2>
      <div className="card space-y-2">
        <RequiredLabel>在籍先</RequiredLabel>
        <select
          className="input"
          value={form.employment_id}
          onChange={(e) => {
            const employmentId = Number(e.target.value);
            const employment = employments.find((row) => row.id === employmentId);
            const clamped = clampProjectDates(form.start_date, form.end_date, employment);
            setForm({ ...form, employment_id: employmentId, start_date: clamped.startDate, end_date: clamped.endDate });
          }}
        >
          {employments.map((e) => <option key={e.id} value={e.id}>{e.company_name}</option>)}
        </select>
        <RequiredLabel>開始年月</RequiredLabel>
        <input
          className="input"
          type="month"
          min={selectedEmployment?.start_date || undefined}
          max={selectedEmployment?.end_date || undefined}
          value={form.start_date}
          onChange={(e) => {
            const startDate = e.target.value;
            const clamped = clampProjectDates(startDate, form.end_date, selectedEmployment);
            setForm({ ...form, start_date: clamped.startDate, end_date: clamped.endDate });
          }}
        />
        <label className="text-sm font-medium">終了年月</label>
        <input
          className="input"
          type="month"
          min={form.start_date || selectedEmployment?.start_date || undefined}
          max={selectedEmployment?.end_date || undefined}
          value={form.end_date}
          onChange={(e) => {
            const clamped = clampProjectDates(form.start_date, e.target.value, selectedEmployment);
            setForm({ ...form, start_date: clamped.startDate, end_date: clamped.endDate });
          }}
        />
        <RequiredLabel>プロジェクト名</RequiredLabel>
        <input className="input" placeholder="プロジェクト名" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="text-sm font-medium">概要</label>
        <textarea className="input min-h-20" placeholder="概要" value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} />
        <label className="text-sm font-medium">役割</label>
        <input className="input" placeholder="役割" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <label className="text-sm font-medium">チーム規模</label>
        <input className="input" placeholder="チーム規模" value={form.team_size} onChange={(e) => setForm({ ...form, team_size: e.target.value })} />
        <label className="text-sm font-medium">担当フェーズ</label>
        <TagInput value={form.phases} onChange={(v) => setForm({ ...form, phases: v })} placeholder="担当フェーズ" />
        <label className="text-sm font-medium">業務内容（Markdown）</label>
        <textarea className="input min-h-32" value={form.tasks} onChange={(e) => setForm({ ...form, tasks: e.target.value })} />
        <label className="text-sm font-medium">実績・取り組み（Markdown）</label>
        <textarea className="input min-h-32" value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} />
        <label className="text-sm font-medium">OS</label>
        <TagInput value={form.os} onChange={(v) => setForm({ ...form, os: v })} placeholder="OS" />
        <label className="text-sm font-medium">言語</label>
        <TagInput value={form.languages} onChange={(v) => setForm({ ...form, languages: v })} placeholder="言語" />
        <label className="text-sm font-medium">フレームワーク</label>
        <TagInput value={form.frameworks} onChange={(v) => setForm({ ...form, frameworks: v })} placeholder="FW" />
        <label className="text-sm font-medium">DB</label>
        <TagInput value={form.databases} onChange={(v) => setForm({ ...form, databases: v })} placeholder="DB" />
        <label className="text-sm font-medium">その他</label>
        <TagInput value={form.others} onChange={(v) => setForm({ ...form, others: v })} placeholder="その他" />
        <div className="flex gap-2">
          <button className="btn-primary" onClick={save}>保存</button>
          <button className="btn-secondary" onClick={() => router.push("/edit/projects")}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}
