"use client";

import { useState, useCallback } from "react";

interface MilestoneItem {
  id: string;
  name: string;
  plannedDate: string;
  actualDate: string | null;
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
    plannedDate: "",
    actualDate: "",
    status: "",
    notes: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPlannedDate, setAddPlannedDate] = useState("");
  const [saving, setSaving] = useState(false);

  const refreshMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      if (res.ok) {
        const data = await res.json();
        setMilestones(data);
      }
    } catch {
      // silently fail
    }
  }, [projectId]);

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalCount = milestones.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function handleAdd() {
    if (!addName.trim() || !addPlannedDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          plannedDate: addPlannedDate,
          sortOrder: totalCount,
        }),
      });
      if (res.ok) {
        setAddName("");
        setAddPlannedDate("");
        setShowAddForm(false);
        await refreshMilestones();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  function startEdit(m: MilestoneItem) {
    setEditingId(m.id);
    setEditForm({
      plannedDate: m.plannedDate ? m.plannedDate.split("T")[0] : "",
      actualDate: m.actualDate ? m.actualDate.split("T")[0] : "",
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
          plannedDate: editForm.plannedDate || undefined,
          actualDate: editForm.actualDate || null,
          status: editForm.status,
          notes: editForm.notes || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        await refreshMilestones();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此里程碑吗？")) return;
    try {
      await fetch(`/api/milestones/${id}`, { method: "DELETE" });
      await refreshMilestones();
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 font-medium">
            里程碑进度: {completedCount}/{totalCount} 已完成
          </span>
          {totalCount > 0 && (
            <span className="text-gray-700 font-medium">{progressPct}%</span>
          )}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-green-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Admin add button */}
      {isAdmin && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          + 添加里程碑
        </button>
      )}

      {/* Add form */}
      {isAdmin && showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">新增里程碑</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="里程碑名称"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={addPlannedDate}
              onChange={(e) => setAddPlannedDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !addName.trim() || !addPlannedDate}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? "添加中..." : "添加"}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setAddName("");
                  setAddPlannedDate("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer"
              >
                取消
              </button>
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
                  <th className="px-4 py-2.5 font-medium w-10">状态</th>
                  <th className="px-4 py-2.5 font-medium">里程碑</th>
                  <th className="px-4 py-2.5 font-medium w-28">计划日期</th>
                  <th className="px-4 py-2.5 font-medium w-28">实际日期</th>
                  <th className="px-4 py-2.5 font-medium w-20">偏差</th>
                  <th className="px-4 py-2.5 font-medium w-16">备注</th>
                  {isAdmin && (
                    <th className="px-4 py-2.5 font-medium w-28 text-right">操作</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {milestones.map((m) => {
                  const variance = calcVariance(m.plannedDate, m.actualDate);
                  const isEditing = editingId === m.id;

                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition">
                      {/* Status dot */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm({ ...editForm, status: e.target.value })
                            }
                            className="text-xs border border-gray-300 rounded px-1 py-1"
                          >
                            <option value="not_started">未开始</option>
                            <option value="in_progress">进行中</option>
                            <option value="completed">已完成</option>
                            <option value="delayed">已延期</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block w-3 h-3 rounded-full ${statusColors[m.status] || "bg-gray-400"}`}
                            title={statusLabels[m.status] || m.status}
                          />
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>

                      {/* Planned date */}
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.plannedDate}
                            onChange={(e) =>
                              setEditForm({ ...editForm, plannedDate: e.target.value })
                            }
                            className="text-xs border border-gray-300 rounded px-1.5 py-1"
                          />
                        ) : (
                          formatDate(m.plannedDate)
                        )}
                      </td>

                      {/* Actual date */}
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.actualDate}
                            onChange={(e) =>
                              setEditForm({ ...editForm, actualDate: e.target.value })
                            }
                            className="text-xs border border-gray-300 rounded px-1.5 py-1"
                          />
                        ) : (
                          formatDate(m.actualDate)
                        )}
                      </td>

                      {/* Variance */}
                      <td className="px-4 py-3 text-xs">
                        {variance !== null ? (
                          <span className={variance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                            {variance > 0 ? `+${variance}` : variance}天
                          </span>
                        ) : (
                          <span className="text-gray-400">{"\u2014"}</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm({ ...editForm, notes: e.target.value })
                            }
                            placeholder="备注"
                            className="text-xs border border-gray-300 rounded px-1.5 py-1 w-full"
                          />
                        ) : m.notes ? (
                          <button
                            onClick={() =>
                              setExpandedNotes(expandedNotes === m.id ? null : m.id)
                            }
                            className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer"
                          >
                            {expandedNotes === m.id ? "收起" : "查看"}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">{"\u2014"}</span>
                        )}
                      </td>

                      {/* Admin actions */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(m)}
                                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded notes row (desktop) */}
          {expandedNotes && (
            <div className="hidden md:block px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                {milestones.find((m) => m.id === expandedNotes)?.notes}
              </p>
            </div>
          )}

          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-gray-100">
            {milestones.map((m) => {
              const variance = calcVariance(m.plannedDate, m.actualDate);
              const isEditing = editingId === m.id;

              return (
                <div key={m.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center mt-1">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${statusColors[m.status] || "bg-gray-400"}`}
                      />
                      <div className="w-0.5 h-full bg-gray-200 mt-1" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {statusLabels[m.status] || m.status}
                      </p>

                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <select
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm({ ...editForm, status: e.target.value })
                            }
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                          >
                            <option value="not_started">未开始</option>
                            <option value="in_progress">进行中</option>
                            <option value="completed">已完成</option>
                            <option value="delayed">已延期</option>
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-400">计划日期</label>
                              <input
                                type="date"
                                value={editForm.plannedDate}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, plannedDate: e.target.value })
                                }
                                className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">实际日期</label>
                              <input
                                type="date"
                                value={editForm.actualDate}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, actualDate: e.target.value })
                                }
                                className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                              />
                            </div>
                          </div>
                          <input
                            type="text"
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm({ ...editForm, notes: e.target.value })
                            }
                            placeholder="备注"
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving}
                              className="text-xs text-blue-600 cursor-pointer"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs text-gray-400 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>计划: {formatDate(m.plannedDate)}</span>
                            <span>实际: {formatDate(m.actualDate)}</span>
                            {variance !== null && (
                              <span className={variance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                                偏差: {variance > 0 ? `+${variance}` : variance}天
                              </span>
                            )}
                          </div>

                          {m.notes && (
                            <button
                              onClick={() =>
                                setExpandedNotes(expandedNotes === m.id ? null : m.id)
                              }
                              className="text-xs text-blue-500 mt-1 cursor-pointer"
                            >
                              {expandedNotes === m.id ? "收起备注" : "查看备注"}
                            </button>
                          )}
                          {expandedNotes === m.id && m.notes && (
                            <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded p-2">
                              {m.notes}
                            </p>
                          )}

                          {isAdmin && (
                            <div className="flex items-center gap-3 mt-2">
                              <button
                                onClick={() => startEdit(m)}
                                className="text-xs text-gray-500 cursor-pointer"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="text-xs text-red-500 cursor-pointer"
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </>
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
