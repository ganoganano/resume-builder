"use client";

import { useEffect, useState } from "react";
import { createSkill, deleteSkill, fetchSkills, reorderSkills, SkillsByCategory, updateSkill } from "@/lib/api";

type SkillDraft = {
  category: string;
  name: string;
  experience: string;
  description: string;
};

const emptyDraft: SkillDraft = {
  category: "",
  name: "",
  experience: "",
  description: "",
};

function RequiredLabel({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={`text-sm font-medium ${disabled ? "text-slate-400" : ""}`}>
      {children}
      <span className="text-red-600 ml-1">*</span>
    </label>
  );
}

export default function SkillsPage() {
  const [groups, setGroups] = useState<SkillsByCategory[]>([]);
  const [draft, setDraft] = useState<SkillDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isFormEnabled = isCreating || editingId !== null;
  const actionButtonClass = "btn-secondary px-3 py-1.5 text-xs whitespace-nowrap";

  const load = () => fetchSkills().then(setGroups);
  useEffect(() => {
    load();
  }, []);

  const move = async (category: string, index: number, direction: -1 | 1) => {
    const group = groups.find((entry) => entry.category === category);
    if (!group) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= group.skills.length) return;

    const nextSkills = [...group.skills];
    [nextSkills[index], nextSkills[targetIndex]] = [nextSkills[targetIndex], nextSkills[index]];

    setGroups((prev) =>
      prev.map((entry) =>
        entry.category === category
          ? { ...entry, skills: nextSkills.map((skill, idx) => ({ ...skill, sort_order: idx })) }
          : entry
      )
    );

    try {
      await reorderSkills(nextSkills.map((skill) => skill.id));
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "並び替えに失敗しました");
      await load();
    }
  };

  const save = async () => {
    const payload = {
      category: draft.category.trim(),
      name: draft.name.trim(),
      experience: draft.experience.trim() || null,
      description: draft.description.trim() || null,
    };

    if (!payload.category) {
      alert("カテゴリを入力してください");
      return;
    }
    if (!payload.name) {
      alert("名称を入力してください");
      return;
    }

    try {
      if (editingId !== null) {
        await updateSkill(editingId, payload);
      } else {
        await createSkill(payload);
      }
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
        <h2 className="text-xl font-bold">スキル編集</h2>
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
        <RequiredLabel disabled={!isFormEnabled}>カテゴリ</RequiredLabel>
        <input
          className="input disabled:bg-slate-100 disabled:text-slate-500"
          disabled={!isFormEnabled}
          placeholder="カテゴリ 例: 言語 / DB / AWS"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        />
        <RequiredLabel disabled={!isFormEnabled}>名称</RequiredLabel>
        <input
          className="input disabled:bg-slate-100 disabled:text-slate-500"
          disabled={!isFormEnabled}
          placeholder="名称"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <label className={`text-sm font-medium ${!isFormEnabled ? "text-slate-400" : ""}`}>経験</label>
        <input
          className="input disabled:bg-slate-100 disabled:text-slate-500"
          disabled={!isFormEnabled}
          placeholder="経験"
          value={draft.experience}
          onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
        />
        <label className={`text-sm font-medium ${!isFormEnabled ? "text-slate-400" : ""}`}>説明</label>
        <input
          className="input disabled:bg-slate-100 disabled:text-slate-500"
          disabled={!isFormEnabled}
          placeholder="説明"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <div className="flex gap-2">
          <button className="btn-primary disabled:opacity-50" disabled={!isFormEnabled} onClick={save}>保存</button>
          <button
            className="btn-secondary disabled:opacity-50"
            disabled={!isFormEnabled}
            onClick={() => {
              setDraft(emptyDraft);
              setEditingId(null);
              setIsCreating(false);
            }}
          >
            キャンセル
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">スキル一覧</h3>
        {groups.map((group) => (
          <div key={group.category} className="card">
            <h3 className="font-semibold mb-3">{group.category}</h3>
            {group.skills.length === 0 ? <p className="text-sm text-slate-500">スキルなし</p> : null}
            {group.skills.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-44" />
                    <col className="w-28" />
                    <col />
                    <col className="w-56" />
                  </colgroup>
                  <thead>
                    <tr className="border-b text-left text-slate-600">
                      <th className="py-2 pr-4 font-medium">スキル名</th>
                      <th className="py-2 pr-4 font-medium">経験</th>
                      <th className="py-2 pr-4 font-medium">説明</th>
                      <th className="py-2 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.skills.map((skill, index) => (
                      <tr key={skill.id} className="border-b last:border-b-0 align-top">
                        <td className="py-3 pr-4 font-medium">{skill.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{skill.experience || "-"}</td>
                        <td className="py-3 pr-4 break-words">{skill.description || "-"}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2 whitespace-nowrap">
                            <button className={actionButtonClass} onClick={() => move(group.category, index, -1)}>↑</button>
                            <button className={actionButtonClass} onClick={() => move(group.category, index, 1)}>↓</button>
                            <button
                              className={actionButtonClass}
                              onClick={() => {
                                setIsCreating(false);
                                setEditingId(skill.id);
                                setDraft({
                                  category: skill.category,
                                  name: skill.name,
                                  experience: skill.experience || "",
                                  description: skill.description || "",
                                });
                              }}
                            >
                              編集
                            </button>
                            <button
                              className={actionButtonClass}
                              onClick={async () => {
                                if (!confirm("削除しますか？")) return;
                                await deleteSkill(skill.id);
                                await load();
                              }}
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
