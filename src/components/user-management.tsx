"use client";

import { useState, useCallback, useEffect } from "react";

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  admin: "管理员",
  viewer: "查看者",
};

const roleColors: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-700",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Add form
  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "viewer",
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    displayName: "",
    role: "viewer",
    isActive: true,
  });

  // Reset password
  const [resetPassword, setResetPassword] = useState("");

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshUsers(); }, [refreshUsers]);

  async function handleAdd() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setAddForm({ username: "", password: "", displayName: "", role: "viewer" });
        setShowAddForm(false);
        await refreshUsers();
      } else {
        const data = await res.json();
        setError(data.error || "创建失败");
      }
    } catch {
      setError("网络错误");
    } finally { setSaving(false); }
  }

  function startEdit(u: User) {
    setEditingId(u.id);
    setEditForm({
      displayName: u.displayName,
      role: u.role,
      isActive: u.isActive,
    });
    setError("");
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        await refreshUsers();
      } else {
        const data = await res.json();
        setError(data.error || "保存失败");
      }
    } catch {
      setError("网络错误");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`确定要删除用户"${username}"吗？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshUsers();
      } else {
        const data = await res.json();
        alert(data.error || "删除失败");
      }
    } catch { alert("网络错误"); }
  }

  async function handleResetPassword() {
    if (!resetId || resetPassword.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${resetId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (res.ok) {
        setResetId(null);
        setResetPassword("");
        alert("密码重置成功");
      } else {
        const data = await res.json();
        setError(data.error || "重置失败");
      }
    } catch {
      setError("网络错误");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showAddForm && (
        <button
          onClick={() => { setShowAddForm(true); setError(""); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer"
        >
          + 新增用户
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">新增用户</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">用户名</label>
              <input
                type="text"
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                placeholder="登录用户名"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">显示名</label>
              <input
                type="text"
                value={addForm.displayName}
                onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                placeholder="姓名或职位"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">密码（至少 6 位）</label>
              <input
                type="text"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                placeholder="初始密码"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">角色</label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="viewer">查看者（只读）</option>
                <option value="admin">管理员（全部权限）</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAdd}
              disabled={saving || !addForm.username || !addForm.password || !addForm.displayName}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? "创建中..." : "创建"}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setError(""); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">重置密码</h3>
          <input
            type="text"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="新密码（至少 6 位）"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleResetPassword}
              disabled={saving || resetPassword.length < 6}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? "重置中..." : "确认重置"}
            </button>
            <button
              onClick={() => { setResetId(null); setResetPassword(""); setError(""); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">加载中...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">暂无用户</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">用户名</th>
                <th className="px-4 py-3 font-medium">显示名</th>
                <th className="px-4 py-3 font-medium w-24">角色</th>
                <th className="px-4 py-3 font-medium w-20">状态</th>
                <th className="px-4 py-3 font-medium w-28">创建时间</th>
                <th className="px-4 py-3 font-medium w-44 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition ${isEditing ? "bg-blue-50" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{u.username}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        />
                      ) : (
                        <span className="text-gray-900">{u.displayName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="viewer">查看者</option>
                          <option value="admin">管理员</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role]}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editForm.isActive ? "1" : "0"}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "1" })}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="1">启用</option>
                          <option value="0">禁用</option>
                        </select>
                      ) : u.isActive ? (
                        <span className="text-xs text-green-600">启用</span>
                      ) : (
                        <span className="text-xs text-gray-400">禁用</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={handleSaveEdit} disabled={saving} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">保存</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">取消</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(u)} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer">编辑</button>
                          <button onClick={() => { setResetId(u.id); setResetPassword(""); setError(""); }} className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer">改密码</button>
                          <button onClick={() => handleDelete(u.id, u.username)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">删除</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
