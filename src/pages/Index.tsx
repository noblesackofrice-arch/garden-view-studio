import { useState, useEffect } from "react";
import FloorPlanViewer from "@/components/FloorPlanViewer";
import DetailSidebar from "@/components/DetailSidebar";
import { Leaf } from "lucide-react";
import { supabase } from "@/lib/supabase";

const Index = () => {
  const [floorPlanSrc, setFloorPlanSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadSavedImage = async () => {
      const { data } = await supabase
        .from("floor_plans")
        .select("url")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.url) {
        setFloorPlanSrc(data.url);
      }
    };
    loadSavedImage();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Leaf className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-xl leading-tight text-foreground">Garden Plan</h1>
        </div>
      </header>
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <FloorPlanViewer floorPlanSrc={floorPlanSrc} />
        <DetailSidebar />
      </div>
    </div>
  );
};

export default Index;
