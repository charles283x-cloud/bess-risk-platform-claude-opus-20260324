"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/nav";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    location: "",
    capacityMw: "",
    capacityMwh: "",
    phase: "pre_signing",
    targetSigningDate: "",
    targetStartDate: "",
    targetEndDate: "",
    notes: "",
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: form.name,
        location: form.location,
        phase: form.phase,
      };

      if (form.capacityMw) body.capacityMw = parseFloat(form.capacityMw);
      if (form.capacityMwh) body.capacityMwh = parseFloat(form.capacityMwh);
      if (form.targetSigningDate) body.targetSigningDate = form.targetSigningDate;
      if (form.targetStartDate) body.targetStartDate = form.targetStartDate;
      if (form.targetEndDate) body.targetEndDate = form.targetEndDate;
      if (form.notes) body.notes = form.notes;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建失败");
        return;
      }

      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="hover:text-gray-700 transition">
            仪表盘
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">新建项目</span>
        </nav>

        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">新建项目</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                项目名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="例如：XX储能电站项目"
              />
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                项目地点 <span className="text-red-500">*</span>
              </label>
              <input
                id="location"
                name="location"
                type="text"
                required
                value={form.location}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="例如：广东省深圳市"
              />
            </div>

            {/* Capacity row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="capacityMw"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  装机功率 (MW)
                </label>
                <input
                  id="capacityMw"
                  name="capacityMw"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.capacityMw}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="100"
                />
              </div>
              <div>
                <label
                  htmlFor="capacityMwh"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  装机容量 (MWh)
                </label>
                <input
                  id="capacityMwh"
                  name="capacityMwh"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.capacityMwh}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="200"
                />
              </div>
            </div>

            {/* Phase */}
            <div>
              <label
                htmlFor="phase"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                项目阶段 <span className="text-red-500">*</span>
              </label>
              <select
                id="phase"
                name="phase"
                value={form.phase}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              >
                <option value="pre_signing">签约前</option>
                <option value="pre_construction">开工前</option>
                <option value="in_progress">执行中</option>
              </select>
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="targetSigningDate"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  目标签约日期
                </label>
                <input
                  id="targetSigningDate"
                  name="targetSigningDate"
                  type="date"
                  value={form.targetSigningDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label
                  htmlFor="targetStartDate"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  目标开工日期
                </label>
                <input
                  id="targetStartDate"
                  name="targetStartDate"
                  type="date"
                  value={form.targetStartDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label
                  htmlFor="targetEndDate"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  目标竣工日期
                </label>
                <input
                  id="targetEndDate"
                  name="targetEndDate"
                  type="date"
                  value={form.targetEndDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                备注
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={form.notes}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-y"
                placeholder="可选备注信息"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 transition"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg px-6 py-2.5 text-sm transition cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "创建中..." : "创建项目"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
