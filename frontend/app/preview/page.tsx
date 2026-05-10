"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, clearDemoData, fetchResumeBackup, IS_DEMO_MODE, isExampleResumeBackup } from "@/lib/api";
import { buildResumePreviewHtml } from "@/lib/resume-preview";

export default function PreviewPage() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showExampleNotice, setShowExampleNotice] = useState(false);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    void loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      setLoading(true);
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
      await loadPreview();
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">プレビュー</h2>
        <button
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handlePdf}
          disabled={loading || !html || printing || clearing}
        >
          {IS_DEMO_MODE ? "PDF出力" : "PDFダウンロード"}
        </button>
      </div>
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
