"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Car,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Pencil,
  ChevronUp,
  ChevronDown,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

type Model = {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  bookings: number;
};

type Typed = { name: string; count: number };

export default function CarModelsSection() {
  const [models, setModels] = useState<Model[]>([]);
  const [typed, setTyped] = useState<Typed[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/car-models");
      const data = await res.json();
      setModels(data.models || []);
      setTyped(data.typedByCustomers || []);
    } catch {
      toast.error("ไม่สามารถโหลดรุ่นรถได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    setAdding(true);
    try {
      const res = await fetch("/api/admin/car-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถเพิ่มได้");
        return;
      }

      toast.success(`เพิ่ม ${trimmed} แล้ว`);
      setNewName("");
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/car-models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถบันทึกได้");
        await load();
        return false;
      }

      toast.success("บันทึกแล้ว");
      return true;
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function remove(model: Model) {
    if (!confirm(`ลบรุ่น ${model.name}?`)) return;

    setBusy(model.id);
    try {
      const res = await fetch(`/api/admin/car-models?id=${model.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "ไม่สามารถลบได้");
        return;
      }

      toast.success(`ลบ ${model.name} แล้ว`);
      await load();
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  /**
   * Move one row up or down. Arrows rather than drag-and-drop: the list runs
   * to 20+ entries and reordering is rare, so precision beats gesture here.
   */
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= models.length) return;

    const next = [...models];
    [next[index], next[target]] = [next[target], next[index]];
    setModels(next);

    try {
      await fetch("/api/admin/car-models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: next.map((m, i) => ({ id: m.id, sortOrder: i + 1 })),
        }),
      });
    } catch {
      toast.error("ไม่สามารถเรียงลำดับได้");
      await load();
    }
  }

  async function saveRename(model: Model) {
    if (editName.trim() === model.name) {
      setEditingId("");
      return;
    }

    const ok = await patch(model.id, { name: editName });
    if (ok) {
      setEditingId("");
      await load();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด...
      </div>
    );
  }

  const known = new Set(models.map((m) => m.name.toLowerCase()));
  const suggestions = typed.filter((t) => !known.has(t.name.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wider text-text-muted uppercase">
          <Car className="h-3.5 w-3.5" />
          รุ่นรถ
        </h2>
        <p className="text-xs text-text-subtle">
          รายการที่ลูกค้าเลือกตอนจอง · ลูกค้าเลือก &ldquo;อื่นๆ&rdquo;
          แล้วพิมพ์เองได้เสมอ
        </p>
      </div>

      {/* Add */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add(newName)}
          placeholder="เช่น C-Class"
          className="input-field text-sm"
        />
        <button
          type="button"
          onClick={() => add(newName)}
          disabled={adding || !newName.trim()}
          className="btn-primary shrink-0 text-sm"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          เพิ่ม
        </button>
      </div>

      {/* What customers typed themselves */}
      {suggestions.length > 0 && (
        <div className="rounded-lg border border-border-light bg-primary p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-text-muted">
            <Lightbulb className="h-3.5 w-3.5 text-status-pending" />
            ลูกค้าพิมพ์รุ่นเหล่านี้เอง — เพิ่มเข้ารายการหรือไม่?
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => add(s.name)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-primary-mid px-2.5 py-1.5 text-xs text-text-muted transition-all hover:border-accent-border hover:text-accent"
              >
                <Plus className="h-3 w-3" />
                {s.name}
                <span className="text-text-subtle">({s.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-1.5">
        {models.map((model, i) => (
          <div
            key={model.id}
            className={`flex items-center gap-3 rounded-lg border border-border-light bg-primary-mid p-2.5 ${
              model.active ? "" : "opacity-50"
            }`}
          >
            {/* Reorder */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-text-subtle transition-colors hover:text-text-heading disabled:opacity-20"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === models.length - 1}
                className="text-text-subtle transition-colors hover:text-text-heading disabled:opacity-20"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Name */}
            {editingId === model.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(model);
                    if (e.key === "Escape") setEditingId("");
                  }}
                  autoFocus
                  className="input-field text-sm"
                />
                <button
                  type="button"
                  onClick={() => saveRename(model)}
                  className="text-accent hover:opacity-80"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId("")}
                  className="text-text-muted hover:text-text-heading"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm text-text-heading">
                  {model.name}
                </span>

                {model.bookings > 0 && (
                  <span className="text-[11px] text-text-subtle">
                    {model.bookings} การจอง
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingId(model.id);
                    setEditName(model.name);
                  }}
                  className="text-text-muted transition-colors hover:text-text-heading"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const ok = await patch(model.id, { active: !model.active });
                    if (ok) await load();
                  }}
                  disabled={busy === model.id}
                  title={model.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  className="text-text-muted transition-colors hover:text-text-heading"
                >
                  {model.active ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => remove(model)}
                  disabled={busy === model.id || model.bookings > 0}
                  title={
                    model.bookings > 0 ? "มีการจองแล้ว — ปิดใช้งานแทน" : "ลบ"
                  }
                  className="text-text-muted transition-colors hover:text-status-cancelled disabled:opacity-20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-text-subtle">
        การจองเก็บชื่อรุ่นเป็นข้อความ การเปลี่ยนชื่อหรือปิดใช้งานที่นี่
        จะไม่กระทบการจองเดิม
      </p>
    </div>
  );
}
