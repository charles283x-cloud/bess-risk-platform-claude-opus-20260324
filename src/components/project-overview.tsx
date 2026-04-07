"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface WeeklyReport {
  id: string;
  title: string;
  content: string;
  reportDate: string;
  createdAt: string;
}

interface OverviewProps {
  reports: WeeklyReport[];
  projectId: string;
  isAdmin: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export default function ProjectOverview({
  reports: initialReports,
  projectId,
  isAdmin,
}: OverviewProps) {
  const [reports, setReports] = useState<WeeklyReport[]>(initialReports);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialReports.length > 0 ? initialReports[0].id : null
  );
  const [uploading, setUploading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);

  const selectedReport = reports.find((r) => r.id === selectedId) || null;

  const refreshReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0 && !data.find((r: WeeklyReport) => r.id === selectedId)) {
          setSelectedId(data[0].id);
        }
      }
    } catch { /* silently fail */ }
  }, [projectId, selectedId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
      alert("仅支持 .md 或 .txt 文件");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("reportDate", reportDate);

      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newReport = await res.json();
        await refreshReports();
        setSelectedId(newReport.id);
        // Reset file input
        e.target.value = "";
      } else {
        const data = await res.json();
        alert(data.error || "上传失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此周报吗？")) return;
    try {
      await fetch(`/api/reports/${id}`, { method: "DELETE" });
      await refreshReports();
      if (selectedId === id) {
        setSelectedId(reports.length > 1 ? reports.find((r) => r.id !== id)?.id || null : null);
      }
    } catch { /* silently fail */ }
  }

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">周报日期</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer inline-flex items-center gap-2">
              {uploading ? "上传中..." : "上传周报 (.md)"}
              <input
                type="file"
                accept=".md,.txt"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">暂无周报，请上传 .md 文件</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          {/* 左侧：周报列表 */}
          <div className="md:w-56 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-500 font-medium">周报列表（{reports.length}）</p>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left px-4 py-3 transition cursor-pointer ${
                      selectedId === r.id
                        ? "bg-blue-50 border-l-2 border-blue-600"
                        : "hover:bg-gray-50 border-l-2 border-transparent"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.reportDate)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：周报内容 */}
          <div className="flex-1 min-w-0">
            {selectedReport ? (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedReport.title}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      周报日期：{formatDate(selectedReport.reportDate)} · 上传于 {formatDate(selectedReport.createdAt)}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(selectedReport.id)}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="px-6 py-5 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-gray-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedReport.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">请选择一份周报</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
