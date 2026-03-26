"use client";

import { useState, useCallback } from "react";

interface ChangeOption {
  label: string;
  description: string;
}

interface ChangeRequestItem {
  id: string;
  title: string;
  description: string;
  impactType: string;
  impactDays: number | null;
  impactCost: string | null;
  impactDetail: string;
  options: ChangeOption[];
  decisionStatus: string;
  decisionDate: string | null;
  decisionNotes: string | null;
  createdAt: string;
}

interface ChangeRequestTableProps {
  changes: ChangeRequestItem[];
  projectId: string;
  isAdmin: boolean;
}

const impactTypeLabels: Record<string, string> = {
  schedule: "工期延长",
  cost: "费用增加",
  both: "两者",
};

const impactTypeColors: Record<string, string> = {
  schedule: "bg-orange-100 text-orange-700",
  cost: "bg-red-100 text-red-700",
  both: "bg-purple-100 text-purple-700",
};

const decisionLabels: Record<string, string> = {
  pending: "待决策",
  approved: "已批准",
  rejected: "已拒绝",
};

const decisionColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

function formatCost(cost: string | null): string {
  if (!cost) return "\u2014";
  const num = Number(cost);
  if (isNaN(num)) return cost;
  return num.toLocaleString("ja-JP") + " 日元";
}

export default function ChangeRequestTable({
  changes: initialChanges,
  projectId,
  isAdmin,
}: ChangeRequestTableProps) {
  const [changes, setChanges] = useState<ChangeRequestItem[]>(initialChanges);
  const [showAddForm, setShowAddForm] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideForm, setDecideForm] = useState({
    decisionStatus: "approved",
    decisionDate: new Date().toISOString().split("T")[0],
    decisionNotes: "",
  });
  const [saving, setSaving] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({
    title: "",
    description: "",
    impactType: "schedule",
    impactDays: "",
    impactCost: "",
    impactDetail: "",
    options: [{ label: "", description: "" }] as ChangeOption[],
  });

  const refreshChanges = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/changes`);
      if (res.ok) {
        const data = await res.json();
        setChanges(data);
      }
    } catch {
      // silently fail
    }
  }, [projectId]);

  async function handleAdd() {
    if (!addForm.title.trim() || !addForm.description.trim() || !addForm.impactDetail.trim()) return;
    const validOptions = addForm.options.filter((o) => o.label.trim() && o.description.trim());
    if (validOptions.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addForm.title.trim(),
          description: addForm.description.trim(),
          impactType: addForm.impactType,
          impactDays: addForm.impactDays ? parseInt(addForm.impactDays) : null,
          impactCost: addForm.impactCost ? parseInt(addForm.impactCost) : null,
          impactDetail: addForm.impactDetail.trim(),
          options: validOptions,
        }),
      });
      if (res.ok) {
        setAddForm({
          title: "",
          description: "",
          impactType: "schedule",
          impactDays: "",
          impactCost: "",
          impactDetail: "",
          options: [{ label: "", description: "" }],
        });
        setShowAddForm(false);
        await refreshChanges();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide() {
    if (!decidingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/changes/${decidingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionStatus: decideForm.decisionStatus,
          decisionDate: decideForm.decisionDate,
          decisionNotes: decideForm.decisionNotes || null,
        }),
      });
      if (res.ok) {
        setDecidingId(null);
        await refreshChanges();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此变更请求吗？")) return;
    try {
      await fetch(`/api/changes/${id}`, { method: "DELETE" });
      await refreshChanges();
    } catch {
      // silently fail
    }
  }

  function addOption() {
    if (addForm.options.length < 3) {
      setAddForm({
        ...addForm,
        options: [...addForm.options, { label: "", description: "" }],
      });
    }
  }

  function updateOption(index: number, field: "label" | "description", value: string) {
    const newOptions = [...addForm.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setAddForm({ ...addForm, options: newOptions });
  }

  function removeOption(index: number) {
    const newOptions = addForm.options.filter((_, i) => i !== index);
    setAddForm({
      ...addForm,
      options: newOptions.length > 0 ? newOptions : [{ label: "", description: "" }],
    });
  }

  return (
    <div className="space-y-4">
      {/* Admin add button */}
      {isAdmin && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          + 新增变更请求
        </button>
      )}

      {/* Add form */}
      {isAdmin && showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">新增变更请求</h4>
          <input
            type="text"
            placeholder="标题"
            value={addForm.title}
            onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="描述"
            value={addForm.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">影响类型</label>
              <select
                value={addForm.impactType}
                onChange={(e) => setAddForm({ ...addForm, impactType: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="schedule">工期延长</option>
                <option value="cost">费用增加</option>
                <option value="both">两者</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">影响天数</label>
              <input
                type="number"
                placeholder="天数"
                value={addForm.impactDays}
                onChange={(e) => setAddForm({ ...addForm, impactDays: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">影响费用 (日元)</label>
              <input
                type="number"
                placeholder="费用"
                value={addForm.impactCost}
                onChange={(e) => setAddForm({ ...addForm, impactCost: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">影响详情</label>
            <input
              type="text"
              placeholder="影响详情"
              value={addForm.impactDetail}
              onChange={(e) => setAddForm({ ...addForm, impactDetail: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">方案选项 (最多3个)</label>
            {addForm.options.map((opt, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  placeholder={`方案${i + 1}名称`}
                  value={opt.label}
                  onChange={(e) => updateOption(i, "label", e.target.value)}
                  className="flex-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder={`方案${i + 1}描述`}
                  value={opt.description}
                  onChange={(e) => updateOption(i, "description", e.target.value)}
                  className="flex-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {addForm.options.length > 1 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                  >
                    移除
                  </button>
                )}
              </div>
            ))}
            {addForm.options.length < 3 && (
              <button
                onClick={addOption}
                className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer"
              >
                + 添加方案
              </button>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving || !addForm.title.trim() || !addForm.description.trim() || !addForm.impactDetail.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? "提交中..." : "提交"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setAddForm({
                  title: "",
                  description: "",
                  impactType: "schedule",
                  impactDays: "",
                  impactCost: "",
                  impactDetail: "",
                  options: [{ label: "", description: "" }],
                });
              }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Change request cards */}
      {changes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">暂无变更请求</div>
      ) : (
        <div className="space-y-3">
          {changes.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-lg border border-gray-200 p-4 ${
                c.decisionStatus === "pending" ? "border-l-4 border-l-yellow-400" : ""
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900">{c.title}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      impactTypeColors[c.impactType] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {impactTypeLabels[c.impactType] || c.impactType}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      decisionColors[c.decisionStatus] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {decisionLabels[c.decisionStatus] || c.decisionStatus}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 mb-2">{c.description}</p>

              {/* Impact details */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                {c.impactDays != null && (
                  <span>
                    影响工期:{" "}
                    <span className="font-medium text-gray-700">{c.impactDays}天</span>
                  </span>
                )}
                {c.impactCost != null && (
                  <span>
                    影响费用:{" "}
                    <span className="font-medium text-gray-700">
                      {formatCost(String(c.impactCost))}
                    </span>
                  </span>
                )}
                <span>
                  影响详情:{" "}
                  <span className="font-medium text-gray-700">{c.impactDetail}</span>
                </span>
              </div>

              {/* Options */}
              {Array.isArray(c.options) && c.options.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-gray-400 mb-1">方案选项:</p>
                  <ol className="list-decimal list-inside text-xs text-gray-600 space-y-0.5">
                    {(c.options as ChangeOption[]).map((opt, i) => (
                      <li key={i}>
                        <span className="font-medium">{opt.label}</span>
                        {opt.description && (
                          <span className="text-gray-500"> - {opt.description}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Decision info */}
              {c.decisionStatus !== "pending" && (
                <div className="text-xs text-gray-500 border-t border-gray-100 pt-2 mt-2">
                  <span>决策日期: {formatDate(c.decisionDate)}</span>
                  {c.decisionNotes && (
                    <span className="ml-3">决策备注: {c.decisionNotes}</span>
                  )}
                </div>
              )}

              {/* Decision form */}
              {decidingId === c.id && (
                <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">决策</label>
                      <select
                        value={decideForm.decisionStatus}
                        onChange={(e) =>
                          setDecideForm({ ...decideForm, decisionStatus: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="approved">批准</option>
                        <option value="rejected">拒绝</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">决策日期</label>
                      <input
                        type="date"
                        value={decideForm.decisionDate}
                        onChange={(e) =>
                          setDecideForm({ ...decideForm, decisionDate: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="决策备注"
                    value={decideForm.decisionNotes}
                    onChange={(e) =>
                      setDecideForm({ ...decideForm, decisionNotes: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDecide}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      {saving ? "提交中..." : "确认"}
                    </button>
                    <button
                      onClick={() => setDecidingId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* Admin actions */}
              {isAdmin && decidingId !== c.id && (
                <div className="flex items-center gap-3 border-t border-gray-100 pt-2 mt-2">
                  {c.decisionStatus === "pending" && (
                    <button
                      onClick={() => {
                        setDecidingId(c.id);
                        setDecideForm({
                          decisionStatus: "approved",
                          decisionDate: new Date().toISOString().split("T")[0],
                          decisionNotes: "",
                        });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      决策
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
