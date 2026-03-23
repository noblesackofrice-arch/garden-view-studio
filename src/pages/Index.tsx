import { useState, useRef, useEffect } from "react";
import FloorPlanViewer from "@/components/FloorPlanViewer";
import DetailSidebar from "@/components/DetailSidebar";
import { Leaf } from "lucide-react";
import { supabase } from "@/lib/supabase";

const Index = () => {
  const [floorPlanSrc, setFloorPlanSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the most recently saved image from Supabase on page load
 useEffect(() => {
  const loadSavedImage = async () => {
    const { data, error } = await supabase
      .from("floor_plans")
      .select("url")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(); // use maybeSingle instead of single — returns null if no rows

    if (data?.url) {
      setFloorPlanSrc(data.url);
    }
  };
  loadSavedImage();
}, []);

  const handleUpload = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `floorplan-${Date.now()}.${file.name.split(".").pop()}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("images")
      .getPublicUrl(fileName);

    // Save URL to Supabase database so it works across all devices
    const { error: dbError } = await supabase
      .from("floor_plans")
      .insert({ url: data.publicUrl });

    if (dbError) {
      console.error("Failed to save URL:", dbError.message);
      return;
    }

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
