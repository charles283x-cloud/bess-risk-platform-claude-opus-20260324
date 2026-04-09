"use client";

import { useState, useEffect, useCallback } from "react";

interface PendingDecision {
  id: string;
  title: string;
  description: string | null;
  impactNote: string | null;
  status: string;
  decisionNotes: string | null;
  createdAt: string;
  decidedAt: string | null;
}

interface Props {
  projectId: string;
  isAdmin: boolean;
}

const statusLabels: Record<string, string> = {
  pending: "待决策",
  decided: "已决策",
  withdrawn: "已撤回",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  decided: "bg-green-100 text-green-800 border-green-200",
  withdrawn: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export default function PendingDecisionPanel({ projectId, isAdmin }: Props) {
  const [decisions, setDecisions] = useState<PendingDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Inline new-decision form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImpactNote, setNewImpactNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline decision form (for marking as decided)
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionNotesInput, setDecisionNotesInput] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch by project — filter client-side since there's no list-by-project endpoint yet
      // We'll fetch via the executive aggregation route or add a project endpoint if needed
      const res = await fetch(`/api/projects/${projectId}/pending-decisions`);
      if (res.ok) {
        const data = await res.json();
        setDecisions(data);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pending-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          impactNote: newImpactNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewDescription("");
        setNewImpactNote("");
        setShowAddForm(false);
        await refresh();
      } else {
        const data = await res.json();
        alert(data.error || "创建失败");
      }
    } catch {
      alert("网络错误");
    } finally { setSaving(false); }
  }

  async function handleDecide(id: string, status: "decided" | "withdrawn") {
    setSaving(true);
    try {
      const res = await fetch(`/api/pending-decisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          decisionNotes: status === "decided" ? (decisionNotesInput.trim() || null) : null,
        }),
      });
      if (res.ok) {
        setDecidingId(null);
        setDecisionNotesInput("");
        await refresh();
      } else {
        alert("更新失败");
      }
    } catch {
      alert("网络错误");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此事项吗？")) return;
    try {
      await fetch(`/api/pending-decisions/${id}`, { method: "DELETE" });
      await refresh();
    } catch { /* silently fail */ }
  }

  const pending = decisions.filter((d) => d.status === "pending");
  const history = decisions.filter((d) => d.status !== "pending");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span className="w-1 h-5 bg-yellow-500 rounded-full inline-block" />
          待决策事项管理
          {pending.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium text-white bg-yellow-500 rounded-full">
              {pending.length}
            </span>
          )}
        </h3>
        {isAdmin && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs text-yellow-700 hover:text-yellow-900 font-medium cursor-pointer"
          >
            + 新增事项
          </button>
        )}
      </div>

      {/* Add form */}
      {isAdmin && showAddForm && (
        <div className="bg-yellow-50 rounded-lg p-3 mb-4 space-y-2">
          <input
            type="text"
            placeholder="标题，例：是否批准延长工期 30 天"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded border border-yellow-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
          />
          <textarea
            placeholder="详细说明（可选）"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            className="w-full rounded border border-yellow-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
          />
          <input
            type="text"
            placeholder="影响说明，例：成本+200万日元（可选）"
            value={newImpactNote}
            onChange={(e) => setNewImpactNote(e.target.value)}
            className="w-full rounded border border-yellow-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !newTitle.trim()}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white text-xs font-medium px-3 py-1.5 rounded cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? "保存中..." : "添加"}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewTitle(""); setNewDescription(""); setNewImpactNote(""); }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">加载中...</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">✓ 当前无待决策事项</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((d) => (
            <li key={d.id} className="border-l-4 border-yellow-400 bg-yellow-50/30 pl-3 py-2 pr-2 rounded-r">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{d.title}</p>
                  {d.description && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{d.description}</p>
                  )}
                  {d.impactNote && (
                    <p className="text-xs text-orange-600 mt-1 font-medium">影响：{d.impactNote}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">创建于 {formatDate(d.createdAt)}</p>
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-1 shrink-0">
                    {decidingId === d.id ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="决策结论"
                          value={decisionNotesInput}
                          onChange={(e) => setDecisionNotesInput(e.target.value)}
                          className="w-44 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDecide(d.id, "decided")}
                            disabled={saving}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded cursor-pointer"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => { setDecidingId(null); setDecisionNotesInput(""); }}
                            className="text-xs text-gray-500 px-1 cursor-pointer"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setDecidingId(d.id); setDecisionNotesInput(""); }}
                          className="text-xs text-green-600 hover:text-green-800 cursor-pointer whitespace-nowrap"
                        >
                          标为已决策
                        </button>
                        <button
                          onClick={() => handleDecide(d.id, "withdrawn")}
                          className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer whitespace-nowrap"
                        >
                          撤回
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="text-xs text-red-500 hover:text-red-700 cursor-pointer whitespace-nowrap"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* History toggle */}
      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            {showHistory ? "▼" : "▶"} 历史决策（{history.length}）
          </button>
          {showHistory && (
            <ul className="mt-3 space-y-2">
              {history.map((d) => (
                <li key={d.id} className="text-xs text-gray-500 border-l-2 border-gray-200 pl-3 py-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${statusColors[d.status]}`}>
                      {statusLabels[d.status]}
                    </span>
                    <span className="font-medium text-gray-700">{d.title}</span>
                  </div>
                  {d.decisionNotes && <p className="mt-0.5 ml-2">结论: {d.decisionNotes}</p>}
                  <p className="ml-2 mt-0.5">{formatDate(d.decidedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
