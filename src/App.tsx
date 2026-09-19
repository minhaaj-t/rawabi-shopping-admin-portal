import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { isLoggedIn } from "./lib/auth";
import { LoginPage } from "./pages/LoginPage";
import { LoadingCard } from "./components/LoadingIndicator";

const AdminLayout = lazy(() =>
  import("./layouts/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);

const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const DocsPage = lazy(() => import("./pages/DocsPage").then((m) => ({ default: m.DocsPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const DashboardLayoutsPage = lazy(() =>
  import("./pages/DashboardLayoutsPage").then((m) => ({ default: m.DashboardLayoutsPage })),
);
const DashboardBuilderPage = lazy(() =>
  import("./pages/DashboardBuilderPage").then((m) => ({ default: m.DashboardBuilderPage })),
);
const OrdersPage = lazy(() => import("./pages/OrdersPage").then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() =>
  import("./pages/OrderDetailPage").then((m) => ({ default: m.OrderDetailPage })),
);
const InvoicePreviewPage = lazy(() =>
  import("./pages/InvoicePreviewPage").then((m) => ({ default: m.InvoicePreviewPage })),
);
const ProductsPage = lazy(() => import("./pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const ProductFormPage = lazy(() =>
  import("./pages/ProductFormPage").then((m) => ({ default: m.ProductFormPage })),
);
const PreOrdersPage = lazy(() => import("./pages/PreOrdersPage").then((m) => ({ default: m.PreOrdersPage })));
const PreOrderDetailPage = lazy(() =>
  import("./pages/PreOrderDetailPage").then((m) => ({ default: m.PreOrderDetailPage })),
);
const CustomersPage = lazy(() => import("./pages/CustomersPage").then((m) => ({ default: m.CustomersPage })));
const CustomerDetailPage = lazy(() =>
  import("./pages/CustomerDetailPage").then((m) => ({ default: m.CustomerDetailPage })),
);
const RolesAccessPage = lazy(() =>
  import("./pages/AccessPages").then((m) => ({ default: m.RolesAccessPage })),
);
const StaffPage = lazy(() => import("./pages/AccessPages").then((m) => ({ default: m.StaffPage })));
const DeliveryBoysPage = lazy(() =>
  import("./pages/FieldOpsUsersPages").then((m) => ({ default: m.DeliveryBoysPage })),
);
const PickupUsersPage = lazy(() =>
  import("./pages/FieldOpsUsersPages").then((m) => ({ default: m.PickupUsersPage })),
);
const CartsPage = lazy(() => import("./pages/CartsPage").then((m) => ({ default: m.CartsPage })));
const CartDetailPage = lazy(() =>
  import("./pages/CartDetailPage").then((m) => ({ default: m.CartDetailPage })),
);
const WishlistPage = lazy(() => import("./pages/WishlistPage").then((m) => ({ default: m.WishlistPage })));
const WishlistDetailPage = lazy(() =>
  import("./pages/WishlistDetailPage").then((m) => ({ default: m.WishlistDetailPage })),
);
const UsergroupsPage = lazy(() =>
  import("./pages/UsergroupsPage").then((m) => ({ default: m.UsergroupsPage })),
);
const CategoriesPage = lazy(() =>
  import("./pages/CategoryManagementPage").then((m) => ({ default: m.CategoriesPage })),
);
const NotificationsPage = lazy(() =>
  import("./pages/ModulesPages").then((m) => ({ default: m.NotificationsPage })),
);
const ImportToStorePage = lazy(() =>
  import("./pages/ImportToStorePage").then((m) => ({ default: m.ImportToStorePage })),
);
const FloorRequestsPage = lazy(() =>
  import("./pages/FloorRequestsPage").then((m) => ({ default: m.FloorRequestsPage })),
);
const FloorRequestDetailPage = lazy(() =>
  import("./pages/FloorRequestDetailPage").then((m) => ({ default: m.FloorRequestDetailPage })),
);
const DraftProductsPage = lazy(() =>
  import("./pages/ExtraPages").then((m) => ({ default: m.DraftProductsPage })),
);
const OfferProductsPage = lazy(() =>
  import("./pages/ExtraPages").then((m) => ({ default: m.OfferProductsPage })),
);
const ContactsPage = lazy(() =>
  import("./pages/ContactsManagePage").then((m) => ({ default: m.ContactsPage })),
);
const AreasPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.AreasPage })));
const BannersPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.BannersPage })));
const BrandsPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.BrandsPage })));
const CountriesPage = lazy(() =>
  import("./pages/EntityModules").then((m) => ({ default: m.CountriesPage })),
);
const CouponsPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.CouponsPage })));
const DeliveryFeesPage = lazy(() =>
  import("./pages/EntityModules").then((m) => ({ default: m.DeliveryFeesPage })),
);
const FiltersPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.FiltersPage })));
const FlyersPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.FlyersPage })));
const LanguagesPage = lazy(() =>
  import("./pages/EntityModules").then((m) => ({ default: m.LanguagesPage })),
);
const NewsPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.NewsPage })));
const ParameterValuesPage = lazy(() =>
  import("./pages/EntityModules").then((m) => ({ default: m.ParameterValuesPage })),
);
const PromotionsPage = lazy(() =>
  import("./pages/EntityModules").then((m) => ({ default: m.PromotionsPage })),
);
const VariantsPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.VariantsPage })));
const VendorsPage = lazy(() => import("./pages/EntityModules").then((m) => ({ default: m.VendorsPage })));
const NewsEditorPage = lazy(() =>
  import("./pages/NewsEditorPage").then((m) => ({ default: m.NewsEditorPage })),
);
const AttributesPage = lazy(() =>
  import("./pages/AttributesPage").then((m) => ({ default: m.AttributesPage })),
);
const UnitsPage = lazy(() => import("./pages/UnitsPage").then((m) => ({ default: m.UnitsPage })));
const SlotsPage = lazy(() => import("./pages/SlotsPage").then((m) => ({ default: m.SlotsPage })));
const StoresManagePage = lazy(() =>
  import("./pages/StoresManagePage").then((m) => ({ default: m.StoresManagePage })),
);
const StoreDetailPage = lazy(() =>
  import("./pages/StoreDetailPage").then((m) => ({ default: m.StoreDetailPage })),
);
const SupportChatPage = lazy(() =>
  import("./pages/SupportChatPage").then((m) => ({ default: m.SupportChatPage })),
);
const CustomerFeedbacksPage = lazy(() =>
  import("./pages/CustomerVoicePages").then((m) => ({ default: m.CustomerFeedbacksPage })),
);
const CustomerVoiceReportsPage = lazy(() =>
  import("./pages/CustomerVoicePages").then((m) => ({ default: m.CustomerVoiceReportsPage })),
);
const SuggestionsPage = lazy(() =>
  import("./pages/CustomerVoicePages").then((m) => ({ default: m.SuggestionsPage })),
);
const TechSupportPage = lazy(() =>
  import("./pages/TechSupportPage").then((m) => ({ default: m.TechSupportPage })),
);
const UiUxDesignsPage = lazy(() =>
  import("./pages/UiUxDesignsPage").then((m) => ({ default: m.UiUxDesignsPage })),
);
const DeliveryReportPage = lazy(() =>
  import("./pages/ReportsPages").then((m) => ({ default: m.DeliveryReportPage })),
);
const NonOrderedReportPage = lazy(() =>
  import("./pages/ReportsPages").then((m) => ({ default: m.NonOrderedReportPage })),
);
const OrdersReportPage = lazy(() =>
  import("./pages/ReportsPages").then((m) => ({ default: m.OrdersReportPage })),
);
const ProductsReportPage = lazy(() =>
  import("./pages/ReportsPages").then((m) => ({ default: m.ProductsReportPage })),
);
const SalesReportPage = lazy(() =>
  import("./pages/ReportsPages").then((m) => ({ default: m.SalesReportPage })),
);
const StoreReviewsReportPage = lazy(() =>
  import("./pages/ReportsPages").then((m) => ({ default: m.StoreReviewsReportPage })),
);
const UpdatedProductsReportPage = lazy(() =>
  import("./pages/ReportsPages").then((m) => ({ default: m.UpdatedProductsReportPage })),
);
const UsersReportPage = lazy(() =>
  import("./pages/ReportsPages").then((m) => ({ default: m.UsersReportPage })),
);
const CheckoutSettingsPage = lazy(() =>
  import("./pages/SettingsPages").then((m) => ({ default: m.CheckoutSettingsPage })),
);
const NotificationsSettingsPage = lazy(() =>
  import("./pages/SettingsPages").then((m) => ({ default: m.NotificationsSettingsPage })),
);
const OrderSettingsPage = lazy(() =>
  import("./pages/SettingsPages").then((m) => ({ default: m.OrderSettingsPage })),
);
const ShopSettingsPage = lazy(() =>
  import("./pages/SettingsPages").then((m) => ({ default: m.ShopSettingsPage })),
);
const StorefrontSettingsPage = lazy(() =>
  import("./pages/SettingsPages").then((m) => ({ default: m.StorefrontSettingsPage })),
);
const AuthSecuritySettingsPage = lazy(() =>
  import("./pages/AuthSecuritySettingsPage").then((m) => ({ default: m.AuthSecuritySettingsPage })),
);
const IntegrationsSettingsPage = lazy(() =>
  import("./pages/IntegrationsSettingsPage").then((m) => ({ default: m.IntegrationsSettingsPage })),
);
const EmailTemplatesPage = lazy(() =>
  import("./pages/EmailTemplatesPage").then((m) => ({ default: m.EmailTemplatesPage })),
);
const SettingsToolsPage = lazy(() =>
  import("./pages/SettingsToolsPage").then((m) => ({ default: m.SettingsToolsPage })),
);
const UrlBaseSettingsPage = lazy(() =>
  import("./pages/UrlSettingsPages").then((m) => ({ default: m.UrlBaseSettingsPage })),
);
const UrlIdsSettingsPage = lazy(() =>
  import("./pages/UrlSettingsPages").then((m) => ({ default: m.UrlIdsSettingsPage })),
);
const UrlMediaSettingsPage = lazy(() =>
  import("./pages/UrlSettingsPages").then((m) => ({ default: m.UrlMediaSettingsPage })),
);
const UrlPagesSettingsPage = lazy(() =>
  import("./pages/UrlSettingsPages").then((m) => ({ default: m.UrlPagesSettingsPage })),
);
const MarketingHubPage = lazy(() =>
  import("./pages/MarketingPages").then((m) => ({ default: m.MarketingHubPage })),
);
const MarketingPluginsPage = lazy(() =>
  import("./pages/MarketingPages").then((m) => ({ default: m.MarketingPluginsPage })),
);
const MarketingAdsHub = lazy(() =>
  import("./pages/MarketingConnectPages").then((m) => ({ default: m.MarketingAdsHub })),
);
const MarketingAnalyticsHub = lazy(() =>
  import("./pages/MarketingConnectPages").then((m) => ({ default: m.MarketingAnalyticsHub })),
);
const MarketingMerchantPage = lazy(() =>
  import("./pages/MarketingConnectPages").then((m) => ({ default: m.MarketingMerchantPage })),
);
const MarketingSearchConsolePage = lazy(() =>
  import("./pages/MarketingConnectPages").then((m) => ({ default: m.MarketingSearchConsolePage })),
);
const MarketingToolPage = lazy(() =>
  import("./pages/MarketingConnectPages").then((m) => ({ default: m.MarketingToolPage })),
);
const MarketingAeoPage = lazy(() =>
  import("./pages/MarketingSeoPages").then((m) => ({ default: m.MarketingAeoPage })),
);
const MarketingConsentPage = lazy(() =>
  import("./pages/MarketingSeoPages").then((m) => ({ default: m.MarketingConsentPage })),
);
const MarketingConsentPermissionsPage = lazy(() =>
  import("./pages/MarketingSeoPages").then((m) => ({ default: m.MarketingConsentPermissionsPage })),
);
const MarketingIndexingPage = lazy(() =>
  import("./pages/MarketingSeoPages").then((m) => ({ default: m.MarketingIndexingPage })),
);
const MarketingSeoIdentityPage = lazy(() =>
  import("./pages/MarketingSeoPages").then((m) => ({ default: m.MarketingSeoIdentityPage })),
);
const MarketingSeoWorkspacePage = lazy(() =>
  import("./pages/MarketingSeoPages").then((m) => ({ default: m.MarketingSeoWorkspacePage })),
);
const AnalystAppStorePage = lazy(() =>
  import("./pages/AnalystPages").then((m) => ({ default: m.AnalystAppStorePage })),
);
const AnalystCustomersPage = lazy(() =>
  import("./pages/AnalystPages").then((m) => ({ default: m.AnalystCustomersPage })),
);
const AnalystHubPage = lazy(() =>
  import("./pages/AnalystPages").then((m) => ({ default: m.AnalystHubPage })),
);
const AnalystPlayStorePage = lazy(() =>
  import("./pages/AnalystPages").then((m) => ({ default: m.AnalystPlayStorePage })),
);
const AnalystProductMatchPage = lazy(() =>
  import("./pages/AnalystPages").then((m) => ({ default: m.AnalystProductMatchPage })),
);
const AnalystResearchPage = lazy(() =>
  import("./pages/AnalystPages").then((m) => ({ default: m.AnalystResearchPage })),
);
const AnalystSearchTrendsPage = lazy(() =>
  import("./pages/AnalystPages").then((m) => ({ default: m.AnalystSearchTrendsPage })),
);
const JobsHubPage = lazy(() => import("./pages/JobsPages").then((m) => ({ default: m.JobsHubPage })));
const JobOpeningsPage = lazy(() =>
  import("./pages/JobsPages").then((m) => ({ default: m.JobOpeningsPage })),
);
const JobApplicationsPage = lazy(() =>
  import("./pages/JobsPages").then((m) => ({ default: m.JobApplicationsPage })),
);
const FinanceCodPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceCodPage })),
);
const FinanceGatewayLogsPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceGatewayLogsPage })),
);
const FinanceHubPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceHubPage })),
);
const FinanceInvoicesPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceInvoicesPage })),
);
const FinanceMethodsPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceMethodsPage })),
);
const FinanceRefundsPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceRefundsPage })),
);
const FinanceRevenuePage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceRevenuePage })),
);
const FinanceSettlementsPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceSettlementsPage })),
);
const FinanceTaxPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceTaxPage })),
);
const FinanceTransactionsPage = lazy(() =>
  import("./pages/FinancePages").then((m) => ({ default: m.FinanceTransactionsPage })),
);
const InventoryAlertsPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.InventoryAlertsPage })),
);
const InventoryBatchesPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.InventoryBatchesPage })),
);
const InventoryDocumentsPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.InventoryDocumentsPage })),
);
const InventoryHistoryPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.InventoryHistoryPage })),
);
const InventoryHubPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.InventoryHubPage })),
);
const InventoryStockPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.InventoryStockPage })),
);
const InventoryValuationPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.InventoryValuationPage })),
);
const WarehouseHubPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.WarehouseHubPage })),
);
const WarehousesPage = lazy(() =>
  import("./pages/InventoryOpsPages").then((m) => ({ default: m.WarehousesPage })),
);
const BranchesHubPage = lazy(() =>
  import("./pages/StoreOpsPages").then((m) => ({ default: m.BranchesHubPage })),
);
const StoreHolidaysPage = lazy(() =>
  import("./pages/StoreOpsPages").then((m) => ({ default: m.StoreHolidaysPage })),
);

function Protected({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}

function SupportHomeRedirect() {
  const [params] = useSearchParams();
  const q = params.toString();
  return <Navigate to={`/support/chats${q ? `?${q}` : ""}`} replace />;
}

function LegacySupportRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/support/chats/${id}` : "/support/chats"} replace />;
}

function MarketingToolRoute({ section }: { section: "analytics" | "ads" }) {
  return <MarketingToolPage section={section} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/invoice/:invoiceNumber"
        element={
          <Protected>
            <Suspense fallback={<LoadingCard label="Loading invoice" />}>
              <InvoicePreviewPage />
            </Suspense>
          </Protected>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <Suspense fallback={<LoadingCard label="Loading workspace" />}>
              <AdminLayout />
            </Suspense>
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard/:id" element={<DashboardPage />} />
        <Route path="dashboards" element={<DashboardLayoutsPage />} />
        <Route path="dashboards/:id/edit" element={<DashboardBuilderPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="docs" element={<DocsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="pre-orders" element={<PreOrdersPage />} />
        <Route path="pre-orders/:id" element={<PreOrderDetailPage />} />
        <Route path="carts" element={<CartsPage />} />
        <Route path="carts/:userId" element={<CartDetailPage />} />
        <Route path="wishlists" element={<WishlistPage />} />
        <Route path="wishlists/:userId" element={<WishlistDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="support" element={<SupportHomeRedirect />} />
        <Route path="support/chats" element={<SupportChatPage />} />
        <Route path="support/chats/:id" element={<SupportChatPage />} />
        <Route path="support/inbox" element={<Navigate to="/support/chats" replace />} />
        <Route path="support/feedback" element={<CustomerVoiceReportsPage />} />
        <Route path="support/feedback/reviews" element={<CustomerFeedbacksPage />} />
        <Route path="support/feedback/suggestions" element={<SuggestionsPage />} />
        <Route path="support/tools" element={<Navigate to="/support/chats" replace />} />
        <Route path="tech-support" element={<TechSupportPage />} />
        <Route path="ui-ux-designs" element={<Navigate to="/ui-ux-designs/banners/mobile-banners" replace />} />
        <Route path="ui-ux-designs/:surface/:tool" element={<UiUxDesignsPage />} />
        <Route path="ui-ux-designs/:surface" element={<UiUxDesignsPage />} />
        <Route path="support/:id" element={<LegacySupportRedirect />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="delivery-boys" element={<DeliveryBoysPage />} />
        <Route path="pickup-users" element={<PickupUsersPage />} />
        <Route path="access" element={<Navigate to="/staff" replace />} />
        <Route path="access/roles" element={<RolesAccessPage />} />
        <Route path="access/support" element={<Navigate to="/tech-support" replace />} />
        <Route path="usergroups" element={<UsergroupsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/offers" element={<OfferProductsPage />} />
        <Route path="products/drafts" element={<DraftProductsPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
        <Route path="variants" element={<VariantsPage />} />
        <Route path="attributes" element={<AttributesPage />} />
        <Route path="units" element={<UnitsPage />} />
        <Route path="floor-requests" element={<FloorRequestsPage />} />
        <Route path="floor-requests/:id" element={<FloorRequestDetailPage />} />
        <Route path="import-to-store" element={<ImportToStorePage />} />
        <Route path="inventory" element={<InventoryHubPage />} />
        <Route path="inventory/stock" element={<InventoryStockPage />} />
        <Route path="inventory/documents" element={<InventoryDocumentsPage />} />
        <Route path="inventory/batches" element={<InventoryBatchesPage />} />
        <Route path="inventory/alerts" element={<InventoryAlertsPage />} />
        <Route path="inventory/history" element={<InventoryHistoryPage />} />
        <Route path="inventory/valuation" element={<InventoryValuationPage />} />
        <Route path="warehouse" element={<WarehouseHubPage />} />
        <Route path="warehouse/warehouses" element={<WarehousesPage />} />
        <Route path="branches" element={<BranchesHubPage />} />
        <Route path="branches/hours" element={<Navigate to="/stores" replace />} />
        <Route path="branches/holidays" element={<StoreHolidaysPage />} />
        <Route path="branches/zones" element={<Navigate to="/stores" replace />} />
        <Route path="branches/performance" element={<Navigate to="/stores" replace />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="brands" element={<BrandsPage />} />
        <Route path="reports/sales" element={<SalesReportPage />} />
        <Route path="reports/users" element={<UsersReportPage />} />
        <Route path="reports/products" element={<ProductsReportPage />} />
        <Route path="reports/orders" element={<OrdersReportPage />} />
        <Route path="reports/updated-products" element={<UpdatedProductsReportPage />} />
        <Route path="reports/store-reviews" element={<StoreReviewsReportPage />} />
        <Route path="reports/non-ordered" element={<NonOrderedReportPage />} />
        <Route path="reports/delivery" element={<DeliveryReportPage />} />
        <Route path="finance" element={<FinanceHubPage />} />
        <Route path="finance/methods" element={<FinanceMethodsPage />} />
        <Route path="finance/gateway-logs" element={<FinanceGatewayLogsPage />} />
        <Route path="finance/transactions" element={<FinanceTransactionsPage />} />
        <Route path="finance/cod" element={<FinanceCodPage />} />
        <Route path="finance/refunds" element={<FinanceRefundsPage />} />
        <Route path="finance/invoices" element={<FinanceInvoicesPage />} />
        <Route path="finance/tax" element={<FinanceTaxPage />} />
        <Route path="finance/revenue" element={<FinanceRevenuePage />} />
        <Route path="finance/settlements" element={<FinanceSettlementsPage />} />
        <Route path="promo" element={<Navigate to="/promotions" replace />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="flyers" element={<FlyersPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="delivery-fees" element={<DeliveryFeesPage />} />
        <Route path="filters" element={<FiltersPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="franchises" element={<Navigate to="/stores" replace />} />
        <Route path="stores" element={<StoresManagePage />} />
        <Route path="stores/:id" element={<StoreDetailPage />} />
        <Route path="slots" element={<SlotsPage />} />
        <Route path="settings" element={<Navigate to="/settings/shop" replace />} />
        <Route path="settings/shop" element={<ShopSettingsPage />} />
        <Route path="settings/urls" element={<UrlBaseSettingsPage />} />
        <Route path="settings/urls/pages" element={<UrlPagesSettingsPage />} />
        <Route path="settings/urls/media" element={<UrlMediaSettingsPage />} />
        <Route path="settings/urls/ids" element={<UrlIdsSettingsPage />} />
        <Route path="settings/checkout" element={<CheckoutSettingsPage />} />
        <Route path="settings/auth" element={<AuthSecuritySettingsPage />} />
        <Route path="settings/orders" element={<OrderSettingsPage />} />
        <Route path="settings/storefront" element={<StorefrontSettingsPage />} />
        <Route path="settings/notifications" element={<NotificationsSettingsPage />} />
        <Route path="settings/integrations" element={<IntegrationsSettingsPage />} />
        <Route path="settings/email-templates" element={<EmailTemplatesPage />} />
        <Route path="settings/tools" element={<SettingsToolsPage />} />
        <Route path="settings/languages" element={<LanguagesPage />} />
        <Route path="settings/parameters" element={<Navigate to="/attributes" replace />} />
        <Route path="settings/parameter-values" element={<ParameterValuesPage />} />
        <Route path="settings/countries" element={<CountriesPage />} />
        <Route path="settings/areas" element={<AreasPage />} />
        <Route path="languages" element={<Navigate to="/settings/languages" replace />} />
        <Route path="parameters" element={<Navigate to="/attributes" replace />} />
        <Route path="parameter-values" element={<Navigate to="/settings/parameter-values" replace />} />
        <Route path="jobs" element={<JobsHubPage />} />
        <Route path="jobs/openings" element={<JobOpeningsPage />} />
        <Route path="jobs/applications" element={<JobApplicationsPage />} />
        <Route path="careers/jobs" element={<Navigate to="/jobs/openings" replace />} />
        <Route path="careers/cvs" element={<Navigate to="/jobs/applications" replace />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="news/new" element={<NewsEditorPage />} />
        <Route path="news/:id/edit" element={<NewsEditorPage />} />
        <Route path="marketing" element={<MarketingHubPage />} />
        <Route path="marketing/plugins" element={<MarketingPluginsPage />} />
        <Route path="marketing/consent" element={<MarketingConsentPage />} />
        <Route path="marketing/consent/permissions" element={<MarketingConsentPermissionsPage />} />
        <Route path="marketing/analytics" element={<MarketingAnalyticsHub />} />
        <Route path="marketing/analytics/app-store" element={<AnalystAppStorePage />} />
        <Route path="marketing/analytics/play-store" element={<AnalystPlayStorePage />} />
        <Route path="marketing/analytics/:tool" element={<MarketingToolRoute section="analytics" />} />
        <Route path="marketing/ads" element={<MarketingAdsHub />} />
        <Route path="marketing/ads/:tool" element={<MarketingToolRoute section="ads" />} />
        <Route path="marketing/seo" element={<MarketingSeoWorkspacePage />} />
        <Route path="marketing/seo/identity" element={<MarketingSeoIdentityPage />} />
        <Route path="marketing/seo/indexing" element={<MarketingIndexingPage />} />
        <Route path="marketing/seo/aeo" element={<MarketingAeoPage />} />
        <Route path="marketing/seo/search-console" element={<MarketingSearchConsolePage />} />
        <Route path="marketing/seo/merchant" element={<MarketingMerchantPage />} />
        <Route path="analyst" element={<AnalystHubPage />} />
        <Route path="analyst/customers" element={<AnalystCustomersPage />} />
        <Route path="analyst/search-trends" element={<AnalystSearchTrendsPage />} />
        <Route path="analyst/app-stores" element={<Navigate to="/marketing/analytics" replace />} />
        <Route path="analyst/app-stores/apple" element={<Navigate to="/marketing/analytics/app-store" replace />} />
        <Route path="analyst/app-stores/google" element={<Navigate to="/marketing/analytics/play-store" replace />} />
        <Route path="analyst/research" element={<AnalystResearchPage />} />
        <Route path="analyst/product-match" element={<AnalystProductMatchPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
