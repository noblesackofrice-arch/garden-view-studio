import { useState, useRef, useEffect } from "react";
import FloorPlanViewer from "@/components/FloorPlanViewer";
import DetailSidebar from "@/components/DetailSidebar";
import { Leaf } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Index = () => {
  const [floorPlanSrc, setFloorPlanSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved image URL on page load
  useEffect(() => {
    const savedUrl = localStorage.getItem("floorPlanUrl");
    if (savedUrl) setFloorPlanSrc(savedUrl);
  }, []);

  const handleUpload = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `floorplan-${Date.now()}.${file.name.split(".").pop()}`;

    const { error } = await supabase.storage
      .from("images")
      .upload(fileName, file);

    if (error) {
      console.error("Upload failed:", error.message);
      return;
    }

    const { data } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    // Save URL to localStorage so it persists on refresh
    localStorage.setItem("floorPlanUrl", data.publicUrl);
    setFloorPlanSrc(data.publicUrl);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Leaf className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-xl leading-tight text-foreground">Garden Plan</h1>
          <p className="text-xs text-muted-foreground">Interactive floor plan explorer</p>
        </div>
      </header>
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <FloorPlanViewer floorPlanSrc={floorPlanSrc} onUploadFloorPlan={handleUpload} />
        <DetailSidebar />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
};

export default Index;
