"use client";

import { useState, useCallback } from "react";

interface MilestoneItem {
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
}

interface MilestoneTableProps {
  milestones: MilestoneItem[];
  projectId: string;
  isAdmin: boolean;
}

const statusColors: Record<string, string> = {
  not_started: "bg-gray-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  delayed: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
  delayed: "已延期",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

function calcVariance(planned: string | null, actual: string | null): number | null {
  if (!actual || !planned) return null;
  const p = new Date(planned);
  const a = new Date(actual);
  return Math.round((a.getTime() - p.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MilestoneTable({
  milestones: initialMilestones,
  projectId,
  isAdmin,
}: MilestoneTableProps) {
  const [milestones, setMilestones] = useState<MilestoneItem[]>(initialMilestones);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    plannedStartDate: "",
    plannedEndDate: "",
    actualStartDate: "",
    actualEndDate: "",
    status: "",
    notes: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPlannedStart, setAddPlannedStart] = useState("");
  const [addPlannedEnd, setAddPlannedEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [populating, setPopulating] = useState(false);

  const refreshMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      if (res.ok) setMilestones(await res.json());
    } catch { /* silently fail */ }
  }, [projectId]);

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function handlePopulateDefaults() {
    if (!confirm("将初始化15个储能项目标准里程碑节点，确定继续？")) return;
    setPopulating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/populate`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshMilestones();
      } else {
        const data = await res.json();
        alert(data.error || "初始化失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setPopulating(false);
    }
  }

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          plannedStartDate: addPlannedStart || null,
          plannedEndDate: addPlannedEnd || null,
          sortOrder: totalCount + 1,
        }),
      });
      if (res.ok) {
        setAddName(""); setAddPlannedStart(""); setAddPlannedEnd("");
        setShowAddForm(false);
        await refreshMilestones();
      }
    } catch { /* silently fail */ }
    finally { setSaving(false); }
  }

  function startEdit(m: MilestoneItem) {
    setEditingId(m.id);
    setEditForm({
      plannedStartDate: m.plannedStartDate?.split("T")[0] || "",
      plannedEndDate: m.plannedEndDate?.split("T")[0] || "",
      actualStartDate: m.actualStartDate?.split("T")[0] || "",
      actualEndDate: m.actualEndDate?.split("T")[0] || "",
      status: m.status,
      notes: m.notes || "",
    });
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/milestones/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannedStartDate: editForm.plannedStartDate || null,
          plannedEndDate: editForm.plannedEndDate || null,
          actualStartDate: editForm.actualStartDate || null,
          actualEndDate: editForm.actualEndDate || null,
          status: editForm.status,
          notes: editForm.notes || null,
        }),
      });
      if (res.ok) { setEditingId(null); await refreshMilestones(); }
    } catch { /* silently fail */ }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此里程碑吗？")) return;
    try {
      await fetch(`/api/milestones/${id}`, { method: "DELETE" });
      await refreshMilestones();
    } catch { /* silently fail */ }
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      {totalCount > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">里程碑进度: {completedCount}/{totalCount} 已完成</span>
            <span className="text-gray-700 font-medium">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          {totalCount === 0 && (
            <button
              onClick={handlePopulateDefaults}
              disabled={populating}
              className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {populating ? "初始化中..." : "初始化默认里程碑（15项）"}
            </button>
          )}
          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)} className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
              + 自定义里程碑
            </button>
          )}
        </div>
      )}

      {/* Add form */}
      {isAdmin && showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">新增里程碑</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 lg:col-span-4">
              <input type="text" placeholder="里程碑名称" value={addName} onChange={(e) => setAddName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">计划开始（可选）</label>
              <input type="date" value={addPlannedStart} onChange={(e) => setAddPlannedStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">计划完成（可选）</label>
              <input type="date" value={addPlannedEnd} onChange={(e) => setAddPlannedEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <button onClick={handleAdd} disabled={saving || !addName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed">
                {saving ? "添加中..." : "添加"}
              </button>
              <button onClick={() => { setShowAddForm(false); setAddName(""); setAddPlannedStart(""); setAddPlannedEnd(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone list */}
      {milestones.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">暂无里程碑，点击上方按钮初始化默认节点</div>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => {
            const variance = calcVariance(m.plannedEndDate, m.actualEndDate);
            const isEditing = editingId === m.id;

            return (
              <div key={m.id} className={`bg-white border rounded-lg overflow-hidden transition ${
                isEditing ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
              }`}>
                {/* Main row */}
                <div className="p-3 flex items-start gap-3">
                  {/* Status dot + line */}
                  <div className="flex flex-col items-center mt-1 shrink-0">
                    <span className={`w-3 h-3 rounded-full ${statusColors[m.status]}`} title={statusLabels[m.status]} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{m.sortOrder}. {m.name}</span>
                      {m.isHardGate && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">硬节点</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        m.status === "completed" ? "bg-green-100 text-green-700" :
                        m.status === "delayed" ? "bg-red-100 text-red-700" :
                        m.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{statusLabels[m.status]}</span>
                      {variance !== null && (
                        <span className={`text-xs font-medium ${variance > 0 ? "text-red-600" : "text-green-600"}`}>
                          {variance > 0 ? `+${variance}` : variance}天
                        </span>
                      )}
                    </div>

                    {/* Description as note below name */}
                    {m.description && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{m.description}</p>
                    )}

                    {/* Dates row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                      <span>计划: {formatDate(m.plannedStartDate)} ~ {formatDate(m.plannedEndDate)}</span>
                      {(m.actualStartDate || m.actualEndDate) && (
                        <span>实际: {formatDate(m.actualStartDate)} ~ {formatDate(m.actualEndDate)}</span>
                      )}
                    </div>

                    {m.notes && <p className="text-xs text-gray-500 mt-1">备注: {m.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <>
                        <button onClick={() => startEdit(m)} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer px-1.5 py-1">编辑</button>
                        <button onClick={() => handleDelete(m.id)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer px-1.5 py-1">删除</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="border-t border-gray-100 bg-blue-50/50 p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">状态</label>
                        <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
                          <option value="not_started">未开始</option>
                          <option value="in_progress">进行中</option>
                          <option value="completed">已完成</option>
                          <option value="delayed">已延期</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">计划开始</label>
                        <input type="date" value={editForm.plannedStartDate} onChange={(e) => setEditForm({ ...editForm, plannedStartDate: e.target.value })}
                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">计划完成</label>
                        <input type="date" value={editForm.plannedEndDate} onChange={(e) => setEditForm({ ...editForm, plannedEndDate: e.target.value })}
                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">实际开始</label>
                        <input type="date" value={editForm.actualStartDate} onChange={(e) => setEditForm({ ...editForm, actualStartDate: e.target.value })}
                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">实际完成</label>
                        <input type="date" value={editForm.actualEndDate} onChange={(e) => setEditForm({ ...editForm, actualEndDate: e.target.value })}
                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">备注</label>
                        <input type="text" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5" placeholder="可选" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 cursor-pointer">取消</button>
                      <button onClick={handleSaveEdit} disabled={saving}
                        className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-1.5 rounded-lg cursor-pointer disabled:cursor-not-allowed">
                        {saving ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
