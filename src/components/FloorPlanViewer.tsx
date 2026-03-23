import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Trash2, Edit2, X, Check, Upload, Copy } from "lucide-react";
import type { Hotspot } from "@/types/floorplan";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Props {
  floorPlanSrc: string | null;
  onUploadFloorPlan: () => void;
}

export default function FloorPlanViewer({ floorPlanSrc, onUploadFloorPlan }: Props) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [isAdding, setIsAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load hotspots from Supabase on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("hotspots").select("*");
      if (data) {
        setHotspots(data.map((h) => ({
          id: h.id,
          x: h.x,
          y: h.y,
          title: h.title,
          description: h.description,
          image: h.image,
          displayNumber: h.display_number,
        })));
      }
    };
    load();
  }, []);

  const saveHotspot = async (h: Hotspot, index: number) => {
    await supabase.from("hotspots").upsert({
      id: h.id,
      x: h.x,
      y: h.y,
      title: h.title,
      description: h.description,
      image: h.image,
      display_number: h.displayNumber ?? index + 1,
    });
  };

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleContainerClick = async (e: React.MouseEvent) => {
    if (!isAdding) { setActiveId(null); return; }
    const pos = getRelativePos(e);
    const newHotspot: Hotspot = {
      id: Date.now().toString(),
      x: pos.x,
      y: pos.y,
      title: "New Area",
      description: "Click edit to add a description.",
      image: null,
    };
    setHotspots((h) => [...h, newHotspot]);
    await saveHotspot(newHotspot, hotspots.length);
    setIsAdding(false);
    setActiveId(newHotspot.id);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);

    const onMove = (ev: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
      setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, x, y } : h)));
    };

    const onUp = async () => {
      setDraggingId(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Save final position after drag
      setHotspots((prev) => {
        const h = prev.find((h) => h.id === id);
        if (h) saveHotspot(h, prev.indexOf(h));
        return prev;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startEditing = (h: Hotspot) => {
    setEditingId(h.id);
    setEditForm({ title: h.title, description: h.description });
  };

  const saveEdit = async (id: string) => {
    const updated = hotspots.map((h) => (h.id === id ? { ...h, ...editForm } : h));
    setHotspots(updated);
    setEditingId(null);
    const h = updated.find((h) => h.id === id);
    if (h) await saveHotspot(h, updated.indexOf(h));
  };

  const deleteHotspot = async (id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    setActiveId(null);
    await supabase.from("hotspots").delete().eq("id", id);
  };

  const cloneHotspot = async (h: Hotspot, originalIndex: number) => {
    const cloned: Hotspot = {
      ...h,
      id: Date.now().toString(),
      x: Math.min(h.x + 5, 95),
      y: Math.min(h.y + 5, 95),
      title: `${h.title} (copy)`,
      displayNumber: h.displayNumber ?? originalIndex + 1,
    };
    setHotspots((prev) => [...prev, cloned]);
    await saveHotspot(cloned, hotspots.length);
    setActiveId(cloned.id);
  };

  const handleHotspotImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `hotspot-${id}-${Date.now()}.${file.name.split(".").pop()}`;
    await supabase.storage.from("images").upload(fileName, file);
    const { data } = supabase.storage.from("images").getPublicUrl(fileName);
    const updated = hotspots.map((h) => (h.id === id ? { ...h, image: data.publicUrl } : h));
    setHotspots(updated);
    const h = updated.find((h) => h.id === id);
    if (h) await saveHotspot(h, updated.indexOf(h));
  };

  const activeHotspot = hotspots.find((h) => h.id === activeId);

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/60 backdrop-blur-sm">
        <button onClick={onUploadFloorPlan} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97]">
          <Upload className="w-3.5 h-3.5" /> Upload Plan
        </button>
        <button onClick={() => setIsAdding(!isAdding)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all active:scale-[0.97] ${isAdding ? "bg-garden-terracotta text-accent-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
          <Plus className="w-3.5 h-3.5" /> {isAdding ? "Click on plan…" : "Add Hotspot"}
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-garden-cream">
        <div ref={containerRef} className={`relative w-full h-full ${isAdding ? "cursor-crosshair" : "cursor-default"}`} onClick={handleContainerClick}>
          {floorPlanSrc ? (
            <img src={floorPlanSrc} alt="Floor plan" className="w-full h-full object-contain" draggable={false} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
                <Upload className="w-8 h-8 text-garden-sage" />
              </div>
              <div className="text-center">
                <p className="font-display text-lg text-foreground">Upload your floor plan</p>
                <p className="text-sm mt-1">Click "Upload Plan" to get started</p>
              </div>
            </div>
          )}

          {hotspots.map((h, index) => (
            <button key={h.id} className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 z-10 flex items-center justify-center ${activeId === h.id ? "bg-garden-terracotta border-garden-terracotta scale-125 shadow-lg" : "bg-garden-moss border-garden-leaf hotspot-pulse hover:scale-110"} ${draggingId === h.id ? "scale-150 shadow-xl cursor-grabbing" : "cursor-grab"}`}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              onClick={(e) => { e.stopPropagation(); setActiveId(activeId === h.id ? null : h.id); }}
              onMouseDown={(e) => handleMouseDown(e, h.id)}
            >
              <span className="text-[10px] font-bold text-primary-foreground leading-none select-none">{h.displayNumber ?? index + 1}</span>
            </button>
          ))}
        </div>

        {activeHotspot && (
          <div className="absolute z-20 w-72 bg-card rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ left: `${Math.min(activeHotspot.x, 65)}%`, top: `${Math.min(activeHotspot.y + 4, 60)}%` }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeHotspot.image && <img src={activeHotspot.image} alt={activeHotspot.title} className="w-full h-36 object-cover" />}
            <div className="p-3">
              {editingId === activeHotspot.id ? (
                <div className="space-y-2">
                  <input className="w-full px-2 py-1 text-sm border border-border rounded-md bg-background" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
                  <textarea className="w-full px-2 py-1 text-sm border border-border rounded-md bg-background resize-none" rows={2} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                  <div className="flex gap-1">
                    <button onClick={() => saveEdit(activeHotspot.id)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 active:scale-95"><Check className="w-3 h-3" /> Save</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-base text-foreground">{activeHotspot.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{activeHotspot.description}</p>
                  <div className="flex gap-1 mt-3">
                    <button onClick={() => startEditing(activeHotspot)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95"><Edit2 className="w-3 h-3" /> Edit</button>
                    <label className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 cursor-pointer">
                      <Upload className="w-3 h-3" /> Image
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleHotspotImageUpload(activeHotspot.id, e)} />
                    </label>
                    <button onClick={() => cloneHotspot(activeHotspot, hotspots.indexOf(activeHotspot))} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95"><Copy className="w-3 h-3" /> Clone</button>
                    <button onClick={() => deleteHotspot(activeHotspot.id)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 ml-auto"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
