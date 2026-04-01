import { prisma } from "@/lib/db";
import Link from "next/link";
import Nav from "@/components/nav";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  permits: "许可/手续",
  land: "土地",
  environment: "环保/消防",
  grid: "电网/并网",
  residents: "地方/居民",
  other: "其他",
};

const categoryColors: Record<string, string> = {
  land: "bg-amber-100 text-amber-800",
  grid: "bg-blue-100 text-blue-800",
  residents: "bg-purple-100 text-purple-800",
  environment: "bg-green-100 text-green-800",
  permits: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-800",
};

const phaseLabels: Record<string, string> = {
  pre_signing: "签约前",
  pre_construction: "开工前",
};

export default async function TemplatesPage() {
  const templates = await prisma.checklistTemplate.findMany({
    orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
  });

  const preSigningTemplates = templates.filter((t) => t.phase === "pre_signing");
  const preConstructionTemplates = templates.filter((t) => t.phase === "pre_construction");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">检查清单模板</h1>
          <span className="text-sm text-gray-500">共 {templates.length} 项</span>
        </div>

        {/* 签约前 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
            签约前检查（{preSigningTemplates.length} 项）
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-10">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">检查项</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">类别</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">未完成风险说明</th>
                </tr>
              </thead>
              <tbody>
                {preSigningTemplates.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{t.sortOrder}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[t.category] || categoryColors.other}`}>
                        {categoryLabels[t.category] || t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.riskDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 开工前 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
            开工前检查（{preConstructionTemplates.length} 项）
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-10">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">检查项</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">类别</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">未完成风险说明</th>
                </tr>
              </thead>
              <tbody>
                {preConstructionTemplates.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{t.sortOrder}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[t.category] || categoryColors.other}`}>
                        {categoryLabels[t.category] || t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.riskDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← 返回仪表盘
          </Link>
        </div>
      </main>
    </div>
  );
}
