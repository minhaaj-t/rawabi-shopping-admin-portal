import {
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  FilePen,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Megaphone,
  MessageCircle,
  Package,
  Palette,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "./icons";

/**
 * Top-level sidebar icons — each label maps to a distinct Iconly glyph.
 * Exact matches run first so fuzzy fallbacks cannot collide (e.g. Reports vs Analyst).
 */
const TOP_LEVEL_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  "help center": MessageCircle,
  products: Package,
  orders: ShoppingCart,
  inventory: Boxes,
  warehouse: Warehouse,
  branches: Building2,
  customers: Users,
  "delivery & pickup": Truck,
  marketing: Megaphone,
  "data analyst": LineChart,
  promotions: Tag,
  "payments & finance": Wallet,
  reports: BarChart3,
  "users & roles": UsersRound,
  jobs: Briefcase,
  content: FilePen,
  controllers: Palette,
  "ui ux designs": Palette,
  "tech support": LifeBuoy,
  settings: Settings,
};

export function navIconFor(label: string): LucideIcon {
  const k = label.toLowerCase().trim();
  if (TOP_LEVEL_ICONS[k]) return TOP_LEVEL_ICONS[k];

  // Nested / legacy fuzzy matches (keep distinct from top-level set where possible)
  if (k.includes("data analyst") || k.includes("analyst") || k.includes("analytics")) return LineChart;
  if (k.includes("marketing") || k.includes("ads") || k.includes("campaign")) return Megaphone;
  if (k.includes("dashboard")) return LayoutDashboard;
  if (k.includes("product")) return Package;
  if (k.includes("categor") || k.includes("warehouse")) return Warehouse;
  if (k.includes("help center") || k.includes("support chat") || k.includes("chat")) return MessageCircle;
  if (k.includes("tech support") || k.includes("technical support")) return LifeBuoy;
  if (k.includes("ui ux") || k.includes("design") || k.includes("controller")) return Palette;
  if (k.includes("email template") || k.includes("content") || k.includes("news")) return FilePen;
  if (k.includes("order") || k.includes("cart")) return ShoppingCart;
  if (k.includes("inventor") || k.includes("import") || k.includes("floor") || k.includes("stock"))
    return Boxes;
  if (k.includes("branch") || k.includes("store") || k.includes("franchise") || k.includes("slot"))
    return Building2;
  if (k.includes("customer")) return Users;
  if (k.includes("user") || k.includes("role") || k.includes("vendor") || k.includes("staff"))
    return UsersRound;
  if (k.includes("pickup") || k.includes("picker") || k.includes("deliver")) return Truck;
  if (k.includes("job") || k.includes("career") || k.includes("hr")) return Briefcase;
  if (k.includes("promo") || k.includes("coupon") || k.includes("banner") || k.includes("flyer"))
    return Tag;
  if (k.includes("notif") || k.includes("contact")) return FileText;
  if (k.includes("finance") || k.includes("payment")) return Wallet;
  if (k.includes("report")) return BarChart3;
  if (
    k.includes("setting") ||
    k.includes("language") ||
    k.includes("parameter") ||
    k.includes("country") ||
    k.includes("area")
  )
    return Settings;

  return FileText;
}
