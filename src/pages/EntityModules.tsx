import { useEffect, useState } from "react";
import { Eye } from "../lib/icons";
import { adminApi } from "../lib/api";
import { EntityCrudPage, decodeLocaleName } from "../components/EntityCrudPage";
import { ApplicantDetailModal, CvPreviewModal, type CvPreviewState } from "../components/ApplicantModals";

export { BrandsPage } from "./BrandsManagePage";

export function CouponsPage() {
  return (
    <EntityCrudPage
      title="Coupons / promo codes"
      subtitle="Checkout codes: percentage, fixed, first-order, free delivery, cart minimum, customer-specific."
      addLabel="Add coupon"
      idKey="ec_coupon_id"
      load={async () => {
        const res = await adminApi.coupons({ per_page: 50 });
        return { items: res.items, total: res.total };
      }}
      create={(b) => adminApi.createCoupon(b)}
      update={(id, b) => adminApi.updateCoupon(id, b)}
      remove={(id) => adminApi.deleteCoupon(id)}
      toggleStatus={(id, s) => adminApi.updateCouponStatus(id, s)}
      statusKey="ec_coupon_status"
      fields={[
        { key: "title", label: "Coupon name", required: true },
        { key: "code", label: "Promo code", required: true },
        {
          key: "coupon_type",
          label: "Offer type",
          type: "select",
          options: [
            { value: "Normal", label: "Normal" },
            { value: "First Order", label: "First-order discount" },
            { value: "Free Delivery", label: "Free delivery" },
          ],
        },
        {
          key: "discount_type",
          label: "Discount math",
          type: "select",
          options: [
            { value: "fixed", label: "Fixed (QAR)" },
            { value: "percentage", label: "Percentage (%)" },
          ],
        },
        { key: "fixed", label: "Fixed amount (QAR)", type: "number" },
        { key: "percentage", label: "Percentage", type: "number" },
        { key: "min_amt", label: "Cart minimum (QAR)", type: "number" },
        { key: "max_amt", label: "Cart maximum (QAR)", type: "number" },
        { key: "limit", label: "Usage limit", type: "number" },
        {
          key: "usertype",
          label: "Audience",
          type: "select",
          options: [
            { value: "common", label: "Everyone" },
            { value: "user", label: "Customer-specific" },
            { value: "usergroup", label: "User group" },
          ],
        },
        { key: "user_id", label: "Customer ID (if customer-specific)", type: "number" },
        { key: "user_group", label: "User group IDs (CSV)" },
        { key: "start_date", label: "Start date", type: "date" },
        { key: "end_date", label: "End date", type: "date" },
        { key: "instruction", label: "Instructions", type: "textarea" },
      ]}
      mapEdit={(r) => ({
        title: decodeLocaleName(r.ec_coupon_title),
        code: String(r.ec_coupon_cupncode ?? ""),
        coupon_type: String(r.ec_coupon_type ?? "Normal"),
        discount_type: String(r.ec_coupon_discnt_type ?? "fixed"),
        fixed: String(r.ec_coupon_fixed ?? ""),
        percentage: String(r.ec_coupon_percentage ?? ""),
        min_amt: String(r.ec_coupon_min_amt ?? ""),
        max_amt: String(r.ec_coupon_max_amt ?? ""),
        limit: String(r.ec_coupon_limit ?? ""),
        usertype: String(r.ec_coupon_usertype ?? "common"),
        user_id: String(r.ec_coupon_user ?? ""),
        user_group: String(r.ec_coupon_user_group ?? ""),
        start_date: String(r.ec_coupon_start_date ?? "").slice(0, 10),
        end_date: String(r.ec_coupon_end_date ?? "").slice(0, 10),
        instruction: String(r.ec_coupon_instruction ?? ""),
      })}
      columns={[
        {
          key: "ec_coupon_title",
          label: "Name",
          render: (r) => decodeLocaleName(r.ec_coupon_title),
        },
        { key: "ec_coupon_cupncode", label: "Code" },
        { key: "ec_coupon_type", label: "Offer" },
        { key: "ec_coupon_discnt_type", label: "Math" },
        { key: "ec_coupon_usertype", label: "Audience" },
        { key: "ec_usage_count", label: "Used" },
      ]}
    />
  );
}

export { BannersPage } from "./BannerManagementPage";

export function FlyersPage() {
  return (
    <EntityCrudPage
      title="Flyer List"
      addLabel="Add Flyer"
      idKey="ec_flyer_id"
      load={async () => {
        const res = await adminApi.flyers({ per_page: 50 });
        return { items: res.items, total: res.total };
      }}
      create={(b) => adminApi.createFlyer(b)}
      update={(id, b) => adminApi.updateFlyer(id, b)}
      remove={(id) => adminApi.deleteFlyer(id)}
      toggleStatus={(id, s) => adminApi.updateFlyerStatus(id, s)}
      statusKey="ec_flyer_status"
      fields={[
        { key: "title", label: "Flyer Title", required: true },
        { key: "start_date", label: "Start Date", type: "date" },
        { key: "end_date", label: "End Date", type: "date" },
        { key: "file", label: "PDF filename / URL" },
        { key: "image", label: "Thumbnail filename / URL" },
      ]}
      mapEdit={(r) => ({
        title: String(r.ec_flyer_title ?? ""),
        start_date: String(r.ec_flyer_startdate ?? "").slice(0, 10),
        end_date: String(r.ec_flyer_enddate ?? "").slice(0, 10),
        file: String(r.ec_flyer_file ?? ""),
        image: String(r.ec_flyer_image ?? ""),
      })}
      columns={[
        { key: "ec_flyer_title", label: "Flyer Name" },
        {
          key: "file",
          label: "Flyer File",
          render: (r) => (r.ec_flyer_file ? "View PDF" : "-"),
        },
      ]}
    />
  );
}

export function DeliveryFeesPage() {
  return (
    <EntityCrudPage
      title="Delivery List"
      addLabel="Add Delivery"
      idKey="ec_delivery_id"
      load={async () => {
        const items = await adminApi.deliveryFees();
        return { items, total: items.length };
      }}
      create={(b) => adminApi.createDeliveryFee(b)}
      update={(id, b) => adminApi.updateDeliveryFee(id, b)}
      remove={(id) => adminApi.deleteDeliveryFee(id)}
      toggleStatus={(id, s) => adminApi.updateDeliveryFee(id, { status: s })}
      statusKey="ec_delivery_status"
      fields={[
        {
          key: "type",
          label: "Delivery Type",
          type: "select",
          required: true,
          options: [
            { value: "1", label: "Normal" },
            { value: "2", label: "Express" },
          ],
        },
        { key: "km_from", label: "Kilometer From", type: "number" },
        { key: "km_to", label: "Kilometer To", type: "number" },
        { key: "fee", label: "Delivery Fee", type: "number", required: true },
        {
          key: "above_amount",
          label: "Free above purchase amount",
          type: "number",
        },
      ]}
      mapEdit={(r) => ({
        type: String(r.ec_delivery_type ?? "1"),
        km_from: String(r.ec_delivery_km_from ?? ""),
        km_to: String(r.ec_delivery_km_to ?? ""),
        fee: String(r.ec_delivery_fee ?? ""),
        above_amount: String(r.ec_delivery_above_amount ?? "0"),
      })}
      columns={[
        {
          key: "ec_delivery_type",
          label: "Delivery Type",
          render: (r) => (Number(r.ec_delivery_type) === 2 ? "Express" : "Normal"),
        },
        { key: "ec_delivery_km_from", label: "Kilometer From" },
        { key: "ec_delivery_km_to", label: "Kilometer To" },
        { key: "ec_delivery_fee", label: "Delivery Fee" },
        {
          key: "ec_delivery_above_amount",
          label: "Free above",
          render: (r) => {
            const n = Number(r.ec_delivery_above_amount ?? 0);
            return n > 0 ? n : "—";
          },
        },
      ]}
    />
  );
}

export function PromotionsPage() {
  return (
    <EntityCrudPage
      title="Promotions"
      subtitle="Scheduled offers: %, fixed, flash, BOGO / Buy X Get Y, scoped to category, brand, store, or product."
      addLabel="Add promotion"
      idKey="id"
      load={async () => {
        const res = await adminApi.promotions({ per_page: 50 });
        return { items: res.items, total: res.total };
      }}
      create={(b) => adminApi.createPromotion(b)}
      update={(id, b) => adminApi.updatePromotion(id, b)}
      remove={(id) => adminApi.deletePromotion(id)}
      toggleStatus={(id, s) => adminApi.updatePromotion(id, { status: s })}
      statusKey="status"
      fields={[
        { key: "title", label: "Title (EN)", required: true },
        { key: "title_ar", label: "Title (AR)" },
        { key: "desc", label: "Description", type: "textarea" },
        {
          key: "offer_kind",
          label: "Offer kind",
          type: "select",
          options: [
            { value: "percentage", label: "Percentage discount" },
            { value: "fixed", label: "Fixed discount" },
            { value: "flash", label: "Flash sale" },
            { value: "bogo", label: "Buy 1 Get 1" },
            { value: "buy2get1", label: "Buy 2 Get 1" },
            { value: "buy_x_get_y", label: "Buy X Get Y" },
            { value: "bundle", label: "Bundle offer" },
            { value: "free_delivery", label: "Free delivery" },
            { value: "cart_value", label: "Cart-value discount" },
          ],
        },
        {
          key: "discount_type",
          label: "Discount math (for % / fixed)",
          type: "select",
          options: [
            { value: "percentage", label: "Percentage" },
            { value: "fixed", label: "Fixed Price" },
          ],
        },
        { key: "discount_price", label: "Discount value", type: "number" },
        { key: "buy_qty", label: "Buy qty (BOGO / Buy X Get Y)", type: "number" },
        { key: "get_qty", label: "Get qty (BOGO / Buy X Get Y)", type: "number" },
        {
          key: "scope",
          label: "Scope",
          type: "select",
          options: [
            { value: "all", label: "Store-wide" },
            { value: "category", label: "Category discount" },
            { value: "brand", label: "Brand discount" },
            { value: "store", label: "Store discount" },
            { value: "product", label: "Product" },
          ],
        },
        { key: "scope_ref", label: "Scope ID / ref (category, brand, store, SKU)" },
        { key: "category", label: "Category label (legacy)" },
        { key: "start_date", label: "Start date (schedule)", type: "date" },
        { key: "end_date", label: "End date (schedule)", type: "date" },
        { key: "image", label: "Image filename / URL" },
      ]}
      mapEdit={(r) => ({
        title: String(r.title ?? ""),
        title_ar: String(r.title_ar ?? ""),
        desc: String(r.desc ?? ""),
        offer_kind: String(r.offer_kind ?? r.discount_type ?? "percentage"),
        discount_type: String(r.discount_type ?? "percentage"),
        discount_price: String(r.discount_price ?? ""),
        buy_qty: String(r.buy_qty ?? ""),
        get_qty: String(r.get_qty ?? ""),
        scope: String(r.scope ?? "all"),
        scope_ref: String(r.scope_ref ?? ""),
        category: String(r.category ?? ""),
        start_date: String(r.start_date ?? "").slice(0, 10),
        end_date: String(r.end_date ?? "").slice(0, 10),
        image: String(r.image ?? ""),
      })}
      columns={[
        { key: "title", label: "Title" },
        { key: "offer_kind", label: "Offer" },
        { key: "scope", label: "Scope" },
        { key: "discount_price", label: "Value" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
      ]}
    />
  );
}

export function CountriesPage() {
  return (
    <EntityCrudPage
      title="Countries"
      settingsSection="Geography"
      settingsSectionTo="/settings/countries"
      subtitle="Countries available in address forms and product origin fields."
      addLabel="Add Country"
      idKey="ec_country_id"
      load={async () => {
        const items = await adminApi.countries();
        return { items, total: items.length };
      }}
      create={(b) => adminApi.createCountry(b)}
      update={(id, b) => adminApi.updateCountry(id, b)}
      remove={(id) => adminApi.deleteCountry(id)}
      toggleStatus={(id, s) => adminApi.updateCountryStatus(id, s)}
      statusKey="ec_country_status"
      fields={[
        { key: "name", label: "Country Name", required: true },
        { key: "name_ar", label: "Country Name (Arabic)" },
        { key: "code", label: "Country Code" },
        { key: "currency_code", label: "Currency code", placeholder: "QAR" },
        { key: "currency_symbol", label: "Currency symbol", placeholder: "QAR" },
        { key: "currency_decimals", label: "Currency decimals", type: "number" },
        { key: "flag", label: "Flag filename / URL" },
      ]}
      mapEdit={(r) => ({
        name: decodeLocaleName(r.ec_country_name),
        name_ar: String(r.ec_country_name_ar ?? ""),
        code: String(r.ec_country_code ?? ""),
        currency_code: String(r.ec_country_currency_code ?? ""),
        currency_symbol: String(r.ec_country_currency_symbol ?? ""),
        currency_decimals: String(r.ec_country_currency_decimals ?? "2"),
        flag: String(r.ec_country_flag_img ?? ""),
      })}
      columns={[
        {
          key: "ec_country_name",
          label: "Country Name",
          render: (r) => decodeLocaleName(r.ec_country_name),
        },
        { key: "ec_country_code", label: "Country Code" },
        {
          key: "ec_country_currency_code",
          label: "Currency",
          render: (r) =>
            r.ec_country_currency_code
              ? `${String(r.ec_country_currency_code)}${r.ec_country_currency_symbol ? ` (${String(r.ec_country_currency_symbol)})` : ""}`
              : "—",
        },
        { key: "ec_country_flag_img", label: "Country Flag" },
      ]}
    />
  );
}

export function AreasPage() {
  const [countryOpts, setCountryOpts] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    void adminApi.countries().then((rows) =>
      setCountryOpts(
        rows.map((r) => ({
          value: String(r.ec_country_id),
          label: decodeLocaleName(r.ec_country_name),
        })),
      ),
    );
  }, []);

  return (
    <EntityCrudPage
      title="Areas"
      settingsSection="Geography"
      settingsSectionTo="/settings/countries"
      subtitle="Delivery and billing areas linked to countries."
      addLabel="Add area"
      idKey="ec_area_id"
      load={async () => {
        const items = await adminApi.areas();
        return { items, total: items.length };
      }}
      create={(b) => adminApi.createArea(b)}
      update={(id, b) => adminApi.updateArea(id, b)}
      remove={(id) => adminApi.deleteArea(id)}
      toggleStatus={(id, s) => adminApi.updateAreaStatus(id, s)}
      statusKey="ec_area_status"
      fields={[
        { key: "name", label: "Area Name", required: true },
        { key: "name_ar", label: "Area Name (Arabic)" },
        { key: "country_id", label: "Country", type: "select", required: true, options: countryOpts },
      ]}
      mapEdit={(r) => ({
        name: decodeLocaleName(r.ec_area_name),
        name_ar: String(r.ec_area_name_ar ?? ""),
        country_id: String(r.ec_country_id ?? ""),
      })}
      columns={[
        {
          key: "ec_area_name",
          label: "Area Name",
          render: (r) => decodeLocaleName(r.ec_area_name),
        },
        {
          key: "ec_country_name",
          label: "Country",
          render: (r) => decodeLocaleName(r.ec_country_name),
        },
      ]}
    />
  );
}

export function LanguagesPage() {
  const [seedBusy, setSeedBusy] = useState(false);
  const [listKey, setListKey] = useState(0);

  async function seedDefaults() {
    setSeedBusy(true);
    try {
      await adminApi.seedLanguages();
      setListKey((k) => k + 1);
    } catch {
      /* EntityCrudPage will show load errors on remount if needed */
      setListKey((k) => k + 1);
    } finally {
      setSeedBusy(false);
    }
  }

  return (
    <EntityCrudPage
      key={listKey}
      title="Languages"
      settingsSection="Localization"
      settingsSectionTo="/settings/languages"
      subtitle="Storefront & app languages. Enable/disable controls which locales customers can pick. Add any language — web and app load this list (no hardcoding)."
      addLabel="Add Language"
      idKey="ec_lang_id"
      headerActions={
        <button
          type="button"
          className="btn btn-ghost"
          disabled={seedBusy}
          onClick={() => void seedDefaults()}
        >
          {seedBusy ? "Seeding…" : "Seed defaults (En/Ar/Ml/Hi)"}
        </button>
      }
      load={async () => {
        const items = await adminApi.languages();
        return { items, total: items.length };
      }}
      create={(b) =>
        adminApi.createLanguage({
          ...b,
          dir: b.dir || "ltr",
        })
      }
      update={(id, b) => adminApi.updateLanguage(id, b)}
      remove={(id) => adminApi.deleteLanguage(id)}
      toggleStatus={(id, s) => adminApi.updateLanguageStatus(id, s)}
      statusKey="ec_lang_status"
      fields={[
        {
          key: "title",
          label: "API title (lang header / JSON key)",
          required: true,
          placeholder: "e.g. English, Arabic, Urdu",
        },
        {
          key: "code",
          label: "Short code (header)",
          placeholder: "e.g. En, Ar, Ur",
        },
        {
          key: "locale",
          label: "Locale slug",
          placeholder: "e.g. en, ar, ur",
        },
        {
          key: "native",
          label: "Native name",
          placeholder: "e.g. العربية",
        },
        {
          key: "dir",
          label: "Text direction",
          type: "select",
          options: [
            { value: "ltr", label: "LTR" },
            { value: "rtl", label: "RTL" },
          ],
        },
      ]}
      mapEdit={(r) => ({
        title: String(r.ec_lang_title ?? ""),
        code: String(r.ec_lang_code ?? ""),
        locale: String(r.ec_lang_locale ?? r.locale ?? ""),
        native: String(r.ec_lang_native ?? r.native ?? ""),
        dir: String(r.ec_lang_dir ?? r.dir ?? "ltr") || "ltr",
      })}
      columns={[
        { key: "ec_lang_title", label: "Title" },
        { key: "ec_lang_code", label: "Code" },
        {
          key: "ec_lang_locale",
          label: "Locale",
          render: (r) => String(r.ec_lang_locale ?? r.locale ?? "—"),
        },
        {
          key: "ec_lang_native",
          label: "Native",
          render: (r) => String(r.ec_lang_native ?? r.native ?? "—"),
        },
        {
          key: "ec_lang_dir",
          label: "Dir",
          render: (r) => String(r.ec_lang_dir ?? r.dir ?? "ltr").toUpperCase(),
        },
      ]}
    />
  );
}

/** Same data as Catalog → Attributes (`ec_parameter`); keep one UI. */
export { AttributesManagePage as ParametersPage } from "./AttributesManagePage";

export function ParameterValuesPage() {
  const [langOpts, setLangOpts] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    void adminApi.languages().then((rows) =>
      setLangOpts(rows.map((r) => ({ value: String(r.ec_lang_id), label: String(r.ec_lang_title) }))),
    );
  }, []);

  return (
    <EntityCrudPage
      title="Parameter values"
      settingsSection="Localization"
      settingsSectionTo="/settings/languages"
      subtitle="Localized JSON key-value strings per language."
      addLabel="Add Parameter Value"
      idKey="ec_pv_id"
      load={async () => {
        const res = await adminApi.parameterValues({ per_page: 50 });
        return { items: res.items, total: res.total };
      }}
      create={(b) => adminApi.createParameterValue(b)}
      update={(id, b) => adminApi.updateParameterValue(id, b)}
      fields={[
        { key: "lang_id", label: "Language", type: "select", required: true, options: langOpts },
        {
          key: "values",
          label: "Values JSON (key → translation)",
          type: "textarea",
          required: true,
          placeholder: '{"PROFILE":"Profile","MY ORDERS":"My Orders"}',
        },
      ]}
      mapEdit={(r) => ({
        lang_id: String(r.ec_pv_lang_id ?? ""),
        values: typeof r.ec_pv_values === "string" ? r.ec_pv_values : JSON.stringify(r.ec_pv_values ?? {}),
      })}
      columns={[
        { key: "ec_lang_title", label: "Language" },
        {
          key: "ec_pv_values",
          label: "Values",
          render: (r) => {
            const s = String(r.ec_pv_values ?? "");
            return s.length > 80 ? `${s.slice(0, 80)}…` : s || "-";
          },
        },
      ]}
    />
  );
}

export function JobsPage({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <EntityCrudPage
      title={embedded ? "Openings" : "Job List"}
      addLabel="Add Job"
      idKey="job_id"
      embedded={embedded}
      subtitle={embedded ? undefined : "Create and manage career job postings."}
      load={async () => {
        const res = await adminApi.jobs({ per_page: 50 });
        return { items: res.items, total: res.total };
      }}
      create={(b) => adminApi.createJob(b)}
      update={(id, b) => adminApi.updateJob(id, b)}
      remove={(id) => adminApi.deleteJob(id)}
      toggleStatus={(id, s) => adminApi.updateJobStatus(id, s)}
      statusKey="job_status"
      fields={[
        { key: "title", label: "Job Title", required: true },
        { key: "short_desc", label: "Short Desc", type: "textarea" },
        { key: "detail_desc", label: "Detail Desc", type: "textarea" },
        { key: "start_date", label: "Start Date", type: "date" },
        { key: "end_date", label: "End Date", type: "date" },
      ]}
      mapEdit={(r) => ({
        title: String(r.job_title ?? ""),
        short_desc: String(r.job_short_desc ?? ""),
        detail_desc: String(r.job_detail_desc ?? ""),
        start_date: String(r.job_start_date ?? "").slice(0, 10),
        end_date: String(r.job_end_date ?? "").slice(0, 10),
      })}
      columns={[
        { key: "job_title", label: "Job" },
        { key: "job_short_desc", label: "Short Desc" },
        { key: "job_start_date", label: "Start Date" },
        { key: "job_end_date", label: "End Date" },
      ]}
    />
  );
}

export function CvsPage({
  embedded = false,
  initialJob = "",
  initialStatus = "",
  initialOpenId,
}: {
  embedded?: boolean;
  initialJob?: string;
  initialStatus?: string;
  initialOpenId?: number;
} = {}) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [cvPreview, setCvPreview] = useState<CvPreviewState | null>(null);
  const [jobFilter, setJobFilter] = useState(initialJob);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setJobFilter(initialJob);
    setStatusFilter(initialStatus);
  }, [initialJob, initialStatus]);

  useEffect(() => {
    if (!initialOpenId) return;
    void adminApi.career(initialOpenId).then(setDetail).catch(() => undefined);
  }, [initialOpenId]);

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, job…"
          style={{ minWidth: 220 }}
        />
        <input
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          placeholder="Filter by job title"
          style={{ minWidth: 180 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="0">Pending review</option>
          <option value="1">Reviewed</option>
        </select>
        <button type="button" className="btn btn-secondary" onClick={() => setReloadKey((k) => k + 1)}>
          Apply filters
        </button>
      </div>
      <EntityCrudPage
        key={`${reloadKey}-${jobFilter}-${statusFilter}-${q}`}
        title={embedded ? "Applicants" : "CVs"}
        idKey="career_id"
        embedded={embedded}
        load={async () => {
          const res = await adminApi.careers({
            q: q.trim() || undefined,
            job: jobFilter.trim() || undefined,
            status: statusFilter !== "" ? statusFilter : undefined,
            per_page: 50,
          });
          return { items: res.items, total: res.total };
        }}
        remove={(id) => adminApi.deleteCareer(id)}
        columns={[
          { key: "career_name", label: "Name" },
          { key: "career_mobile", label: "Mobile" },
          { key: "career_email", label: "Email" },
          { key: "career_job", label: "Job" },
          { key: "career_qualification", label: "Qualification" },
          { key: "career_experience", label: "Experience" },
          {
            key: "career_status",
            label: "Review",
            render: (r) => (Number(r.career_status) === 1 ? "Reviewed" : "Pending"),
          },
        ]}
        extraActions={(row, reload) => (
          <>
            <button
              type="button"
              className="btn btn-green"
              onClick={() => void adminApi.career(Number(row.career_id)).then((d) => setDetail(d))}
            >
              View Detail
            </button>
            {row.career_cv ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setCvPreview({
                    careerId: Number(row.career_id),
                    path: String(row.career_cv),
                    name: String(row.career_name || ""),
                    job: String(row.career_job || ""),
                  })
                }
              >
                <Eye size={14} aria-hidden />
                View CV
              </button>
            ) : null}
            {row.career_email ? (
              <a className="btn btn-secondary" href={`mailto:${String(row.career_email)}`}>
                Email
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                void adminApi
                  .updateCareerStatus(Number(row.career_id), Number(row.career_status) === 1 ? 0 : 1)
                  .then(reload)
              }
            >
              {Number(row.career_status) === 1 ? "Mark pending" : "Mark reviewed"}
            </button>
          </>
        )}
      />
      {detail ? (
        <ApplicantDetailModal
          detail={detail}
          onClose={() => setDetail(null)}
          onChanged={setDetail}
          onPreviewCv={(cv) => setCvPreview(cv)}
        />
      ) : null}
      {cvPreview ? <CvPreviewModal cv={cvPreview} onClose={() => setCvPreview(null)} /> : null}
    </div>
  );
}

export function VendorsPage() {
  return (
    <EntityCrudPage
      title="Venders"
      addLabel="Add Vendor"
      idKey="ec_vender_id"
      load={async () => {
        const res = await adminApi.vendors({ per_page: 50 });
        return { items: res.items, total: res.total };
      }}
      create={(b) => adminApi.createVendor(b)}
      update={(id, b) => adminApi.updateVendor(id, b)}
      remove={(id) => adminApi.deleteVendor(id)}
      toggleStatus={(id, s) => adminApi.updateVendorStatus(id, s)}
      statusKey="ec_vender_status"
      fields={[
        { key: "username", label: "Username", required: true },
        { key: "email", label: "Email", required: true },
        { key: "mobile", label: "Mobile" },
        { key: "password", label: "Password", type: "password", createOnly: true },
        { key: "logo", label: "Logo filename / URL" },
      ]}
      mapEdit={(r) => ({
        username: String(r.ec_vender_username ?? ""),
        email: String(r.ec_vender_email ?? ""),
        mobile: String(r.ec_vender_mobile ?? ""),
        logo: String(r.ec_vender_logo ?? ""),
        password: "",
      })}
      columns={[
        { key: "ec_vender_username", label: "Username" },
        { key: "ec_vender_email", label: "Email" },
        { key: "ec_vender_mobile", label: "Mobile" },
      ]}
    />
  );
}

export { FiltersManagePage as FiltersPage } from "./FiltersManagePage";

export { NewsManagePage as NewsPage } from "./NewsManagePage";

export { VariantsManagePage as VariantsPage } from "./VariantsManagePage";
