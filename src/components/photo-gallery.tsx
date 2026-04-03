"use client";

import { useState, useCallback, useRef } from "react";

interface PhotoItem {
  id: string;
  description: string | null;
  originalName: string;
  sizeBytes: number;
  takenAt: string | null;
  uploadedAt: string;
}

interface PhotoGalleryProps {
  photos: PhotoItem[];
  projectId: string;
  isAdmin: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function PhotoGallery({
  photos: initialPhotos,
  projectId,
  isAdmin,
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [viewId, setViewId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshPhotos = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/photos`);
    if (res.ok) setPhotos(await res.json());
  }, [projectId]);

  async function handleUpload(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("仅支持JPG、PNG、WebP格式");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("文件大小超过20MB限制");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (uploadDesc.trim()) formData.append("description", uploadDesc.trim());
      if (uploadDate) formData.append("takenAt", uploadDate);

      const res = await fetch(`/api/projects/${projectId}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "上传失败");
        return;
      }
      setShowUpload(false);
      setUploadDesc("");
      setUploadDate("");
      if (fileRef.current) fileRef.current.value = "";
      await refreshPhotos();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files[0]) handleUpload(files[0]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此照片？")) return;
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (viewId === id) setViewId(null);
    await refreshPhotos();
  }

  const viewPhoto = photos.find((p) => p.id === viewId);

  // Group photos by date (takenAt or uploadedAt)
  const grouped: { date: string; photos: PhotoItem[] }[] = [];
  const dateMap = new Map<string, PhotoItem[]>();
  for (const p of photos) {
    const dateKey = formatDate(p.takenAt || p.uploadedAt);
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
    dateMap.get(dateKey)!.push(p);
  }
  for (const [date, items] of dateMap) {
    grouped.push({ date, photos: items });
  }

  return (
    <div>
      {/* Upload */}
      {isAdmin && !showUpload && (
        <button
          onClick={() => setShowUpload(true)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          + 上传现场照片
        </button>
      )}

      {showUpload && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">拍摄日期</label>
              <input
                type="datetime-local"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">说明（可选）</label>
              <input
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：基础施工完成"
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
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <p className="text-sm text-gray-500">
              {uploading ? "上传中..." : "点击或拖拽照片到此处"}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG、PNG、WebP，最大20MB</p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => { setShowUpload(false); setError(""); setUploadDesc(""); setUploadDate(""); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Photo gallery */}
      {photos.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-8">暂无现场照片</div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {g.date}
                <span className="text-gray-400 font-normal">({g.photos.length} 张)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {g.photos.map((p) => (
                  <div
                    key={p.id}
                    className="group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer aspect-[4/3]"
                    onClick={() => setViewId(p.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${p.id}`}
                      alt={p.description || p.originalName}
                      className="w-full h-full object-cover transition group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      {p.takenAt && (
                        <p className="text-xs text-white/90 font-medium">
                          {formatDateTime(p.takenAt)}
                        </p>
                      )}
                      {p.description && (
                        <p className="text-xs text-white/75 truncate">{p.description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="删除"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4"
          onClick={() => setViewId(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setViewId(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white cursor-pointer"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${viewPhoto.id}`}
              alt={viewPhoto.description || viewPhoto.originalName}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            {/* Info bar */}
            <div className="mt-3 text-center text-white/80 space-y-1">
              {viewPhoto.takenAt && (
                <p className="text-sm font-medium">
                  拍摄时间: {formatDateTime(viewPhoto.takenAt)}
                </p>
              )}
              {viewPhoto.description && (
                <p className="text-sm">{viewPhoto.description}</p>
              )}
              <p className="text-xs text-white/50">
                {viewPhoto.originalName} · {formatSize(viewPhoto.sizeBytes)} · 上传于 {formatDate(viewPhoto.uploadedAt)}
              </p>
            </div>

            {/* Nav buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => {
                    const idx = photos.findIndex((p) => p.id === viewId);
                    setViewId(photos[(idx - 1 + photos.length) % photos.length].id);
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const idx = photos.findIndex((p) => p.id === viewId);
                    setViewId(photos[(idx + 1) % photos.length].id);
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
