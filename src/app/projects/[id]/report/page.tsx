import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { getSession } from "@/lib/auth";
import { getExecutiveProjectReport } from "@/lib/executive-data";
import { calculateTrafficLight } from "@/lib/risk";
import Nav from "@/components/nav";
import TrafficLight from "@/components/traffic-light";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const phaseLabels: Record<string, string> = {
  pre_signing: "签约前",
  pre_construction: "开工前",
  in_progress: "执行中",
  completed: "已完成",
};

const milestoneStatusColors: Record<string, string> = {
  not_started: "bg-gray-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  delayed: "bg-red-500",
};

const milestoneStatusLabels: Record<string, string> = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
  delayed: "已延期",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("zh-CN");
}

function formatAmount(amount: string | null): string {
  if (!amount) return "—";
  const num = Number(amount);
  return num.toLocaleString("ja-JP");
}

export default async function ExecutiveProjectReportPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const role = session.role === "viewer" ? "executive" : session.role;
  if (role !== "executive") redirect(`/projects/${id}`);

  const project = await getExecutiveProjectReport(id);
  if (!project) notFound();

  // Calculate traffic light using the same logic as admin dashboard
  const checklistItemsForRisk = await import("@/lib/db").then(({ prisma }) =>
    prisma.checklistItem.findMany({ where: { projectId: id } })
  );
  const trafficLight = calculateTrafficLight({
    isHighRisk: project.isHighRisk,
    checklistItems: checklistItemsForRisk,
    milestones: project.milestones,
  });

  const latestReport = project.weeklyReports[0] || null;

  // Milestone progress
  const milestoneCompleted = project.milestones.filter((m) => m.status === "completed").length;
  const milestoneTotal = project.milestones.length;

  // Payment aggregates
  const incomeRecords = project.payments.filter((p) => p.type === "income");
  const expenseRecords = project.payments.filter((p) => p.type === "expense");
  const incomeReceived = incomeRecords.reduce((sum, p) => sum + Number(p.actualAmount || 0), 0);
  const incomePlanned = incomeRecords.reduce((sum, p) => sum + Number(p.plannedAmount), 0);
  const expensePaid = expenseRecords.reduce((sum, p) => sum + Number(p.actualAmount || 0), 0);
  const expensePlanned = expenseRecords.reduce((sum, p) => sum + Number(p.plannedAmount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/executive" className="hover:text-gray-700 transition">
            首页
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">{project.name}</span>
        </nav>

        {/* ① 项目概况 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <TrafficLight status={trafficLight} size="lg" />
              </div>
              <p className="text-sm text-gray-500">{project.location}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-1">装机容量</p>
              <p className="text-sm font-medium text-gray-900">
                {project.capacityMw?.toString() || "-"} MW / {project.capacityMwh?.toString() || "-"} MWh
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">阶段</p>
              <p className="text-sm font-medium text-gray-900">{phaseLabels[project.phase] || project.phase}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">目标开工</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(project.targetStartDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">目标竣工</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(project.targetEndDate)}</p>
            </div>
          </div>
        </section>

        {/* ② 下周三件主要工作 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
            📅 下周三件主要工作
          </h2>
          {latestReport?.nextWeekTasks && latestReport.nextWeekTasks.trim() ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{latestReport.nextWeekTasks}</p>
          ) : (
            <p className="text-sm text-gray-400">还未上传 v4 格式周报</p>
          )}
        </section>

        {/* ③ 本周障碍 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-orange-500 rounded-full inline-block" />
            ⚠️ 本周障碍
          </h2>
          {latestReport?.blockers && latestReport.blockers.trim() ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{latestReport.blockers}</p>
          ) : (
            <p className="text-sm text-gray-400">✓ 本周无需协调的障碍</p>
          )}
        </section>

        {/* ④ 待决策事项 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-red-500 rounded-full inline-block" />
            📌 待决策事项
            {project.pendingDecisions.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium text-white bg-red-500 rounded-full">
                {project.pendingDecisions.length}
              </span>
            )}
          </h2>
          {project.pendingDecisions.length === 0 ? (
            <p className="text-sm text-gray-400">✓ 当前无需你决策的事项</p>
          ) : (
            <ul className="space-y-3">
              {project.pendingDecisions.map((d) => (
                <li key={d.id} className="border-l-4 border-red-400 pl-3 py-1">
                  <p className="text-sm font-medium text-gray-900">{d.title}</p>
                  {d.description && (
                    <p className="text-xs text-gray-600 mt-1">{d.description}</p>
                  )}
                  {d.impactNote && (
                    <p className="text-xs text-orange-600 mt-1 font-medium">影响：{d.impactNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ⑤ 里程碑时间线 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-5 bg-green-500 rounded-full inline-block" />
              🏁 里程碑进度
            </h2>
            {milestoneTotal > 0 && (
              <span className="text-sm text-gray-600">
                {milestoneCompleted}/{milestoneTotal} 已完成
              </span>
            )}
          </div>
          {milestoneTotal === 0 ? (
            <p className="text-sm text-gray-400">暂无里程碑</p>
          ) : (
            <div className="space-y-3">
              {project.milestones.map((m) => {
                const variance = m.actualEndDate && m.plannedEndDate
                  ? Math.round((new Date(m.actualEndDate).getTime() - new Date(m.plannedEndDate).getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <div key={m.id} className="flex items-start gap-3 py-2">
                    <span className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${milestoneStatusColors[m.status] || "bg-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                        <span>状态: {milestoneStatusLabels[m.status] || m.status}</span>
                        {m.plannedEndDate && <span>计划完成: {formatDate(m.plannedEndDate)}</span>}
                        {m.actualEndDate && <span>实际完成: {formatDate(m.actualEndDate)}</span>}
                        {variance !== null && (
                          <span className={variance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                            偏差: {variance > 0 ? `+${variance}` : variance}天
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ⑥ 资金状况 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-purple-500 rounded-full inline-block" />
            💰 资金状况
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">已收款 / 计划</p>
              <p className="text-lg font-bold text-gray-900">
                ¥{formatAmount(incomeReceived.toString())} <span className="text-xs text-gray-500 font-normal">/ ¥{formatAmount(incomePlanned.toString())}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {incomePlanned > 0 ? Math.round((incomeReceived / incomePlanned) * 100) : 0}%
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">已支付 / 计划</p>
              <p className="text-lg font-bold text-gray-900">
                ¥{formatAmount(expensePaid.toString())} <span className="text-xs text-gray-500 font-normal">/ ¥{formatAmount(expensePlanned.toString())}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {expensePlanned > 0 ? Math.round((expensePaid / expensePlanned) * 100) : 0}%
              </p>
            </div>
          </div>
          {project.payments.length === 0 && (
            <p className="text-sm text-gray-400 mt-3">暂无资金记录</p>
          )}
        </section>

        {/* ⑦ 最新周报全文 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-gray-500 rounded-full inline-block" />
            📰 最新周报
          </h2>
          {latestReport ? (
            <>
              <div className="mb-3 pb-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{latestReport.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">周报日期：{formatDate(latestReport.reportDate)}</p>
              </div>
              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:my-4 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {latestReport.content}
                </ReactMarkdown>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">暂无周报</p>
          )}
        </section>
      </main>
    </div>
  );
}
