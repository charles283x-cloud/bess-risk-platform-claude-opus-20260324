import { prisma } from "@/lib/db";

export interface PendingDecisionItem {
  id: string;
  title: string;
  description: string | null;
  impactNote: string | null;
  createdAt: Date;
  projectId: string;
  projectName: string;
}

export interface LatestReportRow {
  projectId: string;
  projectName: string;
  nextWeekTasks: string | null;
  blockers: string | null;
  reportDate: Date;
}

export interface ExecutiveProjectCard {
  id: string;
  name: string;
  location: string;
  capacityMw: string | null;
  capacityMwh: string | null;
  phase: string;
  isHighRisk: boolean;
  pendingDecisionsCount: number;
  checklistTotal: number;
  checklistCompleted: number;
  milestonesTotal: number;
  milestonesCompleted: number;
}

export interface ExecutiveDashboard {
  pendingDecisions: PendingDecisionItem[];
  latestReports: LatestReportRow[];
  projects: ExecutiveProjectCard[];
}

/**
 * Aggregates all data needed for the executive dashboard at /executive.
 * Returns 3 collections plus project cards. All cross-project rollups
 * are computed here so the page component just renders.
 */
export async function getExecutiveDashboard(): Promise<ExecutiveDashboard> {
  // 1. All pending decisions (cross-project), newest first
  const pendingRaw = await prisma.pendingDecision.findMany({
    where: { status: "pending" },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const pendingDecisions: PendingDecisionItem[] = pendingRaw.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    impactNote: d.impactNote,
    createdAt: d.createdAt,
    projectId: d.project.id,
    projectName: d.project.name,
  }));

  // 2. Latest weekly_report per project (PostgreSQL DISTINCT ON)
  //    Used for both blockers and next_week_tasks blocks
  const latestReports = await prisma.$queryRaw<LatestReportRow[]>`
    SELECT DISTINCT ON (wr.project_id)
      wr.project_id as "projectId",
      p.name as "projectName",
      wr.next_week_tasks as "nextWeekTasks",
      wr.blockers,
      wr.report_date as "reportDate"
    FROM weekly_reports wr
    JOIN projects p ON wr.project_id = p.id
    ORDER BY wr.project_id, wr.report_date DESC
  `;

  // 3. Project cards: list all projects with rollup counts
  const projectsRaw = await prisma.project.findMany({
    include: {
      checklistItems: { select: { isComplete: true } },
      milestones: { select: { status: true } },
      _count: {
        select: {
          pendingDecisions: { where: { status: "pending" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const projects: ExecutiveProjectCard[] = projectsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location,
    capacityMw: p.capacityMw?.toString() ?? null,
    capacityMwh: p.capacityMwh?.toString() ?? null,
    phase: p.phase,
    isHighRisk: p.isHighRisk,
    pendingDecisionsCount: p._count.pendingDecisions,
    checklistTotal: p.checklistItems.length,
    checklistCompleted: p.checklistItems.filter((c) => c.isComplete).length,
    milestonesTotal: p.milestones.length,
    milestonesCompleted: p.milestones.filter((m) => m.status === "completed").length,
  }));

  return { pendingDecisions, latestReports, projects };
}

/**
 * Single project's data for the executive report page.
 * Returns null if project doesn't exist.
 */
export async function getExecutiveProjectReport(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: [{ plannedDate: "asc" }, { sortOrder: "asc" }] },
      pendingDecisions: {
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      },
      weeklyReports: {
        orderBy: { reportDate: "desc" },
        take: 1, // Only the latest
      },
    },
  });

  return project;
}
