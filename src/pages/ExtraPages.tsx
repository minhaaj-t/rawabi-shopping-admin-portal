import { adminApi } from "../lib/api";
import { ResourceListPage } from "../components/ResourceListPage";

export function OfferProductsPage() {
  return (
    <ResourceListPage
      title="Offer Products"
      load={async (q) => {
        const res = await adminApi.products({ q, offers: 1, per_page: 40 });
        return { items: res.items as unknown as Array<Record<string, unknown>>, total: res.total };
      }}
      columns={[
        { key: "product_id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "sku", label: "SKU" },
        { key: "price", label: "Price" },
        { key: "offer_price", label: "Offer" },
        { key: "stock", label: "Stock" },
      ]}
    />
  );
}

export function DraftProductsPage() {
  return (
    <ResourceListPage
      title="Draft List"
      load={async (q) => {
        const res = await adminApi.products({ q, drafts: 1, per_page: 40 });
        return { items: res.items as unknown as Array<Record<string, unknown>>, total: res.total };
      }}
      columns={[
        { key: "product_id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "sku", label: "SKU" },
        {
          key: "act",
          label: "",
          render: (r) => (
            <button
              type="button"
              className="btn btn-green"
              onClick={() =>
                void adminApi.activateDraft(Number(r.product_id)).then(() => window.location.reload())
              }
            >
              Activate
            </button>
          ),
        },
      ]}
    />
  );
}
