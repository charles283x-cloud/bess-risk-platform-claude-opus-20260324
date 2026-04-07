"use client";

interface OverviewProps {
  project: {
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
  };
  trafficLight: "green" | "yellow" | "red";
  checklistStats: {
    total: number;
    completed: number;
    overdue: number;
    incomplete: number;
  };
  milestoneStats: {
    total: number;
    completed: number;
    inProgress: number;
    delayed: number;
    notStarted: number;
  };
  changeStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  overdueItems: Array<{
    name: string;
    category: string;
    deadline: string;
  }>;
  delayedMilestones: Array<{
    name: string;
    plannedEndDate: string | null;
    actualEndDate: string | null;
  }>;
  pendingChanges: Array<{
    title: string;
    impactType: string;
    createdAt: string;
  }>;
}

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

const trafficLightColors: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

const trafficLightLabels: Record<string, string> = {
  green: "正常",
  yellow: "关注",
  red: "预警",
};

const categoryLabels: Record<string, string> = {
  land: "土地",
  grid: "并网",
  residents: "居民",
  environment: "环境",
  permits: "许可",
  other: "其他",
};

const impactLabels: Record<string, string> = {
  schedule: "工期延长",
  cost: "费用增加",
  both: "工期+费用",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export default function ProjectOverview({
  project,
  trafficLight,
  checklistStats,
  milestoneStats,
  changeStats,
  overdueItems,
  delayedMilestones,
  pendingChanges,
}: OverviewProps) {
  const hasRisks = overdueItems.length > 0 || delayedMilestones.length > 0 || pendingChanges.length > 0 || project.isHighRisk;

  return (
    <div className="space-y-6">
      {/* 顶部状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 综合状态 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-3">综合状态</p>
          <div className="flex items-center gap-3">
            <span className={`w-5 h-5 rounded-full ${trafficLightColors[trafficLight]}`} />
            <span className="text-lg font-bold text-gray-900">
              {trafficLightLabels[trafficLight]}
            </span>
            <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${phaseColors[project.phase] || "bg-gray-100 text-gray-700"}`}>
              {phaseLabels[project.phase] || project.phase}
            </span>
          </div>
          {project.isHighRisk && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              ⚠ 该项目已被标记为高风险
            </div>
          )}
        </div>

        {/* 项目基本信息 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-3">项目信息</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">地点</span>
              <span className="text-gray-900 font-medium">{project.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">容量</span>
              <span className="text-gray-900 font-medium">
                {project.capacityMw || "-"} MW / {project.capacityMwh || "-"} MWh
              </span>
            </div>
          </div>
        </div>

        {/* 关键时间节点 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-3">关键节点</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">签约</span>
              <span className="text-gray-900">{formatDate(project.targetSigningDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">开工</span>
              <span className="text-gray-900">{formatDate(project.targetStartDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">竣工</span>
              <span className="text-gray-900">{formatDate(project.targetEndDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 进度指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 检查清单进度 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">检查清单</p>
            <span className="text-sm font-bold text-gray-900">
              {checklistStats.total > 0
                ? Math.round((checklistStats.completed / checklistStats.total) * 100)
                : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${checklistStats.total > 0 ? (checklistStats.completed / checklistStats.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{checklistStats.completed}/{checklistStats.total} 已完成</span>
            {checklistStats.overdue > 0 && (
              <span className="text-red-600 font-medium">{checklistStats.overdue} 项超期</span>
            )}
          </div>
        </div>

        {/* 里程碑进度 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">里程碑</p>
            <span className="text-sm font-bold text-gray-900">
              {milestoneStats.total > 0
                ? Math.round((milestoneStats.completed / milestoneStats.total) * 100)
                : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${milestoneStats.total > 0 ? (milestoneStats.completed / milestoneStats.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{milestoneStats.completed}/{milestoneStats.total} 已完成</span>
            {milestoneStats.delayed > 0 && (
              <span className="text-red-600 font-medium">{milestoneStats.delayed} 项延期</span>
            )}
          </div>
        </div>

        {/* 变更决策 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">变更决策</p>
            <span className="text-sm font-bold text-gray-900">{changeStats.total} 项</span>
          </div>
          <div className="flex gap-3 text-xs">
            {changeStats.pending > 0 && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                {changeStats.pending} 待决策
              </span>
            )}
            {changeStats.approved > 0 && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                {changeStats.approved} 已批准
              </span>
            )}
            {changeStats.rejected > 0 && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                {changeStats.rejected} 已拒绝
              </span>
            )}
            {changeStats.total === 0 && (
              <span className="text-gray-400">暂无变更</span>
            )}
          </div>
        </div>
      </div>

      {/* 风险与待办事项 */}
      {hasRisks && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h3 className="text-sm font-bold text-red-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            需要关注的事项
          </h3>
          <div className="space-y-4">
            {/* 超期检查项 */}
            {overdueItems.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">超期未完成的检查项（{overdueItems.length}项）</p>
                <div className="space-y-1.5">
                  {overdueItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="text-gray-900">{item.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {categoryLabels[item.category] || item.category} · 截止 {formatDate(item.deadline)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 延期里程碑 */}
            {delayedMilestones.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">延期的里程碑（{delayedMilestones.length}项）</p>
                <div className="space-y-1.5">
                  {delayedMilestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="text-gray-900">{m.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        计划完成 {formatDate(m.plannedEndDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 待决策变更 */}
            {pendingChanges.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">待领导决策（{pendingChanges.length}项）</p>
                <div className="space-y-1.5">
                  {pendingChanges.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                      <span className="text-gray-900">{c.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                        c.impactType === "cost" ? "bg-red-100 text-red-700" :
                        c.impactType === "schedule" ? "bg-orange-100 text-orange-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>
                        {impactLabels[c.impactType] || c.impactType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 无风险时显示 */}
      {!hasRisks && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
          <p className="text-sm text-green-700 font-medium">当前无需特别关注的事项</p>
        </div>
      )}

      {/* 备注 */}
      {project.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-2">项目备注</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}
    </div>
  );
}
