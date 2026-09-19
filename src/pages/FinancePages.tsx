import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  CreditCard,
  Receipt,
  Wallet,
} from "../lib/icons";
import { SettingsToggle } from "../components/SettingsPageShell";
import {
  adminApi,
  type CheckoutSettings,
  type FinanceOrderList,
  type FinanceOrderRow,
  type IntegrationSettings,
} from "../lib/api";
import { IntegrationsEditorForm } from "./IntegrationsSettingsPage";
import { useSettingsForm } from "../lib/useSettingsForm";
import { LoadingCard } from "../components/LoadingIndicator";

function money(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

function methodLabel(raw: string | null | undefined) {
  const v = String(raw ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (v === "cod") return "COD";
  if (v === "ccod" || v === "card_od") return "Card on delivery";
  if (v === "pickup" || v === "pickup_cash" || v === "store") return "Pay at store";
  if (v === "online" || v === "qnb" || v === "card") return "QNB card";
  if (v === "apple_pay" || v === "applepay") return "Apple Pay";
  if (v === "google_pay" || v === "googlepay") return "Google Pay";
  if (v === "naps") return "NAPS";
  if (v === "qpay") return "QPay";
  if (v === "qmp") return "QMP";
  if (v === "fawran") return "Fawran";
  if (v === "bank" || v === "bank_transfer") return "Bank transfer";
  if (v === "wallet" || v === "store_credit" || v === "credit") return "Store credit";
  return raw || "—";
}

type MethodKey = keyof Pick<
  CheckoutSettings,
  | "payment_cod_enabled"
  | "payment_ccod_enabled"
  | "payment_pickup_cash_enabled"
  | "payment_online_enabled"
  | "payment_apple_pay_enabled"
  | "payment_google_pay_enabled"
  | "payment_naps_enabled"
  | "payment_qpay_enabled"
  | "payment_qmp_enabled"
  | "payment_fawran_enabled"
  | "payment_bank_transfer_enabled"
  | "payment_store_credit_enabled"
>;

const METHOD_OPTIONS: Array<{
  key: MethodKey;
  label: string;
  hint: string;
  group: string;
  stats: string[];
  rail?: "naps" | "qpay" | "qmp" | "fawran";
}> = [
  { key: "payment_cod_enabled", label: "Cash on delivery", hint: "Cash at the door.", group: "At delivery", stats: ["cod"] },
  { key: "payment_ccod_enabled", label: "Card on delivery", hint: "Driver takes a card at the door.", group: "At delivery", stats: ["ccod", "card-od"] },
  { key: "payment_pickup_cash_enabled", label: "Pay at store", hint: "Customer pays at the counter on pickup.", group: "At delivery", stats: ["pickup", "pickup_cash", "store"] },
  { key: "payment_online_enabled", label: "QNB iPay card", hint: "Visa / Mastercard through QNB before the order is placed.", group: "Online", stats: ["online", "qnb", "card"] },
  { key: "payment_apple_pay_enabled", label: "Apple Pay", hint: "Wallet checkout on iPhone and Safari (via QNB).", group: "Online", stats: ["apple_pay", "applepay"] },
  { key: "payment_google_pay_enabled", label: "Google Pay", hint: "Wallet checkout on Android (via QNB).", group: "Online", stats: ["google_pay", "googlepay"] },
  {
    key: "payment_naps_enabled",
    label: "NAPS",
    hint: "Qatar domestic debit (QCB retail network).",
    group: "Qatar rails",
    stats: ["naps"],
    rail: "naps",
  },
  {
    key: "payment_qpay_enabled",
    label: "QPay",
    hint: "QPay as a checkout method (not only a QNB response field).",
    group: "Qatar rails",
    stats: ["qpay"],
    rail: "qpay",
  },
  {
    key: "payment_qmp_enabled",
    label: "QMP",
    hint: "Qatar Mobile Payment when your PSP enables the channel.",
    group: "Qatar rails",
    stats: ["qmp"],
    rail: "qmp",
  },
  {
    key: "payment_fawran_enabled",
    label: "Fawran",
    hint: "Instant account-to-account credit transfer.",
    group: "Qatar rails",
    stats: ["fawran"],
    rail: "fawran",
  },
  { key: "payment_bank_transfer_enabled", label: "Bank transfer", hint: "Manual transfer; finance marks the order after proof.", group: "Other", stats: ["bank", "bank_transfer"] },
  { key: "payment_store_credit_enabled", label: "Store credit", hint: "Refunds or credit notes applied at checkout.", group: "Other", stats: ["wallet", "store_credit", "credit"] },
];

function DateFilters({
  from,
  to,
  setFrom,
  setTo,
  q,
  setQ,
  onRun,
  extra,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  q?: string;
  setQ?: (v: string) => void;
  onRun: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="toolbar card">
      {setQ ? (
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, name, phone" />
      ) : null}
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      {extra}
      <button type="button" className="btn" onClick={onRun}>
        Run
      </button>
    </div>
  );
}

function useRange() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");
  return { from, to, setFrom, setTo, q, setQ };
}

function OrderTable({
  rows,
  extraHead,
  extraCell,
}: {
  rows: FinanceOrderRow[];
  extraHead?: ReactNode;
  extraCell?: (row: FinanceOrderRow) => ReactNode;
}) {
  return (
    <div className="card table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Method</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Store</th>
            <th>Date</th>
            {extraHead}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.order_id}>
              <td>
                <Link to={`/orders/${row.order_id}`}>{row.order_refno}</Link>
              </td>
              <td>
                {row.username || "Guest"}
                {row.phone ? <div className="muted">{row.phone}</div> : null}
              </td>
              <td>{methodLabel(row.order_payment)}</td>
              <td>{row.order_status}</td>
              <td>{money(row.order_payable)}</td>
              <td>{row.ec_store_name || row.order_storeid}</td>
              <td>{String(row.order_created_at).slice(0, 16).replace("T", " ")}</td>
              {extraCell ? extraCell(row) : null}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={extraHead ? 8 : 7} className="muted">
                No records
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

const HUB_SECTIONS = [
  {
    id: "checkout",
    title: "Checkout",
    desc: "What customers can pay with, and how cash is collected.",
    icon: CreditCard,
    links: [
      { to: "/finance/methods", label: "Payment methods", desc: "COD, cards, wallets, NAPS, QPay, QMP, Fawran" },
      { to: "/finance/gateway-logs", label: "Gateway logs", desc: "Online pay staging & failures" },
      { to: "/finance/cod", label: "COD management", desc: "Open cash and mark collected" },
    ],
  },
  {
    id: "ledger",
    title: "Ledger",
    desc: "Order money in, money out, and documents.",
    icon: Receipt,
    links: [
      { to: "/finance/transactions", label: "Transactions", desc: "Every paid order as a line" },
      { to: "/finance/refunds", label: "Refund management", desc: "Cancelled orders and refund status" },
      { to: "/finance/invoices", label: "Invoices", desc: "Preview and download invoices" },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    desc: "VAT, revenue mix, and store settlement.",
    icon: Wallet,
    links: [
      { to: "/finance/tax", label: "Tax / VAT", desc: "TRN and rate for reports" },
      { to: "/finance/revenue", label: "Revenue reports", desc: "Gross by method and day" },
      { to: "/finance/settlements", label: "Settlement reports", desc: "Delivered cash vs online" },
    ],
  },
];

export function FinanceHubPage() {
  const [kpis, setKpis] = useState({
    gross: 0,
    orders: 0,
    openCod: 0,
    methodsOn: 0,
  });

  useEffect(() => {
    void Promise.allSettled([
      adminApi.financeRevenue(),
      adminApi.financeCod(),
      adminApi.checkoutSettings(),
    ]).then(([rev, cod, checkout]) => {
      setKpis((prev) => {
        const next = { ...prev };
        if (rev.status === "fulfilled") {
          next.gross = Number(rev.value.summary?.gross ?? 0);
          next.orders = Number(rev.value.summary?.orders_count ?? 0);
        }
        if (cod.status === "fulfilled") next.openCod = Number(cod.value.open_total ?? 0);
        if (checkout.status === "fulfilled") {
          next.methodsOn = METHOD_OPTIONS.filter((m) => Boolean(checkout.value[m.key])).length;
        }
        return next;
      });
    });
  }, []);

  return (
    <div className="page settings-hub">
      <header className="page-head">
        <div>
          <h1 className="page-title">Payments & Finance</h1>
          <p className="page-sub">Checkout methods, cash, refunds, invoices, VAT, and settlement from live orders.</p>
        </div>
      </header>

      <div className="settings-overview-grid">
        <article className="settings-stat card">
          <span className="settings-stat-label">30-day revenue</span>
          <strong>{money(kpis.gross)}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Paid orders</span>
          <strong>{kpis.orders}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Open COD</span>
          <strong>{money(kpis.openCod)}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Methods on</span>
          <strong>
            {kpis.methodsOn}/{METHOD_OPTIONS.length}
          </strong>
        </article>
      </div>

      <div className="settings-sections">
        {HUB_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} className="settings-section card">
              <div className="settings-section-head">
                <span className="settings-section-icon" aria-hidden>
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.desc}</p>
                </div>
              </div>
              <ul className="settings-link-list">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="settings-link-row">
                      <span>
                        <strong>{link.label}</strong>
                        <small>{link.desc}</small>
                      </span>
                      <ChevronRight size={16} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function FinanceMethodsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useSettingsForm(
    () => adminApi.checkoutSettings(),
    (body) => adminApi.updateCheckoutSettings(body) as Promise<Awaited<ReturnType<typeof adminApi.checkoutSettings>>>,
    (f) => ({ ...f }),
  );
  const [stats, setStats] = useState<Array<{ method: string; orders_count: number; total: number }>>([]);
  const [tab, setTab] = useState("At delivery");
  const [walletData, setWalletData] = useState<IntegrationSettings | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletMsg, setWalletMsg] = useState("");
  const [walletError, setWalletError] = useState("");
  const [appleForm, setAppleForm] = useState({
    apple_pay_merchant_id: "",
    apple_pay_display_name: "Rawabi Shopping",
    apple_pay_domain: "",
    apple_pay_certificate_ref: "",
  });
  const [googleForm, setGoogleForm] = useState({
    google_pay_merchant_id: "",
    google_pay_merchant_name: "Rawabi Shopping",
    google_pay_gateway_merchant_id: "",
    google_pay_environment: "TEST",
  });

  const [railForms, setRailForms] = useState<
    Record<"naps" | "qpay" | "qmp" | "fawran", { merchant_id: string; api_key: string; api_url: string; environment: string; enabled: boolean }>
  >({
    naps: { merchant_id: "", api_key: "", api_url: "", environment: "sandbox", enabled: false },
    qpay: { merchant_id: "", api_key: "", api_url: "", environment: "sandbox", enabled: false },
    qmp: { merchant_id: "", api_key: "", api_url: "", environment: "sandbox", enabled: false },
    fawran: { merchant_id: "", api_key: "", api_url: "", environment: "sandbox", enabled: false },
  });

  useEffect(() => {
    adminApi
      .financeMethods()
      .then((res) => setStats(res.last_30_days ?? []))
      .catch(() => undefined);
  }, []);

  const needsIntegrations =
    Boolean(form?.payment_apple_pay_enabled) ||
    Boolean(form?.payment_google_pay_enabled) ||
    Boolean(form?.payment_naps_enabled) ||
    Boolean(form?.payment_qpay_enabled) ||
    Boolean(form?.payment_qmp_enabled) ||
    Boolean(form?.payment_fawran_enabled);

  useEffect(() => {
    if (!needsIntegrations) return;
    adminApi
      .integrationSettings()
      .then((data) => {
        setWalletData(data);
        setAppleForm({
          apple_pay_merchant_id: data.apple_pay?.merchant_id || "",
          apple_pay_display_name: data.apple_pay?.display_name || "Rawabi Shopping",
          apple_pay_domain: data.apple_pay?.domain || "",
          apple_pay_certificate_ref: data.apple_pay?.certificate_ref || "",
        });
        setGoogleForm({
          google_pay_merchant_id: data.google_pay?.merchant_id || "",
          google_pay_merchant_name: data.google_pay?.merchant_name || "Rawabi Shopping",
          google_pay_gateway_merchant_id: data.google_pay?.gateway_merchant_id || data.qnb_ipay.merchant_id || "",
          google_pay_environment: data.google_pay?.environment || "TEST",
        });
        setRailForms({
          naps: {
            merchant_id: data.naps?.merchant_id || "",
            api_key: "",
            api_url: data.naps?.api_url || "",
            environment: data.naps?.environment || "sandbox",
            enabled: Boolean(data.naps?.enabled),
          },
          qpay: {
            merchant_id: data.qpay?.merchant_id || "",
            api_key: "",
            api_url: data.qpay?.api_url || "",
            environment: data.qpay?.environment || "sandbox",
            enabled: Boolean(data.qpay?.enabled),
          },
          qmp: {
            merchant_id: data.qmp?.merchant_id || "",
            api_key: "",
            api_url: data.qmp?.api_url || "",
            environment: data.qmp?.environment || "sandbox",
            enabled: Boolean(data.qmp?.enabled),
          },
          fawran: {
            merchant_id: data.fawran?.merchant_id || "",
            api_key: "",
            api_url: data.fawran?.api_url || "",
            environment: data.fawran?.environment || "sandbox",
            enabled: Boolean(data.fawran?.enabled),
          },
        });
      })
      .catch(() => undefined);
  }, [needsIntegrations]);

  const groups = [...new Set(METHOD_OPTIONS.map((m) => m.group))];
  const methodTabs = [...groups, "Gateways"];

  function volumeFor(option: (typeof METHOD_OPTIONS)[number]) {
    const keys = new Set(option.stats);
    return stats
      .filter((row) => keys.has(String(row.method ?? "").toLowerCase().replace(/[\s-]+/g, "_")) || keys.has(String(row.method ?? "").toLowerCase()))
      .reduce(
        (acc, row) => ({
          orders: acc.orders + Number(row.orders_count || 0),
          total: acc.total + Number(row.total || 0),
        }),
        { orders: 0, total: 0 },
      );
  }

  async function saveWallet(kind: "apple" | "google") {
    setWalletBusy(true);
    setWalletError("");
    setWalletMsg("");
    try {
      const payload = kind === "apple" ? appleForm : googleForm;
      const data = await adminApi.updateIntegrationSettings(payload);
      setWalletData(data);
      setWalletMsg(kind === "apple" ? "Apple Pay connection saved." : "Google Pay connection saved.");
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Could not save wallet credentials");
    } finally {
      setWalletBusy(false);
    }
  }

  async function saveRail(code: "naps" | "qpay" | "qmp" | "fawran") {
    setWalletBusy(true);
    setWalletError("");
    setWalletMsg("");
    try {
      const row = railForms[code];
      const payload: Record<string, unknown> = {
        [`${code}_enabled`]: true,
        [`${code}_merchant_id`]: row.merchant_id,
        [`${code}_api_url`]: row.api_url,
        [`${code}_environment`]: row.environment,
      };
      if (row.api_key.trim()) payload[`${code}_api_key`] = row.api_key.trim();
      const data = await adminApi.updateIntegrationSettings(payload);
      setWalletData(data);
      setRailForms((prev) => ({
        ...prev,
        [code]: { ...prev[code], api_key: "", enabled: true },
      }));
      setWalletMsg(`${code.toUpperCase()} connection saved.`);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Could not save rail credentials");
    } finally {
      setWalletBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Payment methods</h1>
          <p className="page-sub">
            Checkout toggles by category. Qatar rails (NAPS, QPay, QMP, Fawran) sit behind a gateway abstraction — wire PSP
            credentials under each method or Gateways.
          </p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-secondary" to="/finance/gateway-logs">
            Gateway logs
          </Link>
          <Link className="btn btn-secondary" to="/settings/integrations?tab=payments">
            All integrations
          </Link>
        </div>
      </header>
      <div className="tabs settings-category-tabs" role="tablist" aria-label="Payment method categories">
        {methodTabs.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "active" : undefined}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Gateways" ? (
        <IntegrationsEditorForm tabs={[{ id: "payments", label: "Payments" }]} defaultTab="payments" compact />
      ) : (
        <>
          {error ? <div className="alert alert-error">{error}</div> : null}
          {msg ? <div className="alert alert-success">{msg}</div> : null}
          {walletError ? <div className="alert alert-error">{walletError}</div> : null}
          {walletMsg ? <div className="alert alert-success">{walletMsg}</div> : null}
          {!form ? (
            <LoadingCard />
          ) : (
            <form className="settings-form" onSubmit={onSubmit}>
              {groups
                .filter((group) => group === tab)
                .map((group) => (
                  <section key={group} className="card finance-method-group">
                    <header className="finance-method-group-head">
                      <h2>{group}</h2>
                    </header>
                    <div className="finance-method-list">
                      {METHOD_OPTIONS.filter((m) => m.group === group).map((option) => {
                        const vol = volumeFor(option);
                        const enabled = Boolean(form[option.key]);
                        return (
                          <div key={option.key} className="finance-method-block">
                            <div className="finance-method-row">
                              <SettingsToggle
                                label={option.label}
                                hint={option.hint}
                                checked={enabled}
                                onChange={(v) => setForm({ ...form, [option.key]: v })}
                              />
                              <div className="finance-method-vol">
                                <strong>{vol.orders}</strong>
                                <span>{vol.orders ? money(vol.total) : "No volume"}</span>
                              </div>
                            </div>

                            {option.key === "payment_apple_pay_enabled" && enabled ? (
                              <div className="finance-wallet-setup">
                                <div className="finance-wallet-setup-head">
                                  <strong>Connect Apple Pay</strong>
                                  <span className={walletData?.apple_pay?.configured ? "ok" : "warn"}>
                                    {walletData?.apple_pay?.configured ? "Configured" : "Credentials needed"}
                                  </span>
                                </div>
                                {!walletData?.qnb_ipay.configured ? (
                                  <p className="pf-hint">
                                    QNB iPay is not fully configured. Open{" "}
                                    <button type="button" className="linkish" onClick={() => setTab("Gateways")}>
                                      Gateways
                                    </button>{" "}
                                    first — Apple Pay settles through QNB.
                                  </p>
                                ) : null}
                                <ol className="finance-wallet-steps">
                                  <li>Ask QNB to enable Apple Pay on merchant {walletData?.qnb_ipay.merchant_id || "…"}.</li>
                                  <li>Create an Apple Merchant ID in Apple Developer.</li>
                                  <li>Verify the checkout domain and register any certificate QNB requires.</li>
                                  <li>Enter credentials below, save, then test on Safari / iPhone.</li>
                                </ol>
                                <div className="settings-fields finance-wallet-fields">
                                  <label className="pf-field">
                                    <span className="pf-label">Apple Merchant ID</span>
                                    <input
                                      value={appleForm.apple_pay_merchant_id}
                                      onChange={(e) => setAppleForm({ ...appleForm, apple_pay_merchant_id: e.target.value })}
                                      placeholder="merchant.com.rawabi"
                                      spellCheck={false}
                                    />
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">Display name</span>
                                    <input
                                      value={appleForm.apple_pay_display_name}
                                      onChange={(e) => setAppleForm({ ...appleForm, apple_pay_display_name: e.target.value })}
                                    />
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">Verified domain</span>
                                    <input
                                      value={appleForm.apple_pay_domain}
                                      onChange={(e) => setAppleForm({ ...appleForm, apple_pay_domain: e.target.value })}
                                      placeholder="shop.rawabi.com"
                                      spellCheck={false}
                                    />
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">Certificate / profile ref</span>
                                    <input
                                      value={appleForm.apple_pay_certificate_ref}
                                      onChange={(e) => setAppleForm({ ...appleForm, apple_pay_certificate_ref: e.target.value })}
                                      spellCheck={false}
                                    />
                                  </label>
                                </div>
                                <div className="finance-wallet-actions">
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={walletBusy}
                                    onClick={() => void saveWallet("apple")}
                                  >
                                    {walletBusy ? "Saving…" : "Save Apple Pay connection"}
                                  </button>
                                  <button type="button" className="btn btn-secondary" onClick={() => setTab("Gateways")}>
                                    Open Gateways
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {option.key === "payment_google_pay_enabled" && enabled ? (
                              <div className="finance-wallet-setup">
                                <div className="finance-wallet-setup-head">
                                  <strong>Connect Google Pay</strong>
                                  <span className={walletData?.google_pay?.configured ? "ok" : "warn"}>
                                    {walletData?.google_pay?.configured ? "Configured" : "Credentials needed"}
                                  </span>
                                </div>
                                {!walletData?.qnb_ipay.configured ? (
                                  <p className="pf-hint">
                                    QNB iPay is not fully configured. Open{" "}
                                    <button type="button" className="linkish" onClick={() => setTab("Gateways")}>
                                      Gateways
                                    </button>{" "}
                                    first — Google Pay settles through QNB.
                                  </p>
                                ) : null}
                                <ol className="finance-wallet-steps">
                                  <li>Enable Google Pay with QNB for your card merchant.</li>
                                  <li>Create a Google Pay Business Console merchant ID.</li>
                                  <li>Set gateway merchant ID (usually the QNB merchant ID).</li>
                                  <li>Stay on TEST until QNB confirms production, then switch environment.</li>
                                </ol>
                                <div className="settings-fields finance-wallet-fields">
                                  <label className="pf-field">
                                    <span className="pf-label">Google Merchant ID</span>
                                    <input
                                      value={googleForm.google_pay_merchant_id}
                                      onChange={(e) => setGoogleForm({ ...googleForm, google_pay_merchant_id: e.target.value })}
                                      spellCheck={false}
                                    />
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">Merchant name</span>
                                    <input
                                      value={googleForm.google_pay_merchant_name}
                                      onChange={(e) => setGoogleForm({ ...googleForm, google_pay_merchant_name: e.target.value })}
                                    />
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">Gateway merchant ID</span>
                                    <input
                                      value={googleForm.google_pay_gateway_merchant_id}
                                      onChange={(e) =>
                                        setGoogleForm({ ...googleForm, google_pay_gateway_merchant_id: e.target.value })
                                      }
                                      placeholder={walletData?.qnb_ipay.merchant_id || "QNB merchant ID"}
                                      spellCheck={false}
                                    />
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">Environment</span>
                                    <select
                                      value={googleForm.google_pay_environment}
                                      onChange={(e) => setGoogleForm({ ...googleForm, google_pay_environment: e.target.value })}
                                    >
                                      <option value="TEST">TEST</option>
                                      <option value="PRODUCTION">PRODUCTION</option>
                                    </select>
                                  </label>
                                </div>
                                <div className="finance-wallet-actions">
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={walletBusy}
                                    onClick={() => void saveWallet("google")}
                                  >
                                    {walletBusy ? "Saving…" : "Save Google Pay connection"}
                                  </button>
                                  <button type="button" className="btn btn-secondary" onClick={() => setTab("Gateways")}>
                                    Open Gateways
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {option.rail && enabled ? (
                              <div className="finance-wallet-setup">
                                <div className="finance-wallet-setup-head">
                                  <strong>Connect {option.label}</strong>
                                  <span className={walletData?.[option.rail]?.configured ? "ok" : "warn"}>
                                    {walletData?.[option.rail]?.configured ? "Configured" : "Credentials needed"}
                                  </span>
                                </div>
                                <p className="pf-hint">
                                  Adapter is registered in the payment abstraction layer. Checkout will expose this rail once
                                  credentials are saved and the PSP adapter is live.
                                </p>
                                <div className="settings-fields finance-wallet-fields">
                                  <label className="pf-field">
                                    <span className="pf-label">Merchant ID</span>
                                    <input
                                      value={railForms[option.rail].merchant_id}
                                      onChange={(e) =>
                                        setRailForms({
                                          ...railForms,
                                          [option.rail!]: { ...railForms[option.rail!], merchant_id: e.target.value },
                                        })
                                      }
                                      spellCheck={false}
                                    />
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">Environment</span>
                                    <select
                                      value={railForms[option.rail].environment}
                                      onChange={(e) =>
                                        setRailForms({
                                          ...railForms,
                                          [option.rail!]: { ...railForms[option.rail!], environment: e.target.value },
                                        })
                                      }
                                    >
                                      <option value="sandbox">sandbox</option>
                                      <option value="production">production</option>
                                    </select>
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">API key</span>
                                    <input
                                      type="password"
                                      value={railForms[option.rail].api_key}
                                      onChange={(e) =>
                                        setRailForms({
                                          ...railForms,
                                          [option.rail!]: { ...railForms[option.rail!], api_key: e.target.value },
                                        })
                                      }
                                      placeholder={walletData?.[option.rail]?.has_api_key ? "Leave blank to keep current" : ""}
                                      autoComplete="new-password"
                                    />
                                  </label>
                                  <label className="pf-field">
                                    <span className="pf-label">API URL</span>
                                    <input
                                      value={railForms[option.rail].api_url}
                                      onChange={(e) =>
                                        setRailForms({
                                          ...railForms,
                                          [option.rail!]: { ...railForms[option.rail!], api_url: e.target.value },
                                        })
                                      }
                                      spellCheck={false}
                                    />
                                  </label>
                                </div>
                                <div className="finance-wallet-actions">
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={walletBusy}
                                    onClick={() => void saveRail(option.rail!)}
                                  >
                                    {walletBusy ? "Saving…" : `Save ${option.label} connection`}
                                  </button>
                                  <button type="button" className="btn btn-secondary" onClick={() => setTab("Gateways")}>
                                    Open Gateways
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              <div className="settings-form-actions">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : "Save methods"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function FinanceGatewayLogsPage() {
  const range = useRange();
  const [status, setStatus] = useState("");
  const [data, setData] = useState<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    per_page: number;
  } | null>(null);
  const [error, setError] = useState("");

  async function run(page = 1) {
    setError("");
    try {
      setData(
        await adminApi.financeGatewayLogs({
          q: range.q || undefined,
          status: status || undefined,
          page,
          per_page: 25,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gateway logs");
    }
  }

  useEffect(() => {
    void run();
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Gateway logs</h1>
          <p className="page-sub">Staging rows from online payment attempts (`ec_onlinetemp`) — auth failures, accepts, rejects.</p>
        </div>
        <Link className="btn btn-secondary" to="/finance/methods">
          Payment methods
        </Link>
      </header>
      <DateFilters
        from={range.from}
        to={range.to}
        setFrom={range.setFrom}
        setTo={range.setTo}
        q={range.q}
        setQ={range.setQ}
        onRun={() => void run(1)}
        extra={
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
            <option value="pending">pending</option>
          </select>
        }
      />
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Reference</th>
              <th>User</th>
              <th>Store</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={String(row.temp_id)}>
                <td>{String(row.temp_id ?? "—")}</td>
                <td className="mono">{String(row.temp_reference ?? "—")}</td>
                <td>{String(row.temp_userid ?? "—")}</td>
                <td>{String(row.temp_storeid ?? "—")}</td>
                <td>{row.temp_amount != null ? money(row.temp_amount) : "—"}</td>
                <td>{String(row.temp_paystatus ?? "—")}</td>
                <td className="muted" style={{ maxWidth: 280 }}>
                  {String(row.temp_payresponse ?? row.temp_paydetails ?? "—").slice(0, 120)}
                </td>
              </tr>
            ))}
            {!data?.items?.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No gateway log rows
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {data && data.total > data.per_page ? (
        <div className="toolbar">
          <button type="button" className="btn" disabled={data.page <= 1} onClick={() => void run(data.page - 1)}>
            Prev
          </button>
          <span className="muted">
            Page {data.page} · {data.total} rows
          </span>
          <button
            type="button"
            className="btn"
            disabled={data.page * data.per_page >= data.total}
            onClick={() => void run(data.page + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function useFinanceList(load: (params: Record<string, string | number | undefined>) => Promise<FinanceOrderList>) {
  const range = useRange();
  const [data, setData] = useState<FinanceOrderList | null>(null);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState("");

  async function run() {
    setError("");
    try {
      setData(
        await load({
          date_from: range.from,
          date_to: range.to,
          q: range.q || undefined,
          payment: payment || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void run();
  }, []);

  return { ...range, data, error, payment, setPayment, run };
}

export function FinanceTransactionsPage() {
  const list = useFinanceList((p) => adminApi.financeTransactions(p));
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-sub">Orders with a payment method and payable amount.</p>
        </div>
      </header>
      <DateFilters {...list} onRun={() => void list.run()} extra={
        <select value={list.payment} onChange={(e) => list.setPayment(e.target.value)}>
          <option value="">All methods</option>
          <option value="cod">COD</option>
          <option value="ccod">Card on delivery</option>
          <option value="pickup">Pay at store</option>
          <option value="online">QNB card</option>
          <option value="apple_pay">Apple Pay</option>
          <option value="google_pay">Google Pay</option>
          <option value="naps">NAPS</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="store_credit">Store credit</option>
        </select>
      } />
      {list.error ? <p className="error">{list.error}</p> : null}
      <OrderTable rows={list.data?.items ?? []} />
    </div>
  );
}

export function FinanceCodPage() {
  const range = useRange();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.financeCod>> | null>(null);
  const [error, setError] = useState("");
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);

  async function run() {
    setError("");
    try {
      const res = await adminApi.financeCod({ date_from: range.from, date_to: range.to, q: range.q || undefined });
      setData(res);
      setAuto(Boolean(res.settings?.auto_confirm_cod));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void run();
  }, []);

  async function saveAuto(next: boolean) {
    setAuto(next);
    setBusy(true);
    try {
      await adminApi.updateFinanceCod({ auto_confirm_cod: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function collect(row: FinanceOrderRow, action: "collect" | "uncollect") {
    setBusy(true);
    try {
      await adminApi.updateFinanceCod({ order_id: row.order_id, action });
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">COD management</h1>
          <p className="page-sub">
            Open cash to collect: {money(data?.open_total)}. Mark collected after the driver returns cash.
          </p>
        </div>
      </header>
      <div className="card" style={{ marginBottom: 12 }}>
        <SettingsToggle
          label="Auto-confirm COD orders"
          hint="COD orders move to Processing without a manual approval queue."
          checked={auto}
          onChange={(v) => void saveAuto(v)}
        />
      </div>
      <DateFilters {...range} onRun={() => void run()} />
      {error ? <p className="error">{error}</p> : null}
      <OrderTable
        rows={data?.items ?? []}
        extraHead={<th>Cash</th>}
        extraCell={(row) => (
          <td>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void collect(row, row.order_managed ? "uncollect" : "collect")}
            >
              {row.order_managed ? "Collected" : "Mark collected"}
            </button>
          </td>
        )}
      />
    </div>
  );
}

export function FinanceRefundsPage() {
  const range = useRange();
  const [data, setData] = useState<FinanceOrderList | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setError("");
    try {
      setData(await adminApi.financeRefunds({ date_from: range.from, date_to: range.to, q: range.q || undefined }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void run();
  }, []);

  async function mark(row: FinanceOrderRow, refund_status: 0 | 1) {
    setBusy(true);
    try {
      const existingRefund = Number(row.order_refund || row.refunded_amount || 0);
      const full = Number(row.order_payable || 0);
      let amount = refund_status === 0 ? 0 : existingRefund > 0 ? existingRefund : full;
      if (refund_status === 1) {
        const typed = window.prompt(
          `Refund amount (QAR). Leave blank for full ${full.toFixed(2)}. Suggested from order_refund: ${existingRefund.toFixed(2)}`,
          String(amount || full),
        );
        if (typed === null) {
          setBusy(false);
          return;
        }
        const parsed = Number(typed);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setError("Invalid refund amount");
          setBusy(false);
          return;
        }
        amount = parsed;
      }
      await adminApi.updateFinanceRefund(row.order_id, {
        refund_status,
        refunded_amount: amount,
      });
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Refund management</h1>
          <p className="page-sub">Cancelled and refund-flagged orders. Mark when money has been returned.</p>
        </div>
      </header>
      <DateFilters {...range} onRun={() => void run()} />
      {error ? <p className="error">{error}</p> : null}
      <OrderTable
        rows={data?.items ?? []}
        extraHead={<th>Refund</th>}
        extraCell={(row) => (
          <td>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void mark(row, row.refund_status ? 0 : 1)}
            >
              {row.refund_status ? `Refunded ${money(row.refunded_amount)}` : "Mark refunded"}
            </button>
          </td>
        )}
      />
    </div>
  );
}

export function FinanceInvoicesPage() {
  const list = useFinanceList((p) => adminApi.financeInvoices(p));
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-sub">Open the PDF preview or the order record.</p>
        </div>
      </header>
      <DateFilters {...list} onRun={() => void list.run()} />
      {list.error ? <p className="error">{list.error}</p> : null}
      <OrderTable
        rows={list.data?.items ?? []}
        extraHead={<th>Document</th>}
        extraCell={(row) => (
          <td>
            <Link className="btn btn-secondary" to={`/invoice/${encodeURIComponent(row.order_refno)}`}>
              Preview
            </Link>
          </td>
        )}
      />
    </div>
  );
}

export function FinanceTaxPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useSettingsForm(
    () => adminApi.taxSettings(),
    (body) => adminApi.updateTaxSettings(body) as Promise<Awaited<ReturnType<typeof adminApi.taxSettings>>>,
    (f) => ({ ...f }),
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Tax / VAT</h1>
          <p className="page-sub">Qatar grocery is typically 0% VAT. Enable a rate here only if finance requires it on reports.</p>
        </div>
      </header>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-toggle-list">
            <SettingsToggle
              label="Apply VAT on revenue reports"
              hint="Estimates VAT from payable totals. Order lines stay as stored."
              checked={form.vat_enabled}
              onChange={(v) => setForm({ ...form, vat_enabled: v })}
            />
            <SettingsToggle
              label="Prices already include VAT"
              hint="When on, VAT is backed out of gross. When off, VAT is added on top."
              checked={form.prices_include_vat}
              onChange={(v) => setForm({ ...form, prices_include_vat: v })}
            />
          </div>
          <label className="field">
            VAT rate (%)
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.vat_rate}
              onChange={(e) => setForm({ ...form, vat_rate: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Label
            <input value={form.vat_label} onChange={(e) => setForm({ ...form, vat_label: e.target.value })} />
          </label>
          <label className="field">
            Tax registration number (TRN)
            <input value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
          </label>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save tax settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function FinanceRevenuePage() {
  const { from, to, setFrom, setTo } = useRange();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.financeRevenue>> | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    try {
      setData(await adminApi.financeRevenue({ date_from: from, date_to: to }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void run();
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Revenue reports</h1>
          <p className="page-sub">Live order statuses only (excludes cancelled).</p>
        </div>
      </header>
      <DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} onRun={() => void run()} />
      {error ? <p className="error">{error}</p> : null}
      <div className="card-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <Wallet size={16} />
          <strong>{money(data?.summary.gross)}</strong>
          <span className="muted">{data?.summary.orders_count ?? 0} orders</span>
        </div>
        <div className="stat-card">
          <Receipt size={16} />
          <strong>{money(data?.summary.discount)}</strong>
          <span className="muted">Discounts</span>
        </div>
        <div className="stat-card">
          <CreditCard size={16} />
          <strong>{money(data?.summary.estimated_vat)}</strong>
          <span className="muted">Estimated VAT</span>
        </div>
      </div>
      <div className="card table-wrap" style={{ marginBottom: 16 }}>
        <h3>By method</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Method</th>
              <th>Orders</th>
              <th>Gross</th>
            </tr>
          </thead>
          <tbody>
            {(data?.by_method ?? []).map((row) => (
              <tr key={String(row.method)}>
                <td>{methodLabel(String(row.method))}</td>
                <td>{String(row.orders_count)}</td>
                <td>{money(row.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card table-wrap">
        <h3>By day</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Day</th>
              <th>Orders</th>
              <th>Gross</th>
              <th>Discount</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {(data?.by_day ?? []).map((row) => (
              <tr key={String(row.day)}>
                <td>{String(row.day)}</td>
                <td>{String(row.orders_count)}</td>
                <td>{money(row.gross)}</td>
                <td>{money(row.discount)}</td>
                <td>{money(row.delivery_fee)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FinanceSettlementsPage() {
  const { from, to, setFrom, setTo } = useRange();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.financeSettlements>> | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    try {
      setData(await adminApi.financeSettlements({ date_from: from, date_to: to }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void run();
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Settlement reports</h1>
          <p className="page-sub">Live orders by store and method. Settled = delivered; open = still in the warehouse or on the road.</p>
        </div>
      </header>
      <DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} onRun={() => void run()} />
      {error ? <p className="error">{error}</p> : null}
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Store</th>
              <th>Method</th>
              <th>Status</th>
              <th>Orders</th>
              <th>Collected</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row, i) => (
              <tr key={`${row.order_storeid}-${row.method}-${row.order_status}-${i}`}>
                <td>{String(row.ec_store_name ?? row.order_storeid)}</td>
                <td>{methodLabel(String(row.method))}</td>
                <td>{String(row.order_status ?? "—")}</td>
                <td>{String(row.orders_count)}</td>
                <td>{money(row.collected)}</td>
              </tr>
            ))}
            {!(data?.items ?? []).length ? (
              <tr>
                <td colSpan={5} className="muted">
                  No live orders in this window.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
