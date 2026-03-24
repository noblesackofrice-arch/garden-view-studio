import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, Edit2, Check, Upload, Copy } from "lucide-react";
import type { Hotspot } from "@/types/floorplan";
import { supabase } from "@/lib/supabase";

interface Props {
  floorPlanSrc: string | null;
}

export default function FloorPlanViewer({ floorPlanSrc, onUploadFloorPlan }: Props) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [imgBounds, setImgBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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

  // Update image bounds on resize
  useEffect(() => {
    const updateBounds = () => {
      const img = imgRef.current;
      const container = containerRef.current?.getBoundingClientRect();
      if (!img || !container) return;
      const imgRect = img.getBoundingClientRect();
      setImgBounds({
        left: imgRect.left - container.left,
        top: imgRect.top - container.top,
        width: imgRect.width,
        height: imgRect.height,
      });
    };
    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [floorPlanSrc]);

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
    if (!imgBounds.width || !imgBounds.height) return { x: 0, y: 0 };
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left - imgBounds.left) / imgBounds.width) * 100,
      y: ((e.clientY - rect.top - imgBounds.top) / imgBounds.height) * 100,
    };
  }, [imgBounds]);

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
      const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left - imgBounds.left) / imgBounds.width) * 100));
      const y = Math.max(0, Math.min(100, ((ev.clientY - rect.top - imgBounds.top) / imgBounds.height) * 100));
      setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, x, y } : h)));
    };

    const onUp = async () => {
      setDraggingId(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
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
   

      <div className="flex-1 relative overflow-hidden bg-garden-cream">      
        <div
          ref={containerRef}
         className={`relative w-full h-full ${isAdding ? "cursor-crosshair" : "cursor-default"}`}
          </div>
  );
}
