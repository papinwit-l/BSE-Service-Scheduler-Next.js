"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  User,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Pencil,
  Check,
  X,
  AlertCircle,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";

type Admin = {
  id: string;
  email: string;
  name: string;
  role: "ROOT" | "ADMIN";
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdBy: string | null;
  bookingsCreated: number;
};

/** Readable temp password: no 0/O or 1/l, since it's read aloud or written down. */
function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 10 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export default function AdminAccountsPage() {
  const { data: session } = useSession();
  const myId = session?.user?.id;

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "ADMIN" as "ROOT" | "ADMIN",
    password: generatePassword(),
  });

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [resetFor, setResetFor] = useState<Admin | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (res.status === 403) {
        setAdmins([]);
        return;
      }
      setAdmins(await res.json());
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setBusy("create");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถสร้างบัญชีได้");
        return;
      }

      toast.success(`สร้างบัญชี ${form.email} แล้ว`, {
        description: `รหัสผ่านชั่วคราว: ${form.password}`,
        duration: 15000,
      });

      setShowCreate(false);
      setForm({
        email: "",
        name: "",
        role: "ADMIN",
        password: generatePassword(),
      });
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function patch(id: string, body: Record<string, unknown>, ok: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถบันทึกได้");
        return false;
      }

      toast.success(ok);
      await load();
      return true;
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function doReset() {
    if (!resetFor) return;

    const done = await patch(
      resetFor.id,
      { newPassword: resetPassword },
      "รีเซ็ตรหัสผ่านแล้ว",
    );

    if (done) {
      toast.info(`รหัสผ่านใหม่ของ ${resetFor.name}`, {
        description: resetPassword,
        duration: 15000,
      });
      setResetFor(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  // The API is ROOT-only; this is the matching UI state.
  if (admins.length === 0) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-status-cancelled" />
        <p className="mb-4 text-sm text-text-muted">
          เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่เข้าถึงหน้านี้ได้
        </p>
        <Link href="/admin/dashboard" className="btn-ghost text-sm">
          กลับแดชบอร์ด
        </Link>
      </div>
    );
  }

  const activeRoots = admins.filter(
    (a) => a.role === "ROOT" && a.active,
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="section-label mb-1">จัดการ</div>
          <h1 className="section-heading text-2xl">ผู้ดูแลระบบ</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn-primary text-sm"
        >
          <Plus className="h-4 w-4" />
          เพิ่มผู้ดูแล
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {admins.map((admin) => {
          const isSelf = admin.id === myId;
          const isLastRoot =
            admin.role === "ROOT" && admin.active && activeRoots === 1;

          return (
            <div
              key={admin.id}
              className={`rounded-lg border border-border-light bg-primary-mid p-4 ${
                admin.active ? "" : "opacity-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {editingId === admin.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditingId("");
                          }}
                          autoFocus
                          className="input-field max-w-[180px] text-sm"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await patch(
                              admin.id,
                              { name: editName },
                              "บันทึกแล้ว",
                            );
                            if (ok) setEditingId("");
                          }}
                          className="text-accent"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId("")}
                          className="text-text-muted"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-text-heading">
                          {admin.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(admin.id);
                            setEditName(admin.name);
                          }}
                          className="text-text-subtle hover:text-text-heading"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </>
                    )}

                    {admin.role === "ROOT" ? (
                      <span className="flex items-center gap-1 rounded-full border border-accent-border bg-accent-subtle px-2 py-0.5 text-[11px] text-accent">
                        <ShieldCheck className="h-3 w-3" />
                        ผู้ดูแลสูงสุด
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted">
                        <Shield className="h-3 w-3" />
                        ผู้ดูแล
                      </span>
                    )}

                    {isSelf && (
                      <span className="text-[11px] text-text-subtle">
                        (คุณ)
                      </span>
                    )}

                    {admin.mustChangePassword && admin.active && (
                      <span className="text-[11px] text-status-pending">
                        รอเปลี่ยนรหัสผ่าน
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {admin.email}
                    </span>
                    <span>
                      {admin.lastLoginAt
                        ? `เข้าใช้ล่าสุด ${format(
                            new Date(admin.lastLoginAt),
                            "d MMM yyyy HH:mm",
                            { locale: th },
                          )}`
                        : "ยังไม่เคยเข้าใช้"}
                    </span>
                    {admin.bookingsCreated > 0 && (
                      <span>สร้างการจอง {admin.bookingsCreated} รายการ</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetFor(admin);
                      setResetPassword(generatePassword());
                    }}
                    title="รีเซ็ตรหัสผ่าน"
                    className="text-text-muted transition-colors hover:text-text-heading"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      patch(
                        admin.id,
                        { role: admin.role === "ROOT" ? "ADMIN" : "ROOT" },
                        "เปลี่ยนสิทธิ์แล้ว",
                      )
                    }
                    disabled={busy === admin.id || isSelf || isLastRoot}
                    title={
                      isSelf
                        ? "เปลี่ยนสิทธิ์ตัวเองไม่ได้"
                        : isLastRoot
                          ? "ต้องมีผู้ดูแลสูงสุดอย่างน้อย 1 บัญชี"
                          : admin.role === "ROOT"
                            ? "ลดเป็นผู้ดูแลทั่วไป"
                            : "ยกระดับเป็นผู้ดูแลสูงสุด"
                    }
                    className="text-text-muted transition-colors hover:text-text-heading disabled:opacity-20"
                  >
                    {admin.role === "ROOT" ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      patch(
                        admin.id,
                        { active: !admin.active },
                        admin.active ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว",
                      )
                    }
                    disabled={busy === admin.id || isSelf || isLastRoot}
                    title={
                      isSelf
                        ? "ปิดใช้งานตัวเองไม่ได้"
                        : isLastRoot
                          ? "ต้องมีผู้ดูแลสูงสุดที่ใช้งานได้"
                          : admin.active
                            ? "ปิดใช้งาน"
                            : "เปิดใช้งาน"
                    }
                    className="text-text-muted transition-colors hover:text-text-heading disabled:opacity-20"
                  >
                    {admin.active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-text-subtle">
        บัญชีจะถูกปิดใช้งานเท่านั้น ไม่ถูกลบ
        เพื่อให้ประวัติการแก้ไขยังตรวจสอบได้
      </p>

      {/* Create */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-lg border border-border bg-primary-mid p-6">
            <h3 className="section-heading mb-4 text-base">เพิ่มผู้ดูแลระบบ</h3>

            <div className="space-y-4">
              <div>
                <label className="input-label">ชื่อ</label>
                <div className="input-wrapper">
                  <User className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-inner"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">อีเมล</label>
                <div className="input-wrapper">
                  <Mail className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="input-inner"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">สิทธิ์</label>
                <div className="flex gap-2">
                  {(["ADMIN", "ROOT"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        form.role === r
                          ? "bg-accent-subtle text-accent"
                          : "bg-primary text-text-muted hover:text-text-heading"
                      }`}
                    >
                      {r === "ROOT" ? "ผู้ดูแลสูงสุด" : "ผู้ดูแล"}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-text-subtle">
                  ผู้ดูแลสูงสุดจัดการบัญชีผู้ใช้และแก้ไขรายการที่ปิดแล้วได้
                </p>
              </div>

              <div>
                <label className="input-label">รหัสผ่านชั่วคราว</label>
                <div className="input-wrapper">
                  <KeyRound className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="input-inner text-data"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(form.password);
                      toast.success("คัดลอกแล้ว");
                    }}
                    className="shrink-0 text-text-muted hover:text-accent"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-text-subtle">
                  ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าใช้ครั้งแรก
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-ghost text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={create}
                disabled={busy === "create"}
                className="btn-primary text-sm"
              >
                {busy === "create" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                สร้างบัญชี
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password reset */}
      {resetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-lg border border-border bg-primary-mid p-6">
            <h3 className="section-heading mb-1 text-base">รีเซ็ตรหัสผ่าน</h3>
            <p className="mb-4 text-xs text-text-muted">{resetFor.name}</p>

            <div className="input-wrapper">
              <KeyRound className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="input-inner text-data"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetPassword);
                  toast.success("คัดลอกแล้ว");
                }}
                className="shrink-0 text-text-muted hover:text-accent"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-2 text-[11px] text-text-subtle">
              บันทึกรหัสนี้ไว้ก่อนปิดหน้าต่าง — จะไม่แสดงอีก
              ผู้ใช้ต้องเปลี่ยนรหัสเมื่อเข้าใช้ครั้งถัดไป
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetFor(null)}
                className="btn-ghost text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={doReset}
                disabled={busy === resetFor.id}
                className="btn-primary text-sm"
              >
                {busy === resetFor.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                รีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
