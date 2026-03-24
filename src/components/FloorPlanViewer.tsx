import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import type { Hotspot } from "@/types/floorplan";
import { supabase } from "@/lib/supabase";

interface Props {
  floorPlanSrc: string | null;
}

export default function FloorPlanViewer({ floorPlanSrc }: Props) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [imgBounds, setImgBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
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

  const deleteHotspot = async (id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    setActiveId(null);
    await supabase.from("hotspots").delete().eq("id", id);
  };

  const activeHotspot = hotspots.find((h) => h.id === activeId);

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="flex-1 relative overflow-hidden bg-garden-cream">
        <div
          ref={containerRef}
          className="relative w-full h-full cursor-default flex items-center justify-center"
        >
          {floorPlanSrc ? (
            <img
              ref={imgRef}
              src={floorPlanSrc}
              alt="Floor plan"
              className="object-contain"
              style={{ width: "800px", height: "600px" }}
              draggable={false}
              onLoad={() => {
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
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <div className="text-center">
                <p className="font-display text-lg text-foreground">No floor plan uploaded</p>
                <p className="text-sm mt-1">Contact the administrator to upload a plan</p>
              </div>
            </div>
          )}

          {hotspots.map((h, index) => (
            <button
              key={h.id}
              className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 z-10 flex items-center justify-center
                ${activeId === h.id ? "bg-garden-terracotta border-garden-terracotta scale-125 shadow-lg" : "bg-garden-moss border-garden-leaf hotspot-pulse hover:scale-110"}
                ${draggingId === h.id ? "scale-150 shadow-xl cursor-grabbing" : "cursor-grab"}`}
              style={{
                left: `${imgBounds.left + (h.x / 100) * imgBounds.width}px`,
                top: `${imgBounds.top + (h.y / 100) * imgBounds.height}px`,
              }}
              onClick={(e) => { e.stopPropagation(); setActiveId(activeId === h.id ? null : h.id); }}
              onMouseDown={(e) => handleMouseDown(e, h.id)}
            >
              <span className="text-[10px] font-bold text-primary-foreground leading-none select-none">
                {h.displayNumber ?? index + 1}
              </span>
            </button>
          ))}
        </div>

        {activeHotspot && (
          <div
            className="absolute z-20 w-72 bg-card rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{
              left: `${imgBounds.left + (Math.min(activeHotspot.x, 65) / 100) * imgBounds.width}px`,
              top: `${imgBounds.top + (Math.min(activeHotspot.y + 4, 60) / 100) * imgBounds.height}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeHotspot.image && (
              <img src={activeHotspot.image} alt={activeHotspot.title} className="w-full h-36 object-cover" />
            )}
            <div className="p-3">
              <h3 className="font-display text-base text-foreground">{activeHotspot.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{activeHotspot.description}</p>
              <div className="flex gap-1 mt-3">
                <button
                  onClick={() => deleteHotspot(activeHotspot.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
