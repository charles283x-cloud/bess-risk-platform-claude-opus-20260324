import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getExecutiveDashboard } from "@/lib/executive-data";
import Nav from "@/components/nav";

export const dynamic = "force-dynamic";

const phaseLabels: Record<string, string> = {
  pre_signing: "签约前",
  pre_construction: "开工前",
  in_progress: "执行中",
  completed: "已完成",
};

const phaseColors: Record<string, string> = {
  pre_signing: "bg-blue-100 text-blue-700",
  pre_construction: "bg-orange-100 text-orange-700",
  in_progress: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("zh-CN");
}

export default async function ExecutivePage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  // Middleware should have already redirected admin away, but defensive check
  const role = session.role === "viewer" ? "executive" : session.role;
  if (role !== "executive") redirect("/dashboard");

  const { pendingDecisions, latestReports, projects } = await getExecutiveDashboard();

  // Filter latestReports for non-empty fields
  const reportsWithBlockers = latestReports.filter((r) => r.blockers && r.blockers.trim());
  const reportsWithTasks = latestReports.filter((r) => r.nextWeekTasks && r.nextWeekTasks.trim());

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 欢迎语 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            欢迎，{session.displayName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            储能项目风控总览 · {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>

        {/* 待我决策 */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-red-500 rounded-full inline-block" />
            📌 待我决策
            {pendingDecisions.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium text-white bg-red-500 rounded-full">
                {pendingDecisions.length}
              </span>
            )}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {pendingDecisions.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                ✓ 当前无需你决策的事项
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pendingDecisions.map((d) => (
                  <li key={d.id} className="px-5 py-4 hover:bg-gray-50 transition">
                    <Link href={`/projects/${d.projectId}/report`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{d.title}</p>
                          {d.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{d.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span className="font-medium text-gray-600">{d.projectName}</span>
                            {d.impactNote && (
                              <>
                                <span>·</span>
                                <span className="text-orange-600">{d.impactNote}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{formatDate(d.createdAt)}</span>
                          </div>
                        </div>
                        <span className="text-gray-400 text-xs">→</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 最新障碍（按项目）*/}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-orange-500 rounded-full inline-block" />
            ⚠️ 最新障碍（按项目）
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {reportsWithBlockers.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                ✓ 本周无需协调的障碍
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {reportsWithBlockers.map((r) => (
                  <li key={r.projectId} className="px-5 py-4">
                    <Link href={`/projects/${r.projectId}/report`} className="block hover:bg-gray-50 transition -mx-5 px-5 -my-4 py-4">
                      <p className="text-sm font-medium text-gray-900 mb-1">{r.projectName}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{r.blockers}</p>
                      <p className="text-xs text-gray-400 mt-2">来自 {formatDate(r.reportDate)} 周报</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 下周各项目主要工作 */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            📅 下周各项目主要工作
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {reportsWithTasks.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                还未上传 v4 格式周报。请工程总监上传后这里会自动填充。
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {reportsWithTasks.map((r) => (
                  <li key={r.projectId} className="px-5 py-4">
                    <Link href={`/projects/${r.projectId}/report`} className="block hover:bg-gray-50 transition -mx-5 px-5 -my-4 py-4">
                      <p className="text-sm font-medium text-gray-900 mb-1">{r.projectName}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{r.nextWeekTasks}</p>
                      <p className="text-xs text-gray-400 mt-2">来自 {formatDate(r.reportDate)} 周报</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 所有项目 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-gray-500 rounded-full inline-block" />
            所有项目（{projects.length}）
          </h2>
          {projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400">
              暂无项目
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => {
                const checklistPct = p.checklistTotal > 0
                  ? Math.round((p.checklistCompleted / p.checklistTotal) * 100)
                  : 0;
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/report`}
                    className="bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-sm transition p-5 relative"
                  >
                    {p.pendingDecisionsCount > 0 && (
                      <span className="absolute top-3 right-3 inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium text-white bg-red-500 rounded-full">
                        {p.pendingDecisionsCount}
                      </span>
                    )}
                    <div className="mb-2">
                      <h3 className="text-sm font-bold text-gray-900 truncate pr-8">{p.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{p.location}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${phaseColors[p.phase] || "bg-gray-100 text-gray-700"}`}>
                        {phaseLabels[p.phase] || p.phase}
                      </span>
                      {p.isHighRisk && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          高风险
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {p.capacityMw || "-"} MW / {p.capacityMwh || "-"} MWh
                    </p>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">检查进度</span>
                        <span className="text-gray-700 font-medium">{checklistPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${checklistPct}%` }}
                        />
                      </div>
                    </div>
                    {p.milestonesTotal > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">里程碑</span>
                          <span className="text-gray-700 font-medium">{p.milestonesCompleted}/{p.milestonesTotal}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-green-500 transition-all"
                            style={{ width: `${p.milestonesTotal > 0 ? (p.milestonesCompleted / p.milestonesTotal) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
