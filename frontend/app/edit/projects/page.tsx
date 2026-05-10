"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Employment, fetchEmployments, fetchProjects, Project, reorderProjects } from "@/lib/api";

export default function ProjectsPage() {
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const load = () =>
    Promise.all([fetchEmployments(), fetchProjects()]).then(([employmentRows, projectRows]) => {
      setEmployments(employmentRows);
      setProjects(projectRows);
    });

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<number, Project[]>();
    projects.forEach((project) => {
      map.set(project.employment_id, [...(map.get(project.employment_id) ?? []), project]);
    });
    return map;
  }, [projects]);

  const move = async (employmentId: number, index: number, direction: -1 | 1) => {
    const current = grouped.get(employmentId) ?? [];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const nextGroup = [...current];
    [nextGroup[index], nextGroup[targetIndex]] = [nextGroup[targetIndex], nextGroup[index]];

    setProjects((prev) => {
      const byEmployment = prev.filter((project) => project.employment_id !== employmentId);
      return [
        ...byEmployment,
        ...nextGroup.map((project, idx) => ({ ...project, sort_order: idx })),
      ].sort((a, b) => {
        if (a.employment_id !== b.employment_id) return a.employment_id - b.employment_id;
        return a.sort_order - b.sort_order;
      });
    });

    try {
      await reorderProjects(nextGroup.map((project) => project.id));
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "並び替えに失敗しました");
      await load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">プロジェクト一覧</h2>
        <Link href="/edit/projects/new" className="btn-primary">新規追加</Link>
      </div>
      {employments.map((employment) => (
        <div key={employment.id} className="card">
          <div className="flex justify-between mb-2">
            <h3 className="font-semibold">{employment.company_name}</h3>
            <Link href={`/edit/projects/new?employment_id=${employment.id}`} className="btn-secondary">プロジェクトを追加</Link>
          </div>
          {(grouped.get(employment.id) ?? []).map((project, index) => (
            <div key={project.id} className="border rounded p-3 mb-2 flex justify-between gap-4">
              <div>
                <p className="font-medium">{project.title}</p>
                <p className="text-sm text-slate-600">{project.start_date} - {project.end_date || "現在"}</p>
                <p className="text-sm">{project.overview}</p>
                <Link className="text-blue-700 text-sm" href={`/edit/projects/${project.id}`}>編集</Link>
              </div>
              <div className="flex gap-2 h-fit">
                <button className="btn-secondary" onClick={() => move(employment.id, index, -1)}>↑</button>
                <button className="btn-secondary" onClick={() => move(employment.id, index, 1)}>↓</button>
              </div>
            </div>
          ))}
          {(grouped.get(employment.id) ?? []).length === 0 ? <p className="text-sm text-slate-500">プロジェクトなし</p> : null}
        </div>
      ))}
    </div>
  );
}
