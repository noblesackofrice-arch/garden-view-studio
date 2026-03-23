export interface Hotspot {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  image: string | null;
}

export interface SidebarSection {
  id: string;
  title: string;
  content: string;
  images: string[];
}
