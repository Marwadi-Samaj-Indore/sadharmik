import {
  Shirt,
  Hammer,
  Building2,
  Gem,
  Calculator,
  TrendingUp,
  ShieldCheck,
  Landmark,
  Pill,
  Stethoscope,
  Scale,
  GraduationCap,
  Laptop,
  UtensilsCrossed,
  Wheat,
  Warehouse,
  Truck,
  Wrench,
  Plug,
  Smartphone,
  Car,
  FlaskConical,
  Printer,
  Cog,
  Sofa,
  PaintRoller,
  Plane,
  PartyPopper,
  Recycle,
  Landmark as GovBuilding,
  Briefcase,
  Armchair,
  BookOpen,
  Home,
  Ellipsis,
  Scissors,
} from "lucide-react";

/**
 * One icon per business category.
 *
 * A grid of 35 identical text tiles is hard to scan; a distinct glyph lets a
 * member find "Jewellery" or "Transport" by shape before they read the label.
 * All from one family at a single stroke weight, so the grid stays coherent
 * rather than looking like assorted clip art.
 */
const ICONS: Record<string, typeof Shirt> = {
  "Textiles & Cloth": Scissors,
  "Readymade Garments": Shirt,
  "Real Estate & Construction": Building2,
  "Jewellery — Gold / Silver / Diamond": Gem,
  "CA / Accounting / Audit / Taxation": Calculator,
  "Share Market, Investment & Wealth": TrendingUp,
  "Insurance & Loans": ShieldCheck,
  "Banking & Finance": Landmark,
  "Pharma & Medical Distribution": Pill,
  "Doctor / Dentist / Healthcare": Stethoscope,
  "Lawyer / Legal / Notary": Scale,
  "Education, Coaching & Training": GraduationCap,
  "IT, Software & Digital Marketing": Laptop,
  "Food, Namkeen, Sweets & Restaurant": UtensilsCrossed,
  "Soya, Oil & Agro Processing": Wheat,
  "Mandi, Commodity & Grain Trading": Warehouse,
  "Transport & Logistics": Truck,
  "Hardware, Sanitary & Plywood": Hammer,
  "Electricals & Electronics Retail": Plug,
  "Mobile, Computer & Gadgets": Smartphone,
  "Automobile — Dealership / Service / Parts": Car,
  "Chemicals, Plastics & Packaging": FlaskConical,
  "Printing, Paper & Stationery": Printer,
  "Machinery & Industrial Supplies": Cog,
  "Furniture, Interior & Architecture": Sofa,
  "Paints & Building Materials": PaintRoller,
  "Travel, Tourism & Hospitality": Plane,
  "Event Management & Catering": PartyPopper,
  "Scrap & Metal Trading": Recycle,
  "Government / Public Service": GovBuilding,
  "Private Job / Salaried": Briefcase,
  Retired: Armchair,
  Student: BookOpen,
  Homemaker: Home,
  Other: Ellipsis,
};

export function CategoryIcon({
  category,
  size = 18,
  className = "",
}: {
  category: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[category] ?? Wrench;
  return <Icon size={size} strokeWidth={1.9} className={className} aria-hidden="true" />;
}
