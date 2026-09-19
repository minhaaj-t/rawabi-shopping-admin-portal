export type AnalystSegment = {
  id: string;
  label: string;
  count: number;
  hint: string;
};

export type AnalystOverview = {
  customers_total: number;
  customers_active: number;
  customers_with_orders: number;
  search_terms_tracked: number;
  search_terms_matched: number;
  research_sources: number;
  research_runs: number;
  top_search_terms: Array<{ term: string; users: number; stores: number }>;
  segments: AnalystSegment[];
  app_stores?: {
    apple: {
      enabled: boolean;
      app_name: string;
      apple_id: string;
      store_url: string;
      rating: number | null;
      rating_count: number | null;
      version: string;
      last_refreshed_at: string | null;
    };
    google: {
      enabled: boolean;
      app_name: string;
      package_name: string;
      store_url: string;
      rating: number | null;
      rating_count: number | null;
      version: string;
      last_refreshed_at: string | null;
    };
    updated_at: string | null;
  };
};

export type AnalystCustomerRow = {
  user_id: number;
  name: string;
  email: string;
  phone: string;
  status: number;
  created_at: string | null;
  order_count: number;
  lifetime_value: number;
  last_order_at: string | null;
  segment: string;
};

export type AnalystCustomersPage = {
  items: AnalystCustomerRow[];
  page: number;
  per_page: number;
  total: number;
  segments: AnalystSegment[];
};

export type AnalystProductMatch = {
  product_id: number;
  name: string;
  sku: string | null;
  score: number;
};

export type AnalystTermMatch = {
  term: string;
  users?: number;
  stores?: number;
  match_count?: number;
  gap: boolean;
  matches: AnalystProductMatch[];
};

export type AnalystSearchTrends = {
  items: AnalystTermMatch[];
  total: number;
  gaps: number;
};

export type AnalystProductMatchResult = {
  items: AnalystTermMatch[];
  total: number;
  matched: number;
  gaps: number;
};

export type AnalystResearchSource = {
  id: string;
  name: string;
  url: string;
  notes: string;
  enabled: boolean;
  updated_at?: string;
};

export type AnalystResearchRun = {
  id: string;
  source_name: string;
  url: string;
  fetched_at: string;
  candidates: number;
  matched: number;
  gaps: number;
  items: AnalystTermMatch[];
};

export type AnalystResearch = {
  sources: AnalystResearchSource[];
  runs: AnalystResearchRun[];
};

export type AppStoreMetrics = {
  rating: number | null;
  rating_count: number | null;
  version: string;
  downloads_label: string;
  reviews_30d: number | null;
  crashes_30d: number | null;
  impressions_30d: number | null;
  conversion_rate: number | null;
  last_refreshed_at: string | null;
  source: string;
};

export type AppStoreListing = {
  enabled: boolean;
  app_name: string;
  apple_id?: string;
  bundle_id?: string;
  country?: string;
  package_name?: string;
  legacy_package_name?: string;
  store_url: string;
  console_url: string;
  notes: string;
  metrics: AppStoreMetrics;
};

export type AppStoreAnalyticsPayload = {
  store: "apple" | "google";
  listing: AppStoreListing;
  updated_at: string | null;
};

export type AppStoresOverview = {
  apple: AppStoreListing;
  google: AppStoreListing;
  updated_at: string | null;
};
