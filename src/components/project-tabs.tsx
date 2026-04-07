"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProjectOverview from "@/components/project-overview";
import ChecklistTable from "@/components/checklist-table";
import MilestoneTable from "@/components/milestone-table";
import ChangeRequestTable from "@/components/change-request-table";
import PaymentTable from "@/components/payment-table";
import ContractTable from "@/components/contract-table";
import DocumentTable from "@/components/document-table";
import PhotoGallery from "@/components/photo-gallery";

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
    description: string | null;
    isHardGate: boolean;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
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
    category: string;
    name: string;
    originalName: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
  documents: Array<{
    id: string;
    category: string;
    name: string;
    originalName: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
  photos: Array<{
    id: string;
    description: string | null;
    originalName: string;
    sizeBytes: number;
    takenAt: string | null;
    uploadedAt: string;
  }>;
  projectId: string;
  isAdmin: boolean;
  projectPhase: string;
  pendingChangeCount: number;
  projectInfo: {
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
}

const tabs = [
  { key: "overview", label: "项目概述" },
  { key: "checklist", label: "检查清单" },
  { key: "milestones", label: "里程碑" },
  { key: "changes", label: "变更决策" },
  { key: "payments", label: "资金收付" },
  { key: "contracts", label: "项目合同" },
  { key: "documents", label: "管理文件" },
  { key: "photos", label: "现场照片" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function ProjectTabs({
  checklistItems,
  milestones,
  changeRequests,
  payments,
  contracts,
  documents,
  photos,
  projectId,
  isAdmin,
  projectPhase,
  pendingChangeCount,
  projectInfo,
  trafficLight,
}: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
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
      {activeTab === "overview" && (
        <ProjectOverview
          project={projectInfo}
          trafficLight={trafficLight}
          checklistStats={{
            total: checklistItems.length,
            completed: checklistItems.filter((i) => i.isComplete).length,
            overdue: checklistItems.filter((i) => {
              if (i.isComplete || !i.deadline) return false;
              return new Date(i.deadline) < new Date();
            }).length,
            incomplete: checklistItems.filter((i) => !i.isComplete).length,
          }}
          milestoneStats={{
            total: milestones.length,
            completed: milestones.filter((m) => m.status === "completed").length,
            inProgress: milestones.filter((m) => m.status === "in_progress").length,
            delayed: milestones.filter((m) => m.status === "delayed").length,
            notStarted: milestones.filter((m) => m.status === "not_started").length,
          }}
          changeStats={{
            total: changeRequests.length,
            pending: changeRequests.filter((c) => c.decisionStatus === "pending").length,
            approved: changeRequests.filter((c) => c.decisionStatus === "approved").length,
            rejected: changeRequests.filter((c) => c.decisionStatus === "rejected").length,
          }}
          overdueItems={checklistItems
            .filter((i) => !i.isComplete && i.deadline && new Date(i.deadline) < new Date())
            .map((i) => ({ name: i.name, category: i.category, deadline: i.deadline! }))}
          delayedMilestones={milestones
            .filter((m) => m.status === "delayed")
            .map((m) => ({ name: m.name, plannedEndDate: m.plannedEndDate, actualEndDate: m.actualEndDate }))}
          pendingChanges={changeRequests
            .filter((c) => c.decisionStatus === "pending")
            .map((c) => ({ title: c.title, impactType: c.impactType, createdAt: c.createdAt }))}
        />
      )}
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
      {activeTab === "documents" && (
        <DocumentTable
          documents={documents}
          projectId={projectId}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === "photos" && (
        <PhotoGallery
          photos={photos}
          projectId={projectId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
