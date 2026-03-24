import Link from "next/link";
import { prisma } from "@/lib/db";
import { calculateTrafficLight, getProjectStats } from "@/lib/risk";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Nav from "@/components/nav";
import TrafficLight from "@/components/traffic-light";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const projects = await prisma.project.findMany({
    include: {
      checklistItems: {
        include: { attachments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate traffic light and stats for each project
  const projectsWithStatus = projects.map((project) => {
    const trafficLight = calculateTrafficLight(project);
    const stats = getProjectStats(project.checklistItems);
    return { ...project, trafficLight, stats };
  });

  // Sort by risk: red first, then yellow, then green
  const riskOrder = { red: 0, yellow: 1, green: 2 };
  projectsWithStatus.sort(
    (a, b) => riskOrder[a.trafficLight] - riskOrder[b.trafficLight]
  );

  // Summary counts
  const totalProjects = projectsWithStatus.length;
  const redCount = projectsWithStatus.filter(
    (p) => p.trafficLight === "red"
  ).length;
  const yellowCount = projectsWithStatus.filter(
    (p) => p.trafficLight === "yellow"
  ).length;
  const greenCount = projectsWithStatus.filter(
    (p) => p.trafficLight === "green"
  ).length;

  const phaseLabels: Record<string, string> = {
    pre_signing: "签约前",
    pre_construction: "开工前",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">项目总数</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalProjects}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
              <p className="text-sm text-gray-500">高风险</p>
            </div>
            <p className="text-3xl font-bold text-red-600 mt-1">{redCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
              <p className="text-sm text-gray-500">有待办</p>
            </div>
            <p className="text-3xl font-bold text-yellow-600 mt-1">
              {yellowCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
              <p className="text-sm text-gray-500">正常</p>
            </div>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {greenCount}
            </p>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">项目列表</h2>
          {session.role === "admin" && (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              新建项目
            </Link>
          )}
        </div>

        {/* Project Cards */}
        {projectsWithStatus.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">暂无项目</p>
            {session.role === "admin" && (
              <Link
                href="/projects/new"
                className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                创建第一个项目
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectsWithStatus.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition p-5 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition truncate">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                      {project.location}
                    </p>
                  </div>
                  <TrafficLight status={project.trafficLight} size="md" />
                </div>

                {/* Info row */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  {(project.capacityMw || project.capacityMwh) && (
                    <span>
                      {project.capacityMw?.toString() || "-"}MW /{" "}
                      {project.capacityMwh?.toString() || "-"}MWh
                    </span>
                  )}
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                    {phaseLabels[project.phase] || project.phase}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>
                      完成进度 {project.stats.completed}/{project.stats.total}
                    </span>
                    {project.stats.total > 0 && (
                      <span>
                        {Math.round(
                          (project.stats.completed / project.stats.total) * 100
                        )}
                        %
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        project.trafficLight === "red"
                          ? "bg-red-500"
                          : project.trafficLight === "yellow"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${
                          project.stats.total > 0
                            ? (project.stats.completed / project.stats.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Overdue badge */}
                {project.stats.overdue > 0 && (
                  <div className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {project.stats.overdue} 项逾期
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
