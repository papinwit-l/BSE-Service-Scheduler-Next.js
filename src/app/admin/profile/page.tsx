"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  User,
  Mail,
  CheckCircle,
} from "lucide-react";

export default function AdminProfilePage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function flash(message: string) {
    setMsg(message);
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleSubmit() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      flash("❌ กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (newPassword.length < 8) {
      flash("❌ รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      flash("❌ รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        flash(`❌ ${data.error}`);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      flash("✅ เปลี่ยนรหัสผ่านสำเร็จ");
    } catch {
      flash("❌ เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="section-label mb-1">บัญชี</div>
        <h1 className="section-heading text-2xl">โปรไฟล์</h1>
      </div>

      {/* Account info */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h2 className="mb-4 text-xs font-medium text-text-muted uppercase tracking-wider">
          ข้อมูลบัญชี
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-text-muted" />
            <div>
              <div className="text-[11px] text-text-muted">ชื่อ</div>
              <div className="text-sm text-text-heading">
                {session?.user?.name || "Admin"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-text-muted" />
            <div>
              <div className="text-[11px] text-text-muted">อีเมล</div>
              <div className="text-sm text-text-heading">
                {session?.user?.email || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div
          className={`rounded-lg p-3 text-sm ${msg.startsWith("✅") ? "bg-status-completed/5 text-status-completed" : "bg-status-cancelled/5 text-status-cancelled"}`}
        >
          {msg}
        </div>
      )}

      {/* Change password */}
      <div className="rounded-lg border border-border-light bg-primary-mid p-5">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-medium text-text-muted uppercase tracking-wider">
          <Lock className="h-3.5 w-3.5" />
          เปลี่ยนรหัสผ่าน
        </h2>

        <div className="space-y-3">
          <div>
            <label className="input-label">รหัสผ่านปัจจุบัน</label>
            <div className="input-wrapper">
              <Lock className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-inner"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="shrink-0 text-text-muted hover:text-text-heading"
                tabIndex={-1}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">รหัสผ่านใหม่</label>
            <div className="input-wrapper">
              <Lock className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type={showNew ? "text" : "password"}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-inner"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="shrink-0 text-text-muted hover:text-text-heading"
                tabIndex={-1}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">ยืนยันรหัสผ่านใหม่</label>
            <div className="input-wrapper">
              <Lock className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-inner"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            เปลี่ยนรหัสผ่าน
          </button>
        </div>
      </div>
    </div>
  );
}
