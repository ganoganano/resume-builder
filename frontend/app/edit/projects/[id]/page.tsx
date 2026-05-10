"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TagInput from "@/components/ui/TagInput";
import { deleteProject, Employment, fetchEmployments, fetchProject, Project, updateProject } from "@/lib/api";

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

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [form, setForm] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);
  const selectedEmployment = employments.find((employment) => employment.id === form?.employment_id);

  useEffect(() => {
    Promise.all([fetchEmployments(), fetchProject(id)])
      .then(([e, p]) => {
        setEmployments(e);
        setForm(p);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <p>プロジェクトが見つかりません</p>;
  if (!form) return <p>読み込み中...</p>;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">プロジェクト編集</h2>
      <div className="card space-y-2">
        <RequiredLabel>在籍先</RequiredLabel>
        <select
          className="input"
          value={form.employment_id}
          onChange={(e) => {
            const employmentId = Number(e.target.value);
            const employment = employments.find((row) => row.id === employmentId);
            const clamped = clampProjectDates(form.start_date || "", form.end_date || "", employment);
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
          value={form.start_date || ""}
          onChange={(e) => {
            const clamped = clampProjectDates(e.target.value, form.end_date || "", selectedEmployment);
            setForm({ ...form, start_date: clamped.startDate, end_date: clamped.endDate });
          }}
        />
        <label className="text-sm font-medium">終了年月</label>
        <input
          className="input"
          type="month"
          min={form.start_date || selectedEmployment?.start_date || undefined}
          max={selectedEmployment?.end_date || undefined}
          value={form.end_date || ""}
          onChange={(e) => {
            const clamped = clampProjectDates(form.start_date || "", e.target.value, selectedEmployment);
            setForm({ ...form, start_date: clamped.startDate, end_date: clamped.endDate });
          }}
        />
        <RequiredLabel>プロジェクト名</RequiredLabel>
        <input className="input" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="text-sm font-medium">概要</label>
        <textarea className="input min-h-20" value={form.overview || ""} onChange={(e) => setForm({ ...form, overview: e.target.value })} />
        <label className="text-sm font-medium">役割</label>
        <input className="input" value={form.role || ""} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <label className="text-sm font-medium">チーム規模</label>
        <input className="input" value={form.team_size || ""} onChange={(e) => setForm({ ...form, team_size: e.target.value })} />
        <label className="text-sm font-medium">担当フェーズ</label>
        <TagInput value={form.phases || []} onChange={(v) => setForm({ ...form, phases: v })} />
        <label className="text-sm font-medium">業務内容（Markdown）</label>
        <textarea className="input min-h-32" value={form.tasks || ""} onChange={(e) => setForm({ ...form, tasks: e.target.value })} />
        <label className="text-sm font-medium">実績・取り組み（Markdown）</label>
        <textarea className="input min-h-32" value={form.achievements || ""} onChange={(e) => setForm({ ...form, achievements: e.target.value })} />
        <label className="text-sm font-medium">OS</label>
        <TagInput value={form.os || []} onChange={(v) => setForm({ ...form, os: v })} />
        <label className="text-sm font-medium">言語</label>
        <TagInput value={form.languages || []} onChange={(v) => setForm({ ...form, languages: v })} />
        <label className="text-sm font-medium">フレームワーク</label>
        <TagInput value={form.frameworks || []} onChange={(v) => setForm({ ...form, frameworks: v })} />
        <label className="text-sm font-medium">DB</label>
        <TagInput value={form.databases || []} onChange={(v) => setForm({ ...form, databases: v })} />
        <label className="text-sm font-medium">その他</label>
        <TagInput value={form.others || []} onChange={(v) => setForm({ ...form, others: v })} />
        <div className="flex gap-2">
          <button className="btn-primary" onClick={async () => {
            await updateProject(id, form);
            router.push("/edit/projects");
          }}>保存</button>
          <button className="btn-secondary" onClick={async () => {
            if (!confirm("削除しますか？")) return;
            await deleteProject(id);
            router.push("/edit/projects");
          }}>削除</button>
          <button className="btn-secondary" onClick={() => router.push("/edit/projects")}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}
