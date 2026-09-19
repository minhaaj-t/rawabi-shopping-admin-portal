import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Mail, MapPin, MessageCircle, Package, ShoppingCart, User, WhatsApp, X } from "../lib/icons";
import { adminApi, type SupportThreadItem } from "../lib/api";

type CartLine = {
  product_id: number;
  product_name: string;
  quantity: number;
  subtotal: number;
};

type OrderLine = {
  order_id: number;
  order_refno: string | null;
  order_status: string;
  order_payable: number;
};

type AddressLine = {
  address_id: number;
  address_name?: string;
  location?: string;
  address?: string;
  house_building?: string;
  is_default?: number;
};

type Props = {
  thread: SupportThreadItem;
  siblingThreads: SupportThreadItem[];
  onClose?: () => void;
  onSendWhatsApp?: () => void;
  onSendEmail?: () => void;
};

function money(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

function issueTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function SupportCustomerContext({
  thread,
  siblingThreads,
  onClose,
  onSendWhatsApp,
  onSendEmail,
}: Props) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [lastOrder, setLastOrder] = useState<OrderLine | null>(null);
  const [address, setAddress] = useState<AddressLine | null>(null);
  const [history, setHistory] = useState<SupportThreadItem[]>(siblingThreads);

  useEffect(() => {
    setHistory(siblingThreads);
    if (thread.user_id <= 0) {
      setCart([]);
      setCartTotal(0);
      setStats(null);
      setLastOrder(null);
      setAddress(null);
      return;
    }

    let cancelled = false;
    void adminApi
      .customer(thread.user_id)
      .then((res) => {
        if (cancelled) return;
        const lines = (res.cart ?? []) as CartLine[];
        setCart(lines.slice(0, 6));
        setCartTotal(Number(res.stats?.cart_total ?? lines.reduce((s, l) => s + Number(l.subtotal || 0), 0)));
        setStats(res.stats);
        const orders = (res.orders ?? []) as OrderLine[];
        setLastOrder(orders[0] ?? null);
        const addresses = (res.addresses ?? []) as AddressLine[];
        setAddress(addresses.find((a) => Number(a.is_default) === 1) ?? addresses[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setCart([]);
          setStats(null);
          setLastOrder(null);
          setAddress(null);
        }
      });

    void adminApi
      .supportThreads({ user_id: thread.user_id, per_page: 12 })
      .then((res) => {
        if (!cancelled) setHistory(res.items.filter((t) => t.id !== thread.id));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [thread.id, thread.user_id]);

  useEffect(() => {
    if (thread.user_id <= 0) setHistory(siblingThreads);
  }, [thread.user_id, siblingThreads]);

  const name = thread.customer_name?.trim() || "Guest";
  const lastIssue = thread.preview || thread.subject || "No messages yet";

  return (
    <aside className="wa-context" aria-label="Customer details">
      {onClose ? (
        <header className="wa-ctx-toolbar">
          <strong>Customer details</strong>
          <button type="button" className="wa-icon-btn wa-ctx-close" aria-label="Close details" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
      ) : null}
      <section className="wa-ctx-card">
        <header>
          <User size={14} aria-hidden />
          <h3>Customer</h3>
        </header>
        <strong>{name}</strong>
        <p>{thread.customer_phone || "No phone"}</p>
        <p>{thread.customer_email || "No email"}</p>
        {stats ? (
          <p className="wa-ctx-meta">
            {Number(stats.order_count || 0)} orders · {money(stats.total_spent)} spent
          </p>
        ) : null}
        {lastOrder ? (
          <p className="wa-ctx-meta">
            Last order{" "}
            <Link to={`/orders/${lastOrder.order_id}`}>{lastOrder.order_refno || `#${lastOrder.order_id}`}</Link>
            {` · ${lastOrder.order_status} · ${money(lastOrder.order_payable)}`}
          </p>
        ) : null}
        {address ? (
          <p className="wa-ctx-meta">
            <MapPin size={12} aria-hidden />{" "}
            {[address.address_name, address.house_building, address.location || address.address]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {thread.user_id > 0 ? (
          <Link className="wa-ctx-link" to={`/customers/${thread.user_id}`}>
            Open profile
          </Link>
        ) : (
          <p className="wa-ctx-meta">Guest chat — no customer account linked.</p>
        )}
      </section>

      {(onSendWhatsApp || onSendEmail) ? (
        <section className="wa-ctx-card wa-ctx-reach">
          <header>
            <MessageCircle size={14} aria-hidden />
            <h3>Reach out</h3>
          </header>
          <p className="wa-ctx-meta">Send an external message for this conversation.</p>
          <div className="wa-ctx-actions">
            {onSendWhatsApp ? (
              <button
                type="button"
                className="wa-ctx-action-btn wa-ctx-whatsapp"
                disabled={!thread.customer_phone}
                title={thread.customer_phone ? undefined : "No phone number on this chat"}
                onClick={onSendWhatsApp}
              >
                <WhatsApp size={18} aria-hidden />
                Send WhatsApp
              </button>
            ) : null}
            {onSendEmail ? (
              <button
                type="button"
                className="wa-ctx-action-btn wa-ctx-email"
                disabled={!thread.customer_email}
                title={thread.customer_email ? undefined : "No email on this chat"}
                onClick={onSendEmail}
              >
                <Mail size={15} aria-hidden />
                Send email
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="wa-ctx-card">
        <header>
          <ShoppingCart size={14} aria-hidden />
          <h3>Cart</h3>
        </header>
        {thread.user_id <= 0 ? (
          <p className="wa-ctx-meta">Cart is available after the customer is linked.</p>
        ) : cart.length ? (
          <>
            <ul className="wa-ctx-list">
              {cart.map((line, i) => (
                <li key={`${line.product_id}-${i}`}>
                  <span>
                    {line.product_name || `Item #${line.product_id}`}
                    <em> ×{line.quantity || 1}</em>
                  </span>
                  <b>{money(line.subtotal)}</b>
                </li>
              ))}
            </ul>
            <p className="wa-ctx-total">
              {cart.length} items · {money(cartTotal)}
            </p>
            <Link className="wa-ctx-link" to={`/customers/${thread.user_id}`}>
              View cart
            </Link>
          </>
        ) : (
          <p className="wa-ctx-meta">Cart is empty.</p>
        )}
      </section>

      <section className="wa-ctx-card">
        <header>
          <Package size={14} aria-hidden />
          <h3>This issue</h3>
        </header>
        <strong>{thread.subject || "Support request"}</strong>
        <p className="wa-ctx-meta">
          {thread.status} · {thread.priority} · {thread.channel.replace("_", " ")}
          {thread.order_id ? (
            <>
              {" · "}
              <Link to={`/orders/${thread.order_id}`}>{thread.order_refno || `#${thread.order_id}`}</Link>
            </>
          ) : null}
        </p>
        <p className="wa-ctx-preview">{lastIssue}</p>
        <p className="wa-ctx-meta">{issueTime(thread.last_message_at)}</p>
      </section>

      <section className="wa-ctx-card">
        <header>
          <Clock size={14} aria-hidden />
          <h3>Previous issues</h3>
        </header>
        {history.length ? (
          <ul className="wa-ctx-issues">
            {history.map((row) => (
              <li key={row.id}>
                <Link to={`/support/chats/${row.id}`}>
                  <strong>{row.subject || "Support request"}</strong>
                  <span>
                    {row.status}
                    {row.preview ? ` · ${row.preview}` : ""}
                  </span>
                  <time>{issueTime(row.last_message_at)}</time>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="wa-ctx-meta">No earlier tickets for this customer.</p>
        )}
      </section>
    </aside>
  );
}
