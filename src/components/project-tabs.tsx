"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ChecklistTable from "@/components/checklist-table";
import MilestoneTable from "@/components/milestone-table";
import ChangeRequestTable from "@/components/change-request-table";
import PaymentTable from "@/components/payment-table";
import ContractTable from "@/components/contract-table";

interface ProjectTabsProps {
  checklistItems: Array<{
    id: string;
    name: string;
    category: string;
    phase: string;
    riskDescription: string;
    deadline: string | null;
    isComplete: boolean;
    completedAt: string | null;
    sortOrder: number;
    attachments: Array<{ id: string; originalName: string }>;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    plannedStartDate: string;
    plannedEndDate: string;
    actualStartDate: string | null;
    actualEndDate: string | null;
    status: string;
    notes: string | null;
    sortOrder: number;
  }>;
  changeRequests: Array<{
    id: string;
    title: string;
    description: string;
    impactType: string;
    impactDays: number | null;
    impactCost: string | null;
    impactDetail: string;
    options: Array<{ label: string; description: string }>;
    decisionStatus: string;
    decisionDate: string | null;
    decisionNotes: string | null;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    type: string;
    category: string;
    description: string;
    plannedAmount: string;
    plannedDate: string;
    actualAmount: string | null;
    actualDate: string | null;
    notes: string | null;
    sortOrder: number;
  }>;
  contracts: Array<{
    id: string;
    name: string;
    originalName: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
  projectId: string;
  isAdmin: boolean;
  projectPhase: string;
  pendingChangeCount: number;
}

const tabs = [
  { key: "checklist", label: "检查清单" },
  { key: "milestones", label: "里程碑" },
  { key: "changes", label: "变更决策" },
  { key: "payments", label: "资金收付" },
  { key: "contracts", label: "合同文件" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function ProjectTabs({
  checklistItems,
  milestones,
  changeRequests,
  payments,
  contracts,
  projectId,
  isAdmin,
  projectPhase,
  pendingChangeCount,
}: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("checklist");
  const [phaseUpdating, setPhaseUpdating] = useState(false);
  const router = useRouter();

  const canEnterExecution =
    isAdmin && (projectPhase === "pre_signing" || projectPhase === "pre_construction");

  async function handleEnterExecution() {
    if (!confirm("确定要将项目推进到执行阶段吗？")) return;
    setPhaseUpdating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "in_progress" }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setPhaseUpdating(false);
    }
  }

  return (
    <div>
      {/* Phase action */}
      {canEnterExecution && (
        <div className="mb-4">
          <button
            onClick={handleEnterExecution}
            disabled={phaseUpdating}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
          >
            {phaseUpdating ? "更新中..." : "进入执行阶段"}
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center border-b border-gray-200 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.key === "changes" && pendingChangeCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                {pendingChangeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "checklist" && (
        <ChecklistTable
          items={checklistItems}
          projectId={projectId}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === "milestones" && (
        <MilestoneTable
          milestones={milestones}
          projectId={projectId}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === "changes" && (
        <ChangeRequestTable
          changes={changeRequests}
          projectId={projectId}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === "payments" && (
        <PaymentTable
          payments={payments}
          projectId={projectId}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === "contracts" && (
        <ContractTable
          contracts={contracts}
          projectId={projectId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
