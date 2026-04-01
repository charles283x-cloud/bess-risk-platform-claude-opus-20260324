import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { calculateTrafficLight, getProjectStats } from "@/lib/risk";
import { getSession } from "@/lib/auth";
import Nav from "@/components/nav";
import TrafficLight from "@/components/traffic-light";
import ProjectTabs from "@/components/project-tabs";
import ProjectActions from "@/components/project-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      checklistItems: {
        include: { attachments: true },
        orderBy: { sortOrder: "asc" },
      },
      milestones: {
        orderBy: { sortOrder: "asc" },
      },
      changeRequests: {
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: [{ plannedDate: "asc" }, { sortOrder: "asc" }],
      },
      contracts: {
        orderBy: { uploadedAt: "desc" },
      },
      documents: {
        orderBy: [{ category: "asc" }, { uploadedAt: "desc" }],
      },
    },
  });

  if (!project) notFound();

  const trafficLight = calculateTrafficLight(project);
  const stats = getProjectStats(project.checklistItems);
  const isAdmin = session.role === "admin";

  const phaseLabels: Record<string, string> = {
    pre_signing: "签约前",
    pre_construction: "开工前",
    in_progress: "执行中",
  };

  function formatDate(date: Date | null): string {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("zh-CN");
  }

  // Identify overdue items
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueItems = project.checklistItems.filter((item) => {
    if (item.isComplete || !item.deadline) return false;
    const d = new Date(item.deadline);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  // Milestone progress
  const milestoneCompleted = project.milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const milestoneTotal = project.milestones.length;

  // Pending change requests
  const pendingChangeCount = project.changeRequests.filter(
    (c) => c.decisionStatus === "pending"
  ).length;

  // Serialize items for client component
  const serializedItems = project.checklistItems.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    phase: item.phase,
    riskDescription: item.riskDescription,
    deadline: item.deadline ? item.deadline.toISOString() : null,
    isComplete: item.isComplete,
    completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    sortOrder: item.sortOrder,
    attachments: item.attachments.map((a) => ({
      id: a.id,
      originalName: a.originalName,
    })),
  }));

  // Serialize milestones
  const serializedMilestones = project.milestones.map((m) => ({
    id: m.id,
    name: m.name,
    plannedStartDate: m.plannedStartDate.toISOString(),
    plannedEndDate: m.plannedEndDate.toISOString(),
    actualStartDate: m.actualStartDate ? m.actualStartDate.toISOString() : null,
    actualEndDate: m.actualEndDate ? m.actualEndDate.toISOString() : null,
    status: m.status,
    notes: m.notes,
    sortOrder: m.sortOrder,
  }));

  // Serialize change requests
  const serializedChanges = project.changeRequests.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    impactType: c.impactType,
    impactDays: c.impactDays,
    impactCost: c.impactCost ? c.impactCost.toString() : null,
    impactDetail: c.impactDetail,
    options: c.options as Array<{ label: string; description: string }>,
    decisionStatus: c.decisionStatus,
    decisionDate: c.decisionDate ? c.decisionDate.toISOString() : null,
    decisionNotes: c.decisionNotes,
    createdAt: c.createdAt.toISOString(),
  }));

  // Serialize payments
  const serializedPayments = project.payments.map((p) => ({
    id: p.id,
    type: p.type,
    category: p.category,
    description: p.description,
    plannedAmount: p.plannedAmount.toString(),
    plannedDate: p.plannedDate.toISOString(),
    actualAmount: p.actualAmount ? p.actualAmount.toString() : null,
    actualDate: p.actualDate ? p.actualDate.toISOString() : null,
    notes: p.notes,
    sortOrder: p.sortOrder,
  }));

  // Serialize contracts
  const serializedContracts = project.contracts.map((c) => ({
    id: c.id,
    category: c.category,
    name: c.name,
    originalName: c.originalName,
    sizeBytes: c.sizeBytes,
    uploadedAt: c.uploadedAt.toISOString(),
  }));

  // Serialize documents
  const serializedDocuments = project.documents.map((d) => ({
    id: d.id,
    category: d.category,
    name: d.name,
    originalName: d.originalName,
    sizeBytes: d.sizeBytes,
    uploadedAt: d.uploadedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="hover:text-gray-700 transition">
            仪表盘
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">
            {project.name}
          </span>
        </nav>

        {/* Project Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {project.name}
                </h1>
                <TrafficLight status={trafficLight} size="lg" />
              </div>
              <p className="text-gray-500">{project.location}</p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/projects/${project.id}/report`}
                  className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 transition"
                >
                  导出报告
                </Link>
                <ProjectActions
                  project={{
                    id: project.id,
                    name: project.name,
                    location: project.location,
                    capacityMw: project.capacityMw?.toString() || null,
                    capacityMwh: project.capacityMwh?.toString() || null,
                    phase: project.phase,
                    targetSigningDate: project.targetSigningDate
                      ? project.targetSigningDate.toISOString().split("T")[0]
                      : null,
                    targetStartDate: project.targetStartDate
                      ? project.targetStartDate.toISOString().split("T")[0]
                      : null,
                    targetEndDate: project.targetEndDate
                      ? project.targetEndDate.toISOString().split("T")[0]
                      : null,
                    notes: project.notes,
                    isHighRisk: project.isHighRisk,
                  }}
                />
              </div>
            )}
          </div>

          {/* Project info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-5 pt-5 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">装机容量</p>
              <p className="text-sm font-medium text-gray-900">
                {project.capacityMw?.toString() || "-"} MW /{" "}
                {project.capacityMwh?.toString() || "-"} MWh
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">阶段</p>
              <p className="text-sm font-medium text-gray-900">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                  {phaseLabels[project.phase] || project.phase}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">目标签约日期</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(project.targetSigningDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">目标开工日期</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(project.targetStartDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">目标竣工日期</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(project.targetEndDate)}
              </p>
            </div>
          </div>

          {/* Progress summary */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">
                检查进度: {stats.completed} / {stats.total} 项完成
              </span>
              {stats.total > 0 && (
                <span className="text-gray-700 font-medium">
                  {Math.round((stats.completed / stats.total) * 100)}%
                </span>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  trafficLight === "red"
                    ? "bg-red-500"
                    : trafficLight === "yellow"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{
                  width: `${
                    stats.total > 0
                      ? (stats.completed / stats.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Milestone progress for in_progress projects */}
          {project.phase === "in_progress" && milestoneTotal > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">
                  里程碑进度: {milestoneCompleted} / {milestoneTotal} 已完成
                </span>
                <span className="text-gray-700 font-medium">
                  {Math.round((milestoneCompleted / milestoneTotal) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${(milestoneCompleted / milestoneTotal) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Pending changes badge */}
          {pendingChangeCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-md">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {pendingChangeCount} 项待决策变更
            </div>
          )}

          {/* Notes */}
          {project.notes && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">备注</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {project.notes}
              </p>
            </div>
          )}
        </div>

        {/* Tabbed Content Section */}
        <div className="mb-6">
          <ProjectTabs
            checklistItems={serializedItems}
            milestones={serializedMilestones}
            changeRequests={serializedChanges}
            payments={serializedPayments}
            contracts={serializedContracts}
            documents={serializedDocuments}
            projectId={project.id}
            isAdmin={isAdmin}
            projectPhase={project.phase}
            pendingChangeCount={pendingChangeCount}
          />
        </div>

        {/* Risk Summary Box */}
        {(overdueItems.length > 0 || project.isHighRisk) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              风险提示
            </h3>

            {project.isHighRisk && (
              <p className="text-sm text-red-700 mb-2">
                此项目已被标记为高风险项目。
              </p>
            )}

            {overdueItems.length > 0 && (
              <div>
                <p className="text-sm text-red-700 mb-2">
                  以下 {overdueItems.length} 项已逾期未完成:
                </p>
                <ul className="space-y-1">
                  {overdueItems.map((item) => (
                    <li
                      key={item.id}
                      className="text-sm text-red-700 flex items-start gap-2"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span>
                        <span className="font-medium">{item.name}</span>
                        {item.deadline && (
                          <span className="text-red-500 ml-1">
                            (截止:{" "}
                            {new Date(item.deadline).toLocaleDateString(
                              "zh-CN"
                            )}
                            )
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
