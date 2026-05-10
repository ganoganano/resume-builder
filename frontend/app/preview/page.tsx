"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, fetchResumeBackup, IS_DEMO_MODE } from "@/lib/api";
import { buildResumePreviewHtml } from "@/lib/resume-preview";

export default function PreviewPage() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (IS_DEMO_MODE) {
          const backup = await fetchResumeBackup();
          setHtml(buildResumePreviewHtml(backup));
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

    void load();
  }, []);

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

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">プレビュー</h2>
        <button
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handlePdf}
          disabled={loading || !html || printing}
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
