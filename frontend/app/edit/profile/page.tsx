"use client";

import { useEffect, useState } from "react";
import FormField from "@/components/ui/FormField";
import { fetchProfile, updateProfile, Profile } from "@/lib/api";

export default function ProfilePage() {
  const [data, setData] = useState<Profile>({
    name: "",
    as_of_date: "",
    self_pr: "",
    pr_highlights: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    const saved = await updateProfile({
      ...data,
      name: data.name.trim(),
      as_of_date: data.as_of_date.trim(),
    });
    setData((prev) => ({ ...prev, ...saved, self_pr: prev.self_pr }));
  };

  const saveSelfPr = async () => {
    const saved = await updateProfile({
      ...data,
      self_pr: data.self_pr.trim(),
    });
    setData((prev) => ({ ...prev, ...saved, name: prev.name, as_of_date: prev.as_of_date }));
  };

  if (loading) return <p>読み込み中...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">プロフィール編集</h2>

      <div className="card space-y-2">
        <h3 className="font-semibold">プロフィール</h3>
        <FormField
          label="氏名"
          name="name"
          required
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
        <FormField
          label="作成日"
          name="as_of_date"
          type="date"
          value={data.as_of_date}
          onChange={(e) => setData({ ...data, as_of_date: e.target.value })}
        />
        <p className="text-sm text-slate-500">未入力の場合、プレビューでは現在の年月日を使用します。</p>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={saveProfile}>保存</button>
        </div>
      </div>

      <div className="card space-y-2">
        <h3 className="font-semibold">自己PR</h3>
        <FormField
          label="自己PR本文（Markdown）"
          name="self_pr"
          type="textarea"
          rows={12}
          value={data.self_pr}
          onChange={(e) => setData({ ...data, self_pr: e.target.value })}
        />
        <p className="text-sm text-slate-500">
          見出し、箇条書き、強調などの Markdown をそのままプレビュー/PDF に反映します。
        </p>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={saveSelfPr}>保存</button>
        </div>
      </div>
    </div>
  );
}
