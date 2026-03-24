export type TrafficLight = "green" | "yellow" | "red";

interface ChecklistItemForRisk {
  isComplete: boolean;
  deadline: Date | null;
}

interface ProjectForRisk {
  isHighRisk: boolean;
  checklistItems: ChecklistItemForRisk[];
}

export function calculateTrafficLight(project: ProjectForRisk): TrafficLight {
  // Rule 1: Manual high-risk override
  if (project.isHighRisk) return "red";

  const items = project.checklistItems;

  // Rule 5: No checklist items
  if (items.length === 0) return "yellow";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const incompleteItems = items.filter((item) => !item.isComplete);

  // Rule 4: All items complete
  if (incompleteItems.length === 0) return "green";

  // Rule 2: Any incomplete item past deadline
  const hasOverdue = incompleteItems.some((item) => {
    if (!item.deadline) return false;
    const deadline = new Date(item.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today;
  });

  if (hasOverdue) return "red";

  // Rule 3: Incomplete items but none overdue
  return "yellow";
}

export function getProjectStats(items: ChecklistItemForRisk[]) {
  const total = items.length;
  const completed = items.filter((i) => i.isComplete).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = items.filter((i) => {
    if (i.isComplete || !i.deadline) return false;
    const d = new Date(i.deadline);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }).length;

  return { total, completed, overdue, incomplete: total - completed };
}
