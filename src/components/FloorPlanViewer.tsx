import { useState, useRef, useCallback } from "react";
import { Plus, Move, Trash2, Edit2, X, Check, Upload } from "lucide-react";
import type { Hotspot } from "@/types/floorplan";
import hotspotLiving from "@/assets/hotspot-living.jpg";
import hotspotKitchen from "@/assets/hotspot-kitchen.jpg";
import hotspotGarden from "@/assets/hotspot-garden.jpg";
import hotspotStudy from "@/assets/hotspot-study.jpg";

const DEFAULT_HOTSPOTS: Hotspot[] = [
  {
    id: "1",
    x: 30,
    y: 35,
    title: "Living Room",
    description: "Open-plan living with exposed timber beams, natural light, and views to the garden.",
    image: hotspotLiving,
  },
  {
    id: "2",
    x: 65,
    y: 30,
    title: "Kitchen",
    description: "Warm wood cabinetry with marble surfaces and an herb garden at the window.",
    image: hotspotKitchen,
  },
  {
    id: "3",
    x: 50,
    y: 70,
    title: "Garden Patio",
    description: "Stone pathways weaving through climbing vines and lantern-lit seating.",
    image: hotspotGarden,
  },
  {
    id: "4",
    x: 20,
    y: 65,
    title: "Study",
    description: "A quiet workspace bathed in natural light with built-in bookshelves.",
    image: hotspotStudy,
  },
];

interface Props {
  floorPlanSrc: string | null;
  onUploadFloorPlan: () => void;
}

export default function FloorPlanViewer({ floorPlanSrc, onUploadFloorPlan }: Props) {
  const [hotspots, setHotspots] = useState<Hotspot[]>(DEFAULT_HOTSPOTS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [isAdding, setIsAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getRelativePos = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!isAdding) {
      setActiveId(null);
      return;
    }
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

    const onUp = () => {
      setDraggingId(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startEditing = (h: Hotspot) => {
    setEditingId(h.id);
    setEditForm({ title: h.title, description: h.description });
  };

  const saveEdit = (id: string) => {
    setHotspots((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...editForm } : h))
    );
    setEditingId(null);
  };

  const deleteHotspot = (id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    setActiveId(null);
  };

  const handleHotspotImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, image: url } : h)));
  };

  const activeHotspot = hotspots.find((h) => h.id === activeId);

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/60 backdrop-blur-sm">
        <button
          onClick={onUploadFloorPlan}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97]"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Plan
        </button>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all active:scale-[0.97] ${
            isAdding
              ? "bg-garden-terracotta text-accent-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? "Click on plan…" : "Add Hotspot"}
        </button>
      </div>

      {/* Floor plan area */}
      <div className="flex-1 relative overflow-hidden bg-garden-cream">
        <div
          ref={containerRef}
          className={`relative w-full h-full ${isAdding ? "cursor-crosshair" : "cursor-default"}`}
          onClick={handleContainerClick}
        >
          {floorPlanSrc ? (
            <img
              src={floorPlanSrc}
              alt="Floor plan"
              className="w-full h-full object-contain"
              draggable={false}
            />
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

          {/* Hotspot markers */}
          {hotspots.map((h) => (
            <button
              key={h.id}
              className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 z-10
                ${activeId === h.id
                  ? "bg-garden-terracotta border-garden-terracotta scale-125 shadow-lg"
                  : "bg-garden-moss border-garden-leaf hotspot-pulse hover:scale-110"
                }
                ${draggingId === h.id ? "scale-150 shadow-xl cursor-grabbing" : "cursor-grab"}
              `}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveId(activeId === h.id ? null : h.id);
              }}
              onMouseDown={(e) => handleMouseDown(e, h.id)}
            >
              <span className="sr-only">{h.title}</span>
            </button>
          ))}
        </div>

        {/* Active hotspot popover */}
        {activeHotspot && (
          <div
            className="absolute z-20 w-72 bg-card rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{
              left: `${Math.min(activeHotspot.x, 65)}%`,
              top: `${Math.min(activeHotspot.y + 4, 60)}%`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeHotspot.image && (
              <img
                src={activeHotspot.image}
                alt={activeHotspot.title}
                className="w-full h-36 object-cover"
              />
            )}
            <div className="p-3">
              {editingId === activeHotspot.id ? (
                <div className="space-y-2">
                  <input
                    className="w-full px-2 py-1 text-sm border border-border rounded-md bg-background"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <textarea
                    className="w-full px-2 py-1 text-sm border border-border rounded-md bg-background resize-none"
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveEdit(activeHotspot.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-base text-foreground">{activeHotspot.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {activeHotspot.description}
                  </p>
                  <div className="flex gap-1 mt-3">
                    <button
                      onClick={() => startEditing(activeHotspot)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <label className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 cursor-pointer">
                      <Upload className="w-3 h-3" /> Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleHotspotImageUpload(activeHotspot.id, e)}
                      />
                    </label>
                    <button
                      onClick={() => deleteHotspot(activeHotspot.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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
