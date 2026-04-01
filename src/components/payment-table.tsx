"use client";

import { useState, useCallback } from "react";

interface PaymentItem {
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
}

interface PaymentTableProps {
  payments: PaymentItem[];
  projectId: string;
  isAdmin: boolean;
}

const typeLabels: Record<string, string> = {
  income: "收款",
  expense: "付款",
};

const typeColors: Record<string, string> = {
  income: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
};

const categoryOptions = [
  { value: "owner_payment", label: "业主付款" },
  { value: "equipment", label: "设备采购" },
  { value: "construction", label: "施工费用" },
  { value: "grid_fee", label: "电网负担金" },
  { value: "design", label: "设计费用" },
  { value: "permit", label: "许可/手续费" },
  { value: "land", label: "土地费用" },
  { value: "insurance", label: "保险" },
  { value: "tax", label: "税金" },
  { value: "other", label: "其他" },
];

const categoryLabels: Record<string, string> = Object.fromEntries(
  categoryOptions.map((c) => [c.value, c.label])
);

function formatAmount(amount: string | null): string {
  if (!amount) return "—";
  const num = parseFloat(amount);
  if (num >= 100000000) return `¥${(num / 100000000).toFixed(2)}亿`;
  if (num >= 10000) return `¥${(num / 10000).toFixed(2)}万`;
  return `¥${num.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

function getStatus(payment: PaymentItem): { label: string; color: string } {
  if (payment.actualAmount != null && payment.actualDate) {
    return { label: "已完成", color: "bg-green-500" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = new Date(payment.plannedDate);
  planned.setHours(0, 0, 0, 0);
  if (planned < today) {
    return { label: "已逾期", color: "bg-red-500" };
  }
  return { label: "待处理", color: "bg-yellow-500" };
}

const emptyForm = {
  type: "expense",
  category: "equipment",
  description: "",
  plannedAmount: "",
  plannedDate: "",
  actualAmount: "",
  actualDate: "",
  notes: "",
};

export default function PaymentTable({
  payments: initialPayments,
  projectId,
  isAdmin,
}: PaymentTableProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);

  const refreshPayments = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/payments`);
    if (res.ok) {
      const data = await res.json();
      setPayments(
        data.map((p: Record<string, unknown>) => ({
          ...p,
          plannedAmount: String(p.plannedAmount),
          actualAmount: p.actualAmount != null ? String(p.actualAmount) : null,
          plannedDate: String(p.plannedDate),
          actualDate: p.actualDate ? String(p.actualDate) : null,
        }))
      );
    }
  }, [projectId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleAdd() {
    if (!form.description || !form.plannedAmount || !form.plannedDate) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          actualAmount: form.actualAmount ? form.actualAmount : null,
          actualDate: form.actualDate || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        setForm({ ...emptyForm });
        setShowAdd(false);
        await refreshPayments();
      }
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p: PaymentItem) {
    setEditingId(p.id);
    setForm({
      type: p.type,
      category: p.category,
      description: p.description,
      plannedAmount: p.plannedAmount,
      plannedDate: p.plannedDate.split("T")[0],
      actualAmount: p.actualAmount || "",
      actualDate: p.actualDate ? p.actualDate.split("T")[0] : "",
      notes: p.notes || "",
    });
  }

  async function handleUpdate() {
    if (!editingId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          actualAmount: form.actualAmount ? form.actualAmount : null,
          actualDate: form.actualDate || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        setForm({ ...emptyForm });
        await refreshPayments();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此收付记录？")) return;
    await fetch(`/api/payments/${id}`, { method: "DELETE" });
    await refreshPayments();
  }

  // Summary calculations
  const plannedIncome = payments
    .filter((p) => p.type === "income")
    .reduce((sum, p) => sum + parseFloat(p.plannedAmount), 0);
  const plannedExpense = payments
    .filter((p) => p.type === "expense")
    .reduce((sum, p) => sum + parseFloat(p.plannedAmount), 0);
  const actualIncome = payments
    .filter((p) => p.type === "income" && p.actualAmount != null)
    .reduce((sum, p) => sum + parseFloat(p.actualAmount!), 0);
  const actualExpense = payments
    .filter((p) => p.type === "expense" && p.actualAmount != null)
    .reduce((sum, p) => sum + parseFloat(p.actualAmount!), 0);

  const overdueCount = payments.filter((p) => getStatus(p).label === "已逾期").length;

  // Form fields component
  const renderForm = (onSubmit: () => void, submitLabel: string, onCancel: () => void) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">类型</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="income">收款</option>
            <option value="expense">付款</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">分类</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            说明 <span className="text-red-500">*</span>
          </label>
          <input
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：第一期设备款"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            计划金额 <span className="text-red-500">*</span>
          </label>
          <input
            name="plannedAmount"
            type="number"
            step="0.01"
            min="0"
            value={form.plannedAmount}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="金额（日元）"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            计划日期 <span className="text-red-500">*</span>
          </label>
          <input
            name="plannedDate"
            type="date"
            value={form.plannedDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">实际金额</label>
          <input
            name="actualAmount"
            type="number"
            step="0.01"
            min="0"
            value={form.actualAmount}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="实际金额"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">实际日期</label>
          <input
            name="actualDate"
            type="date"
            value={form.actualDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
        <input
          name="notes"
          value={form.notes}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="可选"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 cursor-pointer"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !form.description || !form.plannedAmount || !form.plannedDate}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-600 mb-0.5">计划收款</p>
          <p className="text-sm font-bold text-green-800">{formatAmount(String(plannedIncome))}</p>
          <p className="text-xs text-green-600 mt-1">
            实际: {formatAmount(String(actualIncome))}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-600 mb-0.5">计划付款</p>
          <p className="text-sm font-bold text-red-800">{formatAmount(String(plannedExpense))}</p>
          <p className="text-xs text-red-600 mt-1">
            实际: {formatAmount(String(actualExpense))}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600 mb-0.5">计划净现金流</p>
          <p className={`text-sm font-bold ${plannedIncome - plannedExpense >= 0 ? "text-blue-800" : "text-red-800"}`}>
            {formatAmount(String(plannedIncome - plannedExpense))}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            实际: {formatAmount(String(actualIncome - actualExpense))}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-0.5">收付状态</p>
          <p className="text-sm font-bold text-gray-800">
            {payments.filter((p) => getStatus(p).label === "已完成").length}/{payments.length} 已完成
          </p>
          {overdueCount > 0 && (
            <p className="text-xs text-red-600 mt-1">{overdueCount} 项逾期</p>
          )}
        </div>
      </div>

      {/* Add button */}
      {isAdmin && !showAdd && !editingId && (
        <button
          onClick={() => {
            setForm({ ...emptyForm });
            setShowAdd(true);
          }}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          + 添加收付记录
        </button>
      )}

      {/* Add form */}
      {showAdd &&
        renderForm(handleAdd, "添加", () => {
          setShowAdd(false);
          setForm({ ...emptyForm });
        })}

      {/* Edit form */}
      {editingId &&
        renderForm(handleUpdate, "保存修改", () => {
          setEditingId(null);
          setForm({ ...emptyForm });
        })}

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-8">暂无收付记录</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="pb-2 pr-3 font-medium">状态</th>
                  <th className="pb-2 pr-3 font-medium">类型</th>
                  <th className="pb-2 pr-3 font-medium">分类</th>
                  <th className="pb-2 pr-3 font-medium">说明</th>
                  <th className="pb-2 pr-3 font-medium text-right">计划金额</th>
                  <th className="pb-2 pr-3 font-medium">计划日期</th>
                  <th className="pb-2 pr-3 font-medium text-right">实际金额</th>
                  <th className="pb-2 pr-3 font-medium">实际日期</th>
                  {isAdmin && <th className="pb-2 font-medium">操作</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const status = getStatus(p);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${status.color}`} />
                          <span className="text-xs text-gray-500">{status.label}</span>
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[p.type]}`}>
                          {typeLabels[p.type]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">
                        {categoryLabels[p.category] || p.category}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-900">
                        {p.description}
                        {p.notes && (
                          <span className="block text-xs text-gray-400 mt-0.5">{p.notes}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium text-gray-900">
                        {formatAmount(p.plannedAmount)}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500">{formatDate(p.plannedDate)}</td>
                      <td className="py-2.5 pr-3 text-right font-medium text-gray-900">
                        {formatAmount(p.actualAmount)}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500">{formatDate(p.actualDate)}</td>
                      {isAdmin && (
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(p)}
                              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {payments.map((p) => {
              const status = getStatus(p);
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${status.color}`} />
                      <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[p.type]}`}>
                        {typeLabels[p.type]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {categoryLabels[p.category] || p.category}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{status.label}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{p.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">计划: </span>
                      <span className="font-medium">{formatAmount(p.plannedAmount)}</span>
                      <span className="text-gray-400 ml-1">{formatDate(p.plannedDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">实际: </span>
                      <span className="font-medium">{formatAmount(p.actualAmount)}</span>
                      <span className="text-gray-400 ml-1">{formatDate(p.actualDate)}</span>
                    </div>
                  </div>
                  {p.notes && <p className="text-xs text-gray-400 mt-1">{p.notes}</p>}
                  {isAdmin && (
                    <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-xs text-blue-600 cursor-pointer"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-red-500 cursor-pointer"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
