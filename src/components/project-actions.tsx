"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ProjectData {
  id: string;
  name: string;
  location: string;
  capacityMw: string | null;
  capacityMwh: string | null;
  phase: string;
  targetSigningDate: string | null;
  targetStartDate: string | null;
  targetEndDate: string | null;
  notes: string | null;
  isHighRisk: boolean;
}

export default function ProjectActions({ project }: { project: ProjectData }) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: project.name,
    location: project.location,
    capacityMw: project.capacityMw || "",
    capacityMwh: project.capacityMwh || "",
    phase: project.phase,
    targetSigningDate: project.targetSigningDate || "",
    targetStartDate: project.targetStartDate || "",
    targetEndDate: project.targetEndDate || "",
    notes: project.notes || "",
    isHighRisk: project.isHighRisk,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm({ ...form, [target.name]: target.checked });
    } else {
      setForm({ ...form, [target.name]: target.value });
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        location: form.location,
        phase: form.phase,
        notes: form.notes || null,
        isHighRisk: form.isHighRisk,
        capacityMw: form.capacityMw ? parseFloat(form.capacityMw) : null,
        capacityMwh: form.capacityMwh ? parseFloat(form.capacityMwh) : null,
        targetSigningDate: form.targetSigningDate || null,
        targetStartDate: form.targetStartDate || null,
        targetEndDate: form.targetEndDate || null,
      };
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "更新失败");
        return;
      }
      setShowEdit(false);
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "删除失败");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setShowEdit(true)}
          className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 transition cursor-pointer"
        >
          编辑项目
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg px-3 py-1.5 transition cursor-pointer"
        >
          删除
        </button>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">编辑项目信息</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  项目地点 <span className="text-red-500">*</span>
                </label>
                <input
                  name="location"
                  type="text"
                  required
                  value={form.location}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">装机功率 (MW)</label>
                  <input
                    name="capacityMw"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.capacityMw}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">装机容量 (MWh)</label>
                  <input
                    name="capacityMwh"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.capacityMwh}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">项目阶段</label>
                <select
                  name="phase"
                  value={form.phase}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="pre_signing">签约前</option>
                  <option value="pre_construction">开工前</option>
                  <option value="in_progress">执行中</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目标签约</label>
                  <input
                    name="targetSigningDate"
                    type="date"
                    value={form.targetSigningDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目标开工</label>
                  <input
                    name="targetStartDate"
                    type="date"
                    value={form.targetStartDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目标竣工</label>
                  <input
                    name="targetEndDate"
                    type="date"
                    value={form.targetEndDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={form.notes}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="isHighRisk"
                  type="checkbox"
                  checked={form.isHighRisk}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                  id="isHighRisk"
                />
                <label htmlFor="isHighRisk" className="text-sm text-gray-700">
                  标记为高风险项目
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEdit(false); setError(""); }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg px-5 py-2 text-sm transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">确认删除</h2>
            <p className="text-sm text-gray-600 mb-1">
              确定要删除项目 <span className="font-medium text-gray-900">{project.name}</span> 吗？
            </p>
            <p className="text-sm text-red-600 mb-4">
              此操作不可恢复，项目的所有检查项、附件、里程碑和变更记录将被一并删除。
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDelete(false); setError(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 transition cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg px-5 py-2 text-sm transition cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
