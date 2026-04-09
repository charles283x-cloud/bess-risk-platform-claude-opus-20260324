"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface OverviewProps {
  summary: string | null;
  projectId: string;
  isAdmin: boolean;
}

export default function ProjectOverview({
  summary: initialSummary,
  projectId,
  isAdmin,
}: OverviewProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
      alert("仅支持 .md 或 .txt 文件");
      return;
    }
    setUploading(true);
    try {
      const content = await file.text();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: content }),
      });
      if (res.ok) {
        setSummary(content);
      } else {
        alert("上传失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleClear() {
    if (!confirm("确定要清除项目概述吗？")) return;
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: null }),
    });
    if (res.ok) setSummary(null);
  }

  return (
    <div>
      {isAdmin && (
        <div className="flex items-center gap-3 mb-4">
          <label className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1">
            {uploading ? "上传中..." : summary ? "更新概述 (.md)" : "上传概述 (.md)"}
            <input
              ref={fileRef}
              type="file"
              accept=".md,.txt"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {summary && (
            <button
              onClick={handleClear}
              className="text-sm text-red-500 hover:text-red-700 cursor-pointer"
            >
              清除
            </button>
          )}
        </div>
      )}

      {summary ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:my-4 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-1 prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-gray-200">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {summary}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-400">暂无项目概述，请上传 .md 文件</p>
        </div>
      )}
    </div>
  );
}
