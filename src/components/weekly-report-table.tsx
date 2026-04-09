"use client";

import { useState, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface WeeklyReport {
  id: string;
  title: string;
  content: string;
  reportDate: string;
  createdAt: string;
}

interface PendingDecisionInput {
  title: string;
  description: string;
  impactNote: string;
}

interface Props {
  reports: WeeklyReport[];
  projectId: string;
  isAdmin: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

const emptyDecision = (): PendingDecisionInput => ({ title: "", description: "", impactNote: "" });

export default function WeeklyReportTable({
  reports: initialReports,
  projectId,
  isAdmin,
}: Props) {
  const [reports, setReports] = useState<WeeklyReport[]>(initialReports);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialReports.length > 0 ? initialReports[0].id : null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadFormOpen, setUploadFormOpen] = useState(false);

  // Upload form state
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);
  const [nextWeekTasks, setNextWeekTasks] = useState("");
  const [blockers, setBlockers] = useState("");
  const [pendingDecisions, setPendingDecisions] = useState<PendingDecisionInput[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function resetForm() {
    setFile(null);
    setNextWeekTasks("");
    setBlockers("");
    setPendingDecisions([]);
    setReportDate(new Date().toISOString().split("T")[0]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith(".md") && !f.name.endsWith(".txt")) {
      alert("仅支持 .md 或 .txt 文件");
      return;
    }
    setFile(f);
  }

  function addDecision() {
    setPendingDecisions([...pendingDecisions, emptyDecision()]);
  }

  function updateDecision(idx: number, field: keyof PendingDecisionInput, value: string) {
    const next = [...pendingDecisions];
    next[idx] = { ...next[idx], [field]: value };
    setPendingDecisions(next);
  }

  function removeDecision(idx: number) {
    setPendingDecisions(pendingDecisions.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!file) {
      alert("请先选择 .md 文件");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("reportDate", reportDate);
      if (nextWeekTasks.trim()) formData.append("nextWeekTasks", nextWeekTasks.trim());
      if (blockers.trim()) formData.append("blockers", blockers.trim());

      // Filter out empty decisions and serialize
      const validDecisions = pendingDecisions
        .filter((d) => d.title.trim())
        .map((d) => ({
          title: d.title.trim(),
          description: d.description.trim() || undefined,
          impactNote: d.impactNote.trim() || undefined,
        }));
      if (validDecisions.length > 0) {
        formData.append("pendingDecisions", JSON.stringify(validDecisions));
      }

      const res = await fetch(`/api/projects/${projectId}/reports`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newReport = await res.json();
        await refreshReports();
        setSelectedId(newReport.id);
        resetForm();
        setUploadFormOpen(false);
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

  async function handleDeleteReport(id: string) {
    if (!confirm("确定要删除此周报吗？关联的待决策事项中尚未决策的将一并删除（已决策的保留为历史）。")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    await refreshReports();
    if (selectedId === id) {
      setSelectedId(reports.length > 1 ? reports.find((r) => r.id !== id)?.id || null : null);
    }
  }

  return (
    <div>
      {isAdmin && !uploadFormOpen && (
        <div className="mb-4">
          <button
            onClick={() => setUploadFormOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer"
          >
            + 上传周报
          </button>
        </div>
      )}

      {/* Upload form */}
      {isAdmin && uploadFormOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-4">
          <h3 className="text-base font-bold text-gray-900">上传周报</h3>

          {/* 周报日期 + 文件 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">周报日期</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">周报文件 (.md 或 .txt)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".md,.txt"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
              />
              {file && <p className="text-xs text-green-600 mt-1">已选择: {file.name}</p>}
            </div>
          </div>

          {/* 下周三件主要工作 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">下周三件主要工作（可选，每行一项）</label>
            <textarea
              value={nextWeekTasks}
              onChange={(e) => setNextWeekTasks(e.target.value)}
              placeholder="1. 完成农转手续提交&#10;2. 取得电网契约申込受理回执&#10;3. 周边居民第二轮说明会"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">总经理首页会按行展示这些事项</p>
          </div>

          {/* 本周障碍 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">本周遇到的障碍（可选）</label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="电网回复延误，需协调东电PG&#10;消防离隔方案需重新设计"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* 待决策事项 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-gray-500">需要领导决策的事项（可选）</label>
              <button
                onClick={addDecision}
                className="text-xs text-green-600 hover:text-green-800 cursor-pointer"
              >
                + 添加事项
              </button>
            </div>
            {pendingDecisions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">无</p>
            ) : (
              <div className="space-y-3">
                {pendingDecisions.map((d, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2 relative">
                    <button
                      onClick={() => removeDecision(i)}
                      className="absolute top-2 right-2 text-xs text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      ✕
                    </button>
                    <input
                      type="text"
                      placeholder="标题，例：是否批准延长工期 30 天"
                      value={d.title}
                      onChange={(e) => updateDecision(i, "title", e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <textarea
                      placeholder="详细说明（可选）"
                      value={d.description}
                      onChange={(e) => updateDecision(i, "description", e.target.value)}
                      rows={2}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      placeholder="影响说明，例：成本+200万日元 / 工期+30天（可选）"
                      value={d.impactNote}
                      onChange={(e) => updateDecision(i, "impactNote", e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={uploading || !file}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {uploading ? "上传中..." : "提交"}
            </button>
            <button
              onClick={() => { resetForm(); setUploadFormOpen(false); }}
              disabled={uploading}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer disabled:cursor-not-allowed"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-400">暂无周报，请上传 .md 文件</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          {/* 左侧：周报列表 */}
          <div className="md:w-52 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-500 font-medium">周报列表（{reports.length}）</p>
              </div>
              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
                {reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left px-4 py-2.5 transition cursor-pointer ${
                      selectedId === r.id
                        ? "bg-green-50 border-l-2 border-green-600"
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
                    <h3 className="text-base font-bold text-gray-900">{selectedReport.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      周报日期：{formatDate(selectedReport.reportDate)}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteReport(selectedReport.id)}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="px-6 py-5 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:my-4 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-1 prose-table:text-sm prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-gray-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
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
