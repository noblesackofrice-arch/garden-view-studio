import { useState, useEffect } from "react";
import { ChevronDown, Plus, Upload, Edit2, Check, Trash2, Leaf } from "lucide-react";
import type { SidebarSection } from "@/types/floorplan";
import { supabase } from "@/lib/supabase";

export default function DetailSidebar() {
  const [sections, setSections] = useState<SidebarSection[]>([]);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });

  // Load sections from Supabase on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("sections").select("*");
      if (data && data.length > 0) {
        setSections(data.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          images: s.images ?? [],
        })));
      }
    };
    load();
  }, []);

  const saveSection = async (s: SidebarSection) => {
    await supabase.from("sections").upsert({
      id: s.id,
      title: s.title,
      content: s.content,
      images: s.images,
    });
  };

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addSection = async () => {
    const s: SidebarSection = {
      id: Date.now().toString(),
      title: "New Section",
      content: "Add your description here.",
      images: [],
    };
    setSections((prev) => [...prev, s]);
    await saveSection(s);
    setOpenIds((prev) => new Set(prev).add(s.id));
    startEdit(s);
  };

  const startEdit = (s: SidebarSection) => {
    setEditingId(s.id);
    setEditForm({ title: s.title, content: s.content });
  };

  const saveEdit = async (id: string) => {
    const updated = sections.map((s) => (s.id === id ? { ...s, ...editForm } : s));
    setSections(updated);
    setEditingId(null);
    const s = updated.find((s) => s.id === id);
    if (s) await saveSection(s);
  };

  const deleteSection = async (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("sections").delete().eq("id", id);
  };

  const addImage = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `section-${id}-${Date.now()}.${file.name.split(".").pop()}`;
    await supabase.storage.from("images").upload(fileName, file);
    const { data } = supabase.storage.from("images").getPublicUrl(fileName);
    const updated = sections.map((s) =>
      s.id === id ? { ...s, images: [...s.images, data.publicUrl] } : s
    );
    setSections(updated);
    const s = updated.find((s) => s.id === id);
    if (s) await saveSection(s);
  };

  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-garden-leaf" />
          <h2 className="font-display text-lg text-foreground">Project Details</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Explore each area in depth</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => {
          const isOpen = openIds.has(section.id);
          const isEditing = editingId === section.id;
          return (
            <div key={section.id} className="border-b border-border last:border-b-0">
              <button onClick={() => toggle(section.id)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors active:scale-[0.99]">
                <span className="font-medium text-sm text-foreground">{section.title}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  {section.images.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                      {section.images.map((img, i) => (
                        <img key={i} src={img} alt={`${section.title} ${i + 1}`} className="w-full rounded-lg object-cover shadow-sm" />
                      ))}
                    </div>
                  )}
                  {isEditing ? (
                    <div className="space-y-2">
                      <input className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} placeholder="Section title" />
                      <textarea className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background resize-none" rows={4} value={editForm.content} onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))} placeholder="Description" />
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(section.id)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 active:scale-95"><Check className="w-3 h-3" /> Save</button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground active:scale-95">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                      <div className="flex gap-1 mt-3">
                        <button onClick={() => startEdit(section)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95"><Edit2 className="w-3 h-3" /> Edit</button>
                        <label className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 cursor-pointer">
                          <Upload className="w-3 h-3" /> Add Image
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => addImage(section.id, e)} />
                        </label>
                        <button onClick={() => deleteSection(section.id)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 ml-auto"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-border">
        <button onClick={addSection} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97]">
          <Plus className="w-3.5 h-3.5" /> Add Section
        </button>
      </div>
    </aside>
  );
}
