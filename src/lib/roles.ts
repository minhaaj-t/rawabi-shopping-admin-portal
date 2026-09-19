export type AdminRole = {
  level: number;
  key: string;
  label: string;
  description: string;
  portal: boolean;
  permissions: string[];
};

/** Static mirror of BACKEND/config/admin_roles.php for UI labels. */
export const ROLE_CATALOG: Record<number, AdminRole> = {
  1: {
    level: 1,
    key: "super",
    label: "Super Admin",
    description: "Full platform access, user management, and technical support tools.",
    portal: true,
    permissions: ["*"],
  },
  2: {
    level: 2,
    key: "subadmin",
    label: "Sub Admin",
    description: "Day-to-day ecommerce operations.",
    portal: true,
    permissions: ["dashboard", "catalog", "orders", "customers", "reports", "promotions", "staff.manage", "support"],
  },
  3: {
    level: 3,
    key: "driver",
    label: "Driver",
    description: "Delivery driver — mobile ops app.",
    portal: false,
    permissions: ["mobile.deliver"],
  },
  5: {
    level: 5,
    key: "picker",
    label: "Picker",
    description: "In-store picker — mobile ops app.",
    portal: false,
    permissions: ["mobile.pick"],
  },
  6: {
    level: 6,
    key: "hr",
    label: "HR",
    description: "Careers and HR content.",
    portal: true,
    permissions: ["dashboard", "careers", "content"],
  },
  7: {
    level: 7,
    key: "care",
    label: "Customer Care",
    description: "Orders, customers, and notifications.",
    portal: true,
    permissions: ["dashboard", "orders", "customers", "notifications", "products.read", "support"],
  },
  8: {
    level: 8,
    key: "mediator",
    label: "Mediator",
    description: "Content and news management.",
    portal: true,
    permissions: ["dashboard", "content", "news"],
  },
  9: {
    level: 9,
    key: "shop_mgr",
    label: "Shop Manager",
    description: "Store-scoped manager.",
    portal: false,
    permissions: ["mobile.pick", "mobile.deliver", "store.portal"],
  },
  10: {
    level: 10,
    key: "floor_mgr",
    label: "Floor Manager",
    description: "Floor stock and picking.",
    portal: false,
    permissions: ["mobile.pick", "floor.requests"],
  },
  11: {
    level: 11,
    key: "analyst",
    label: "Data Analyst",
    description: "Customer insights, market research, and reports.",
    portal: true,
    permissions: ["dashboard", "reports", "customers", "notifications", "analyst"],
  },
  12: {
    level: 12,
    key: "shop_admin",
    label: "Shop Admin",
    description: "Store-scoped admin for a single shop — catalog, orders, and inventory.",
    portal: true,
    permissions: ["dashboard", "catalog", "orders", "inventory", "products.read", "settings"],
  },
};

export const PORTAL_ROLE_LEVELS = Object.values(ROLE_CATALOG)
  .filter((r) => r.portal)
  .map((r) => r.level);

export const FIELD_ROLE_LEVELS = Object.values(ROLE_CATALOG)
  .filter((r) => !r.portal)
  .map((r) => r.level);

export function roleLabel(level: number): string {
  return ROLE_CATALOG[level]?.label ?? `Level ${level}`;
}

export function assignableRoleLevels(superAdmin: boolean): number[] {
  const all = Object.keys(ROLE_CATALOG).map(Number);
  return superAdmin ? all : all.filter((l) => l !== 1);
}

export function needsStore(level: number): boolean {
  return [3, 5, 9, 10, 12].includes(level);
}

export function needsFloor(level: number): boolean {
  return level === 10;
}
