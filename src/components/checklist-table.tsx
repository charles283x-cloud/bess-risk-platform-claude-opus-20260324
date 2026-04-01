"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/file-upload";

interface Attachment {
  id: string;
  originalName: string;
}

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  phase: string;
  riskDescription: string;
  deadline: string | null;
  isComplete: boolean;
  completedAt: string | null;
  sortOrder: number;
  attachments: Attachment[];
}

interface ChecklistTableProps {
  items: ChecklistItem[];
  projectId: string;
  isAdmin: boolean;
}

const categoryLabels: Record<string, string> = {
  permits: "许可/手续",
  land: "土地",
  environment: "环保/消防",
  grid: "电网/并网",
  residents: "地方/居民",
  other: "其他",
  legal: "法务",
  financial: "财务",
  technical: "技术",
  environmental: "环保",
  regulatory: "审批",
  commercial: "商务",
};

const categoryColors: Record<string, string> = {
  permits: "bg-purple-100 text-purple-700",
  land: "bg-amber-100 text-amber-700",
  environment: "bg-green-100 text-green-700",
  grid: "bg-blue-100 text-blue-700",
  residents: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-700",
  legal: "bg-purple-100 text-purple-700",
  financial: "bg-blue-100 text-blue-700",
  technical: "bg-teal-100 text-teal-700",
  environmental: "bg-green-100 text-green-700",
  regulatory: "bg-orange-100 text-orange-700",
  commercial: "bg-pink-100 text-pink-700",
};

export default function ChecklistTable({
  items: initialItems,
  projectId,
  isAdmin,
}: ChecklistTableProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);
  const [deadlineValue, setDeadlineValue] = useState("");
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  // Group items by category
  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const refreshItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/items`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // silently fail
    }
  }, [projectId]);

  async function handleToggleComplete(itemId: string, currentStatus: boolean) {
    try {
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: !currentStatus }),
      });
      await refreshItems();
    } catch {
      // silently fail
    }
  }

  async function handleSaveDeadline(itemId: string) {
    try {
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: deadlineValue || null }),
      });
      setEditingDeadline(null);
      await refreshItems();
    } catch {
      // silently fail
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("确定要删除此检查项吗？")) return;
    try {
      await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      await refreshItems();
    } catch {
      // silently fail
    }
  }

  function isOverdue(item: ChecklistItem): boolean {
    if (item.isComplete || !item.deadline) return false;
    const deadline = new Date(item.deadline);
    deadline.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today;
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("zh-CN");
  }

  const sortedCategories = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                categoryColors[category] || categoryColors.other
              }`}
            >
              {categoryLabels[category] || category}
            </span>
            <span className="text-gray-400 font-normal">
              ({grouped[category].length} 项)
            </span>
          </h3>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-4 py-2.5 font-medium w-10">状态</th>
                    <th className="px-4 py-2.5 font-medium">检查项</th>
                    <th className="px-4 py-2.5 font-medium w-28">截止日期</th>
                    <th className="px-4 py-2.5 font-medium w-16">附件</th>
                    {isAdmin && (
                      <th className="px-4 py-2.5 font-medium w-32 text-right">
                        操作
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grouped[category]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 transition ${
                          isOverdue(item) ? "bg-red-50/50" : ""
                        }`}
                      >
                        {/* Status */}
                        <td className="px-4 py-3">
                          {isAdmin ? (
                            <button
                              onClick={() =>
                                handleToggleComplete(item.id, item.isComplete)
                              }
                              className="cursor-pointer"
                              title={
                                item.isComplete
                                  ? "标记为未完成"
                                  : "标记为已完成"
                              }
                            >
                              {item.isComplete ? (
                                <svg
                                  className="w-5 h-5 text-green-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-5 h-5 text-gray-300"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                    strokeWidth="2"
                                  />
                                </svg>
                              )}
                            </button>
                          ) : item.isComplete ? (
                            <svg
                              className="w-5 h-5 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="9"
                                strokeWidth="2"
                              />
                            </svg>
                          )}
                        </td>

                        {/* Name + risk description */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              setExpandedRisk(
                                expandedRisk === item.id ? null : item.id
                              )
                            }
                            className="text-left cursor-pointer"
                          >
                            <span
                              className={`font-medium ${
                                item.isComplete
                                  ? "text-gray-400 line-through"
                                  : "text-gray-900"
                              }`}
                            >
                              {item.name}
                            </span>
                            {isOverdue(item) && (
                              <span className="ml-2 text-xs text-red-600 font-medium">
                                已逾期
                              </span>
                            )}
                          </button>
                          {expandedRisk === item.id && item.riskDescription && (
                            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                              {item.riskDescription}
                            </p>
                          )}
                          {/* Inline file upload */}
                          {uploadingFor === item.id && (
                            <div className="mt-2">
                              <FileUpload
                                itemId={item.id}
                                onUploadComplete={() => {
                                  setUploadingFor(null);
                                  refreshItems();
                                }}
                              />
                            </div>
                          )}
                        </td>

                        {/* Deadline */}
                        <td className="px-4 py-3">
                          {editingDeadline === item.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={deadlineValue}
                                onChange={(e) =>
                                  setDeadlineValue(e.target.value)
                                }
                                className="text-xs border border-gray-300 rounded px-1.5 py-1"
                              />
                              <button
                                onClick={() => handleSaveDeadline(item.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingDeadline(null)}
                                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`text-xs ${
                                isOverdue(item)
                                  ? "text-red-600 font-medium"
                                  : "text-gray-500"
                              }`}
                            >
                              {formatDate(item.deadline)}
                            </span>
                          )}
                        </td>

                        {/* Attachments */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500">
                            {item.attachments.length > 0 ? (
                              <span className="inline-flex items-center gap-0.5">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                  />
                                </svg>
                                {item.attachments.length}
                              </span>
                            ) : (
                              "-"
                            )}
                          </span>
                        </td>

                        {/* Actions */}
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  setUploadingFor(
                                    uploadingFor === item.id ? null : item.id
                                  )
                                }
                                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                                title="上传文件"
                              >
                                上传
                              </button>
                              <button
                                onClick={() => {
                                  setEditingDeadline(item.id);
                                  setDeadlineValue(
                                    item.deadline
                                      ? item.deadline.split("T")[0]
                                      : ""
                                  );
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                                title="编辑截止日期"
                              >
                                日期
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                                title="删除"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="md:hidden divide-y divide-gray-100">
              {grouped[category]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 ${isOverdue(item) ? "bg-red-50/50" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status icon */}
                      <div className="mt-0.5">
                        {isAdmin ? (
                          <button
                            onClick={() =>
                              handleToggleComplete(item.id, item.isComplete)
                            }
                            className="cursor-pointer"
                          >
                            {item.isComplete ? (
                              <svg
                                className="w-5 h-5 text-green-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  strokeWidth="2"
                                />
                              </svg>
                            )}
                          </button>
                        ) : item.isComplete ? (
                          <svg
                            className="w-5 h-5 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="9" strokeWidth="2" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            item.isComplete
                              ? "text-gray-400 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {item.name}
                        </p>

                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>
                            截止: {formatDate(item.deadline)}
                            {isOverdue(item) && (
                              <span className="ml-1 text-red-600 font-medium">
                                已逾期
                              </span>
                            )}
                          </span>
                          {item.attachments.length > 0 && (
                            <span>{item.attachments.length} 个附件</span>
                          )}
                        </div>

                        {item.riskDescription && (
                          <button
                            onClick={() =>
                              setExpandedRisk(
                                expandedRisk === item.id ? null : item.id
                              )
                            }
                            className="text-xs text-blue-500 mt-1 cursor-pointer"
                          >
                            {expandedRisk === item.id
                              ? "收起风险说明"
                              : "查看风险说明"}
                          </button>
                        )}

                        {expandedRisk === item.id && item.riskDescription && (
                          <p className="mt-1 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded p-2">
                            {item.riskDescription}
                          </p>
                        )}

                        {/* Admin actions for mobile */}
                        {isAdmin && (
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={() =>
                                setUploadingFor(
                                  uploadingFor === item.id ? null : item.id
                                )
                              }
                              className="text-xs text-blue-600 cursor-pointer"
                            >
                              上传文件
                            </button>
                            <button
                              onClick={() => {
                                setEditingDeadline(item.id);
                                setDeadlineValue(
                                  item.deadline
                                    ? item.deadline.split("T")[0]
                                    : ""
                                );
                              }}
                              className="text-xs text-gray-500 cursor-pointer"
                            >
                              编辑日期
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-xs text-red-500 cursor-pointer"
                            >
                              删除
                            </button>
                          </div>
                        )}

                        {/* Inline deadline editor for mobile */}
                        {editingDeadline === item.id && (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="date"
                              value={deadlineValue}
                              onChange={(e) => setDeadlineValue(e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            />
                            <button
                              onClick={() => handleSaveDeadline(item.id)}
                              className="text-xs text-blue-600 cursor-pointer"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingDeadline(null)}
                              className="text-xs text-gray-400 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        )}

                        {/* Inline file upload for mobile */}
                        {uploadingFor === item.id && (
                          <div className="mt-2">
                            <FileUpload
                              itemId={item.id}
                              onUploadComplete={() => {
                                setUploadingFor(null);
                                refreshItems();
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          暂无检查项
        </div>
      )}
    </div>
  );
}
