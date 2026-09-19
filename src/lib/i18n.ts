export type Locale = "en" | "ar";

const LOCALE_KEY = "rawabi_admin_locale";

const dict = {
  en: {
    dashboard: "Dashboard",
    searchPlaceholder: "Search products, orders, customers…",
    notifications: "Notifications",
    viewAllNotifications: "View all notifications",
    branch: "Branch",
    language: "Language",
    profile: "Profile",
    logout: "Logout",
    shortcuts: "Shortcuts",
    doc: "Doc",
    accountMenu: "Account menu",
    allBranches: "All branches",
    adminPortal: "Admin Portal",
    storePortal: "Store Portal",
    welcomeBack: "Sign in to continue",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@company.com",
    passwordPlaceholder: "Enter your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    signIn: "Sign in",
    loginSubtitle: "We’ll open the right portal for your account.",
    emailRequired: "Email is required.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Password is required.",
    loginVisualTitle: "Your store, fully connected.",
    loginVisualSubtitle: "Orders, inventory, customers, and branches — managed in one place.",
    admin: "Admin",
    store: "Store",
    sales: "Sales",
    orders: "Orders",
    customers: "Customers",
    products: "Products",
    lowStock: "Low stock",
    pendingOrders: "Pending orders",
    recentOrders: "Recent orders",
    topProducts: "Top products",
    showAll: "View all",
    noData: "No records",
    actions: "Actions",
    export: "Export",
    filters: "Filters",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    activate: "Activate",
    deactivate: "Deactivate",
    submit: "Submit",
    close: "Close",
    loading: "Loading…",
  },
  ar: {
    dashboard: "لوحة التحكم",
    searchPlaceholder: "ابحث في المنتجات والطلبات والعملاء…",
    notifications: "الإشعارات",
    viewAllNotifications: "عرض كل الإشعارات",
    branch: "الفرع",
    language: "اللغة",
    profile: "الحساب",
    logout: "تسجيل الخروج",
    shortcuts: "الاختصارات",
    doc: "التوثيق",
    accountMenu: "قائمة الحساب",
    allBranches: "كل الفروع",
    adminPortal: "لوحة الإدارة",
    storePortal: "بوابة المتجر",
    welcomeBack: "سجّل الدخول للمتابعة",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    emailPlaceholder: "you@company.com",
    passwordPlaceholder: "أدخل كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    signIn: "دخول",
    loginSubtitle: "نفتح البوابة المناسبة لحسابك تلقائياً.",
    emailRequired: "البريد الإلكتروني مطلوب.",
    emailInvalid: "أدخل بريداً إلكترونياً صالحاً.",
    passwordRequired: "كلمة المرور مطلوبة.",
    loginVisualTitle: "متجرك، متصل بالكامل.",
    loginVisualSubtitle: "الطلبات والمخزون والعملاء والفروع — من مكان واحد.",
    admin: "إدارة",
    store: "متجر",
    sales: "المبيعات",
    orders: "الطلبات",
    customers: "العملاء",
    products: "المنتجات",
    lowStock: "مخزون منخفض",
    pendingOrders: "طلبات معلّقة",
    recentOrders: "أحدث الطلبات",
    topProducts: "أفضل المنتجات",
    showAll: "عرض الكل",
    noData: "لا توجد بيانات",
    actions: "إجراءات",
    export: "تصدير",
    filters: "تصفية",
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    activate: "تفعيل",
    deactivate: "إيقاف",
    submit: "حفظ",
    close: "إغلاق",
    loading: "جاري التحميل…",
  },
} as const;

export type DictKey = keyof typeof dict.en;

export function getStoredLocale(): Locale {
  const v = localStorage.getItem(LOCALE_KEY);
  return v === "ar" ? "ar" : "en";
}

export function setStoredLocale(locale: Locale) {
  localStorage.setItem(LOCALE_KEY, locale);
  applyDocumentLocale(locale);
}

export function applyDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("rtl", locale === "ar");
}

export function t(locale: Locale, key: DictKey): string {
  return dict[locale][key] ?? dict.en[key];
}
