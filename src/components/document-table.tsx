"use client";

import { useState, useCallback, useRef } from "react";

interface DocumentItem {
  id: string;
  category: string;
  name: string;
  originalName: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface DocumentTableProps {
  documents: DocumentItem[];
  projectId: string;
  isAdmin: boolean;
}

const categoryOptions = [
  { value: "schedule", label: "进度计划" },
  { value: "budget", label: "资金计划" },
  { value: "design", label: "设计文件" },
  { value: "safety", label: "安全文件" },
  { value: "quality", label: "质量文件" },
  { value: "report", label: "报告/汇报" },
  { value: "other", label: "其他" },
];

const categoryLabels: Record<string, string> = Object.fromEntries(
  categoryOptions.map((c) => [c.value, c.label])
);

const categoryColors: Record<string, string> = {
  schedule: "bg-blue-100 text-blue-700",
  budget: "bg-green-100 text-green-700",
  design: "bg-purple-100 text-purple-700",
  safety: "bg-red-100 text-red-700",
  quality: "bg-teal-100 text-teal-700",
  report: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function DocumentTable({
  documents: initialDocuments,
  projectId,
  isAdmin,
}: DocumentTableProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("schedule");
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshDocuments = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/documents`);
    if (res.ok) setDocuments(await res.json());
  }, [projectId]);

  async function handleUpload(file: File) {
    if (file.type !== "application/pdf") {
      setError("仅支持PDF格式文件");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("文件大小超过50MB限制");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);
      if (uploadName.trim()) formData.append("name", uploadName.trim());

      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "上传失败");
        return;
      }
      setShowUpload(false);
      setUploadName("");
      setUploadCategory("schedule");
      if (fileRef.current) fileRef.current.value = "";
      await refreshDocuments();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定删除"${name}"吗？`)) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (previewId === id) setPreviewId(null);
    await refreshDocuments();
  }

  // Group by category, preserving categoryOptions order
  const grouped = categoryOptions
    .map((opt) => ({
      key: opt.value,
      label: opt.label,
      docs: documents.filter((d) => d.category === opt.value),
    }))
    .filter((g) => g.docs.length > 0);

  function renderDocList(docs: DocumentItem[]) {
    return (
      <div className="space-y-2">
        {docs.map((d) => (
          <div
            key={d.id}
            className={`bg-white border rounded-lg p-3 transition ${
              previewId === d.id ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatSize(d.sizeBytes)} · {formatDate(d.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => setPreviewId(previewId === d.id ? null : d.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer px-2 py-1 rounded hover:bg-blue-50"
                >
                  {previewId === d.id ? "收起" : "预览"}
                </button>
                <a
                  href={`/api/documents/${d.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer px-2 py-1 rounded hover:bg-gray-50"
                >
                  新窗口
                </a>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(d.id, d.name)}
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer px-2 py-1 rounded hover:bg-red-50"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
            {previewId === d.id && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <iframe
                  src={`/api/documents/${d.id}`}
                  className="w-full rounded-lg border border-gray-200"
                  style={{ height: "70vh" }}
                  title={`预览: ${d.name}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Upload */}
      {isAdmin && !showUpload && (
        <button
          onClick={() => setShowUpload(true)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          + 上传管理文件
        </button>
      )}

      {showUpload && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                文件分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                文件名称（可选，默认使用文件名）
              </label>
              <input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：总体进度计划 v2"
              />
            </div>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
              dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300"
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-500">
              {uploading ? "上传中..." : "点击或拖拽PDF文件到此处"}
            </p>
            <p className="text-xs text-gray-400 mt-1">仅支持PDF格式，最大50MB</p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => { setShowUpload(false); setError(""); setUploadName(""); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Document list grouped by category */}
      {documents.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-8">暂无管理文件</div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.key}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[g.key] || categoryColors.other}`}>
                  {g.label}
                </span>
                <span className="text-gray-400 font-normal">({g.docs.length} 份)</span>
              </h3>
              {renderDocList(g.docs)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
