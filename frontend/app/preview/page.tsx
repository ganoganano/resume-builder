"use client";

import { useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  clearDemoData,
  fetchResumeBackup,
  fetchSettings,
  IS_DEMO_MODE,
  isExampleResumeBackup,
  ResumeSettings,
  updateSettings,
} from "@/lib/api";
import { buildResumePreviewHtml } from "@/lib/resume-preview";

const defaultSettings: ResumeSettings = {
  allow_section_split: false,
  font_scale: 1.0,
  project_meta_column_width_px: 88,
  project_tech_column_width_px: 150,
  skill_category_column_width_em: 4.6,
  skill_name_column_width_pct: 24,
  skill_experience_column_width_pct: 12,
  section_order: ["self_pr", "employment", "skills", "certifications"],
  section_page_breaks: {
    self_pr: false,
    employment: false,
    skills: false,
    certifications: false,
  },
};

export default function PreviewPage() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [showExampleNotice, setShowExampleNotice] = useState(false);
  const [showLayoutHelp, setShowLayoutHelp] = useState(false);
  const [layoutSettings, setLayoutSettings] = useState<ResumeSettings>(defaultSettings);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const layoutSettingsRef = useRef<ResumeSettings>(defaultSettings);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setError("");
      setLoading(true);
      const [settings] = await Promise.all([fetchSettings()]);
      setLayoutSettings(settings);
      layoutSettingsRef.current = settings;
      await loadPreview();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    try {
      if (IS_DEMO_MODE) {
        const backup = await fetchResumeBackup();
        setHtml(buildResumePreviewHtml(backup));
        setShowExampleNotice(isExampleResumeBackup(backup));
      } else {
        const response = await fetch(`${API_BASE_URL}/export/preview`);
        setHtml(await response.text());
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const persistLayoutSettings = async (nextSettings: ResumeSettings) => {
    try {
      setError("");
      setSavingLayout(true);
      const saved = await updateSettings(nextSettings);
      setLayoutSettings(saved);
      layoutSettingsRef.current = saved;
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingLayout(false);
    }
  };

  const applyLayoutVariables = () => {
    const doc = previewFrameRef.current?.contentDocument;
    if (!doc) return;
    const root = doc.documentElement;
    const settings = layoutSettingsRef.current;
    root.style.setProperty("--project-meta-column-width", `${settings.project_meta_column_width_px}px`);
    root.style.setProperty("--project-tech-column-width", `${settings.project_tech_column_width_px}px`);
    root.style.setProperty("--skill-category-column-width", `${settings.skill_category_column_width_em}em`);
    root.style.setProperty("--skill-name-column-width", `${settings.skill_name_column_width_pct}%`);
    root.style.setProperty("--skill-experience-column-width", `${settings.skill_experience_column_width_pct}%`);
  };

  const attachResizeHandle = ({
    doc,
    target,
    side,
    cursor,
    readValue,
    writeValue,
    min,
    max,
    deltaToValue,
  }: {
    doc: Document;
    target: HTMLElement;
    side: "left" | "right";
    cursor: string;
    readValue: () => number;
    writeValue: (value: number) => void;
    min: number;
    max: number;
    deltaToValue?: (delta: number, startValue: number) => number;
  }) => {
    target.classList.add("resize-target-preview");
    if (getComputedStyle(target).position === "static") {
      target.style.position = "relative";
    }

    const handle = doc.createElement("button");
    handle.type = "button";
    handle.className = `resize-handle-preview resize-handle-${side}`;
    handle.setAttribute("aria-label", "列幅を調整");
    handle.style.cursor = cursor;

    handle.addEventListener("pointerenter", () => {
      target.classList.add("resize-hovered");
    });
    handle.addEventListener("pointerleave", () => {
      if (!target.classList.contains("resize-active")) {
        target.classList.remove("resize-hovered");
      }
    });

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const pointerId = event.pointerId;
      handle.setPointerCapture(pointerId);
      target.classList.add("resize-active");
      target.classList.remove("resize-hovered");
      const startX = event.clientX;
      const startValue = readValue();

      const updateFromPointer = (clientX: number) => {
        const delta = clientX - startX;
        const signedDelta = side === "right" ? delta : -delta;
        const nextValue = deltaToValue ? deltaToValue(signedDelta, startValue) : startValue + signedDelta;
        const clamped = Math.min(max, Math.max(min, nextValue));
        writeValue(clamped);
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        updateFromPointer(moveEvent.clientX);
      };

      const onPointerUp = async () => {
        handle.releasePointerCapture(pointerId);
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", onPointerUp);
        handle.removeEventListener("pointercancel", onPointerUp);
        target.classList.remove("resize-active");
        layoutSettingsRef.current = { ...layoutSettingsRef.current };
        setLayoutSettings(layoutSettingsRef.current);
        await persistLayoutSettings(layoutSettingsRef.current);
      };

      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
      handle.addEventListener("pointercancel", onPointerUp);
    });

    target.appendChild(handle);
  };

  const setupInteractivePreview = () => {
    const doc = previewFrameRef.current?.contentDocument;
    if (!doc) return;

    applyLayoutVariables();

    doc.getElementById("preview-resize-style")?.remove();
    doc.querySelectorAll(".resize-handle-preview").forEach((element) => element.remove());
    doc.querySelectorAll(".resize-target-preview").forEach((element) => {
      element.classList.remove("resize-target-preview", "resize-hovered", "resize-active");
    });

    const style = doc.createElement("style");
    style.id = "preview-resize-style";
    style.textContent = `
      .resize-target-preview {
        transition: box-shadow 120ms ease, background-color 120ms ease;
      }
      .resize-target-preview.resize-hovered,
      .resize-target-preview.resize-active {
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.22);
        background-color: rgba(59, 130, 246, 0.04);
      }
      .resize-handle-preview {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 12px;
        border: 0;
        padding: 0;
        background: transparent;
        z-index: 20;
      }
      .resize-handle-preview::after {
        content: "";
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 2px;
        transform: translateX(-50%);
        border-radius: 999px;
        background: rgba(59, 130, 246, 0);
        transition: background-color 120ms ease, box-shadow 120ms ease;
      }
      .resize-handle-preview:hover::after,
      .resize-target-preview.resize-active .resize-handle-preview::after {
        background: rgba(59, 130, 246, 0.45);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
      }
      .resize-handle-right {
        right: -6px;
      }
      .resize-handle-left {
        left: -6px;
      }
    `;
    doc.head.appendChild(style);

    const firstMetaColumn = doc.querySelector<HTMLElement>(".project-meta-column");
    if (firstMetaColumn) {
      attachResizeHandle({
        doc,
        target: firstMetaColumn,
        side: "right",
        cursor: "ew-resize",
        readValue: () => layoutSettingsRef.current.project_meta_column_width_px,
        writeValue: (value) => {
          layoutSettingsRef.current = { ...layoutSettingsRef.current, project_meta_column_width_px: Math.round(value) };
          applyLayoutVariables();
        },
        min: 72,
        max: 120,
      });
    }

    const firstTechColumn = doc.querySelector<HTMLElement>(".project-tech-column");
    if (firstTechColumn) {
      attachResizeHandle({
        doc,
        target: firstTechColumn,
        side: "left",
        cursor: "ew-resize",
        readValue: () => layoutSettingsRef.current.project_tech_column_width_px,
        writeValue: (value) => {
          layoutSettingsRef.current = { ...layoutSettingsRef.current, project_tech_column_width_px: Math.round(value) };
          applyLayoutVariables();
        },
        min: 110,
        max: 200,
      });
    }

    const skillCategoryHeader = doc.querySelector<HTMLElement>(".skill-category-head");
    if (skillCategoryHeader) {
      attachResizeHandle({
        doc,
        target: skillCategoryHeader,
        side: "right",
        cursor: "ew-resize",
        readValue: () => layoutSettingsRef.current.skill_category_column_width_em * 16,
        writeValue: (value) => {
          const em = Math.round((value / 16) * 10) / 10;
          layoutSettingsRef.current = { ...layoutSettingsRef.current, skill_category_column_width_em: em };
          applyLayoutVariables();
        },
        min: 56,
        max: 112,
      });
    }

    const skillTable = doc.querySelector<HTMLTableElement>(".skill-table");
    const skillNameHeader = skillTable?.querySelector<HTMLElement>("thead th:nth-child(2)");
    if (skillNameHeader) {
      attachResizeHandle({
        doc,
        target: skillNameHeader,
        side: "right",
        cursor: "ew-resize",
        readValue: () => layoutSettingsRef.current.skill_name_column_width_pct,
        writeValue: (value) => {
          layoutSettingsRef.current = { ...layoutSettingsRef.current, skill_name_column_width_pct: Math.round(value * 10) / 10 };
          applyLayoutVariables();
        },
        min: 16,
        max: 40,
        deltaToValue: (delta, startValue) => {
          const tableWidth = skillTable?.getBoundingClientRect().width || 1;
          return startValue + (delta / tableWidth) * 100;
        },
      });
    }

    const skillExperienceHeader = skillTable?.querySelector<HTMLElement>("thead th:nth-child(3)");
    if (skillExperienceHeader) {
      attachResizeHandle({
        doc,
        target: skillExperienceHeader,
        side: "right",
        cursor: "ew-resize",
        readValue: () => layoutSettingsRef.current.skill_experience_column_width_pct,
        writeValue: (value) => {
          layoutSettingsRef.current = { ...layoutSettingsRef.current, skill_experience_column_width_pct: Math.round(value * 10) / 10 };
          applyLayoutVariables();
        },
        min: 8,
        max: 20,
        deltaToValue: (delta, startValue) => {
          const tableWidth = skillTable?.getBoundingClientRect().width || 1;
          return startValue + (delta / tableWidth) * 100;
        },
      });
    }
  };

  useEffect(() => {
    const iframe = previewFrameRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setupInteractivePreview();
    };

    iframe.addEventListener("load", handleLoad);
    if (html && iframe.contentDocument?.readyState === "complete") {
      handleLoad();
    }

    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [html]);

  useEffect(() => {
    layoutSettingsRef.current = layoutSettings;
    applyLayoutVariables();
  }, [layoutSettings]);

  const handlePdf = async () => {
    if (!IS_DEMO_MODE) {
      window.open(`${API_BASE_URL}/export/pdf`, "_blank");
      return;
    }

    const frame = previewFrameRef.current;
    const previewWindow = frame?.contentWindow;
    const previewDocument = frame?.contentDocument;
    if (!previewWindow || !previewDocument) {
      setError("プレビューの印刷準備に失敗しました。ページを再読み込みして再試行してください。");
      return;
    }

    try {
      setError("");
      setPrinting(true);
      if (previewDocument.fonts?.ready) {
        await previewDocument.fonts.ready;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      previewWindow.focus();
      previewWindow.print();
    } catch {
      setError("PDF出力に失敗しました。ブラウザの印刷機能が利用可能か確認してください。");
    } finally {
      setPrinting(false);
    }
  };

  const handleClearExample = async () => {
    try {
      setError("");
      setClearing(true);
      await clearDemoData();
      await load();
    } catch {
      setError("サンプルデータの消去に失敗しました。");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-3">
      {IS_DEMO_MODE && showExampleNotice ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
          <p>現在はサンプルデータを表示しています。空の状態から始める場合は、サンプルデータを消去してください。</p>
          <button
            className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleClearExample}
            disabled={loading || clearing || printing}
          >
            サンプルデータを消去
          </button>
        </div>
      ) : null}
      <div className="flex justify-between items-center gap-3">
        <h2 className="text-xl font-bold">プレビュー</h2>
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowLayoutHelp((current) => !current)}
            disabled={loading}
          >
            レイアウト調整の説明
          </button>
          {showLayoutHelp ? (
            <div className="absolute right-0 top-full z-20 mt-2 w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-lg">
              <div className="absolute -top-2 right-8 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white" />
              <ul className="list-disc space-y-1 pl-5">
                <li>プレビュー内の仕切り線にマウスを合わせると、操作できる場所が軽くハイライトされます。</li>
                <li>プロジェクト欄は最初のプロジェクトだけが操作用ハンドルを持ちますが、調整結果は全てのプロジェクトにまとめて反映されます。</li>
                <li>スキル表はヘッダー行の列境界を横方向にドラッグして調整できます。</li>
                <li>ドラッグ操作は横方向のみです。調整に不要な方向には動きません。</li>
                <li>ドラッグを離した時点で設定が自動保存され、PDF 出力にも反映されます。</li>
              </ul>
            </div>
          ) : null}
          <button
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePdf}
            disabled={loading || !html || printing || clearing || savingLayout}
          >
            {IS_DEMO_MODE ? "PDF出力" : "PDFダウンロード"}
          </button>
        </div>
      </div>
      {savingLayout ? <p className="text-sm text-slate-500">レイアウト設定を保存中...</p> : null}
      {IS_DEMO_MODE ? <p className="text-sm text-slate-500">デモモードではデータはブラウザ内にのみ保存され、PDF は印刷ダイアログから出力します。</p> : null}
      {loading ? <p>読み込み中...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <div className="bg-white border rounded overflow-hidden">
          <iframe
            ref={previewFrameRef}
            title="resume-preview"
            srcDoc={html}
            className="w-full min-h-[1200px] border-0"
          />
        </div>
      ) : null}
    </div>
  );
}
