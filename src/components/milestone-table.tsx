"use client";

import { useState, useCallback } from "react";

interface MilestoneItem {
  id: string;
  name: string;
  plannedStartDate: string;
  plannedEndDate: string;
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
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

function calcVariance(planned: string, actual: string | null): number | null {
  if (!actual) return null;
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
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
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

  const refreshMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      if (res.ok) setMilestones(await res.json());
    } catch { /* silently fail */ }
  }, [projectId]);

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function handleAdd() {
    if (!addName.trim() || !addPlannedStart || !addPlannedEnd) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          plannedStartDate: addPlannedStart,
          plannedEndDate: addPlannedEnd,
          sortOrder: totalCount,
        }),
      });
      if (res.ok) {
        setAddName("");
        setAddPlannedStart("");
        setAddPlannedEnd("");
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
          plannedStartDate: editForm.plannedStartDate || undefined,
          plannedEndDate: editForm.plannedEndDate || undefined,
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
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">里程碑进度: {completedCount}/{totalCount} 已完成</span>
          {totalCount > 0 && <span className="text-gray-700 font-medium">{progressPct}%</span>}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Admin add button */}
      {isAdmin && !showAddForm && (
        <button onClick={() => setShowAddForm(true)} className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
          + 添加里程碑
        </button>
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
              <label className="text-xs text-gray-500 mb-1 block">计划开始时间</label>
              <input type="date" value={addPlannedStart} onChange={(e) => setAddPlannedStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">计划完成时间</label>
              <input type="date" value={addPlannedEnd} onChange={(e) => setAddPlannedEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <button onClick={handleAdd} disabled={saving || !addName.trim() || !addPlannedStart || !addPlannedEnd}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed">
                {saving ? "添加中..." : "添加"}
              </button>
              <button onClick={() => { setShowAddForm(false); setAddName(""); setAddPlannedStart(""); setAddPlannedEnd(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {milestones.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">暂无里程碑</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-3 py-2.5 font-medium w-10">状态</th>
                  <th className="px-3 py-2.5 font-medium">里程碑</th>
                  <th className="px-3 py-2.5 font-medium w-24">计划开始</th>
                  <th className="px-3 py-2.5 font-medium w-24">计划完成</th>
                  <th className="px-3 py-2.5 font-medium w-24">实际开始</th>
                  <th className="px-3 py-2.5 font-medium w-24">实际完成</th>
                  <th className="px-3 py-2.5 font-medium w-16">偏差</th>
                  <th className="px-3 py-2.5 font-medium w-12">备注</th>
                  {isAdmin && <th className="px-3 py-2.5 font-medium w-20 text-right">操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {milestones.map((m) => {
                  const variance = calcVariance(m.plannedEndDate, m.actualEndDate);
                  const isEditing = editingId === m.id;

                  if (isEditing) {
                    return (
                      <tr key={m.id} className="bg-blue-50">
                        <td className="px-3 py-2">
                          <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="text-xs border border-gray-300 rounded px-1 py-1">
                            <option value="not_started">未开始</option>
                            <option value="in_progress">进行中</option>
                            <option value="completed">已完成</option>
                            <option value="delayed">已延期</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">{m.name}</td>
                        <td className="px-3 py-2"><input type="date" value={editForm.plannedStartDate} onChange={(e) => setEditForm({ ...editForm, plannedStartDate: e.target.value })} className="text-xs border border-gray-300 rounded px-1 py-1 w-full" /></td>
                        <td className="px-3 py-2"><input type="date" value={editForm.plannedEndDate} onChange={(e) => setEditForm({ ...editForm, plannedEndDate: e.target.value })} className="text-xs border border-gray-300 rounded px-1 py-1 w-full" /></td>
                        <td className="px-3 py-2"><input type="date" value={editForm.actualStartDate} onChange={(e) => setEditForm({ ...editForm, actualStartDate: e.target.value })} className="text-xs border border-gray-300 rounded px-1 py-1 w-full" /></td>
                        <td className="px-3 py-2"><input type="date" value={editForm.actualEndDate} onChange={(e) => setEditForm({ ...editForm, actualEndDate: e.target.value })} className="text-xs border border-gray-300 rounded px-1 py-1 w-full" /></td>
                        <td className="px-3 py-2">
                          <input type="text" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="备注" className="text-xs border border-gray-300 rounded px-1 py-1 w-full" />
                        </td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={handleSaveEdit} disabled={saving} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer mr-2">保存</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">取消</button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-3">
                        <span className={`inline-block w-3 h-3 rounded-full ${statusColors[m.status] || "bg-gray-400"}`} title={statusLabels[m.status] || m.status} />
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900">{m.name}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{formatDate(m.plannedStartDate)}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{formatDate(m.plannedEndDate)}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{formatDate(m.actualStartDate)}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{formatDate(m.actualEndDate)}</td>
                      <td className="px-3 py-3 text-xs">
                        {variance !== null ? (
                          <span className={variance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                            {variance > 0 ? `+${variance}` : variance}天
                          </span>
                        ) : <span className="text-gray-400">{"\u2014"}</span>}
                      </td>
                      <td className="px-3 py-3">
                        {m.notes ? (
                          <button onClick={() => setExpandedNotes(expandedNotes === m.id ? null : m.id)} className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer">
                            {expandedNotes === m.id ? "收起" : "查看"}
                          </button>
                        ) : <span className="text-gray-400 text-xs">{"\u2014"}</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-right">
                          <button onClick={() => startEdit(m)} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer mr-2">编辑</button>
                          <button onClick={() => handleDelete(m.id)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">删除</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded notes (desktop) */}
          {expandedNotes && (
            <div className="hidden md:block px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-600">{milestones.find((m) => m.id === expandedNotes)?.notes}</p>
            </div>
          )}

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {milestones.map((m) => {
              const variance = calcVariance(m.plannedEndDate, m.actualEndDate);
              return (
                <div key={m.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center mt-1">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${statusColors[m.status] || "bg-gray-400"}`} />
                      <div className="w-0.5 h-full bg-gray-200 mt-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{statusLabels[m.status] || m.status}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                        <span>计划开始: {formatDate(m.plannedStartDate)}</span>
                        <span>计划完成: {formatDate(m.plannedEndDate)}</span>
                        <span>实际开始: {formatDate(m.actualStartDate)}</span>
                        <span>实际完成: {formatDate(m.actualEndDate)}</span>
                      </div>
                      {variance !== null && (
                        <p className={`text-xs mt-1 ${variance > 0 ? "text-red-600 font-medium" : "text-green-600"}`}>
                          偏差: {variance > 0 ? `+${variance}` : variance}天
                        </p>
                      )}
                      {isAdmin && (
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => startEdit(m)} className="text-xs text-gray-500 cursor-pointer">编辑</button>
                          <button onClick={() => handleDelete(m.id)} className="text-xs text-red-500 cursor-pointer">删除</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
