import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api/client";

const DEFAULT_OPTIONS = {
  size: "regular",
  sweetness: "50%",
  ice: "less",
  toppings: [],
};

const STATUS_LABELS = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatPrice(value) {
  return `¥${value}`;
}

function OrderStatus({ order }) {
  if (!order) return null;

  return (
    <section className="order-status" aria-label="Order status">
      <div>
        <p className="section-kicker">Order status</p>
        <h2>Order {order.lookup_code}</h2>
      </div>
      <span className={`status-badge status-${order.status}`}>
        {STATUS_LABELS[order.status] || order.status}
      </span>
      <dl>
        <div>
          <dt>Name</dt>
          <dd>{order.customer_name}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

function ProductCustomizer({ product, onAdd, onClose }) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [quantity, setQuantity] = useState(1);

  const toggleTopping = (topping) => {
    setOptions((current) => ({
      ...current,
      toppings: current.toppings.includes(topping)
        ? current.toppings.filter((item) => item !== topping)
        : [...current.toppings, topping],
    }));
  };

  const addToCart = () => {
    onAdd({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: Number(quantity),
      options,
    });
  };

  return (
    <div className="customizer-backdrop">
      <section
        className="customizer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customizer-title"
      >
        <div className="customizer-heading">
          <div>
            <p className="section-kicker">Customize drink</p>
            <h2 id="customizer-title">{product.name}</h2>
          </div>
          <button className="text-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="customizer-grid">
          <label>
            Cup size
            <select
              value={options.size}
              onChange={(event) => setOptions({ ...options, size: event.target.value })}
            >
              <option value="regular">Regular</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label>
            Sweetness
            <select
              value={options.sweetness}
              onChange={(event) => setOptions({ ...options, sweetness: event.target.value })}
            >
              <option value="0%">0%</option>
              <option value="25%">25%</option>
              <option value="50%">50%</option>
              <option value="75%">75%</option>
              <option value="100%">100%</option>
            </select>
          </label>
          <label>
            Ice level
            <select
              value={options.ice}
              onChange={(event) => setOptions({ ...options, ice: event.target.value })}
            >
              <option value="none">No ice</option>
              <option value="less">Less ice</option>
              <option value="regular">Regular ice</option>
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              max="20"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
        </div>

        <fieldset className="topping-options">
          <legend>Toppings</legend>
          {["Pearls", "Coconut Jelly"].map((topping) => (
            <label key={topping}>
              <input
                type="checkbox"
                checked={options.toppings.includes(topping)}
                onChange={() => toggleTopping(topping)}
              />
              {topping}
            </label>
          ))}
        </fieldset>

        <div className="customizer-actions">
          <strong>{formatPrice(product.price * (Number(quantity) || 0))}</strong>
          <button
            type="button"
            disabled={!Number.isInteger(Number(quantity)) || Number(quantity) < 1}
            onClick={addToCart}
          >
            Add to cart
          </button>
        </div>
      </section>
    </div>
  );
}

export default function MilkTeaPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [lookupCode, setLookupCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/api/milk-tea/products")
      .then((data) => {
        if (active) setProducts(data.products);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category))],
    [products],
  );
  const visibleProducts =
    category === "All"
      ? products
      : products.filter((product) => product.category === category);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (item) => {
    setCart((current) => [...current, item]);
    setSelectedProduct(null);
    setError("");
  };

  const placeOrder = async () => {
    setSubmitting(true);
    setError("");
    try {
      const data = await apiFetch("/api/milk-tea/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_name: customerName.trim(),
          items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            options: item.options,
          })),
        }),
      });
      setOrder(data.order);
      setCart([]);
      setCustomerName("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const findOrder = async (event) => {
    event.preventDefault();
    const code = lookupCode.trim().toUpperCase();
    if (!code) return;

    setLookingUp(true);
    setError("");
    try {
      const data = await apiFetch(`/api/milk-tea/orders/${encodeURIComponent(code)}`);
      setOrder(data.order);
      setLookupCode(code);
    } catch (requestError) {
      setOrder(null);
      setError(requestError.message);
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <main className="shell milk-tea-page">
      <header className="milk-tea-intro">
        <p className="section-kicker">Sanpingfang drinks</p>
        <h1>Sanpingfang Milk Tea</h1>
        <p className="lede">Choose a drink, make it yours, and follow the order from one page.</p>
        <img
          className="milk-tea-hero-image"
          src="/images/milk-tea-menu.png"
          alt="Brown sugar milk tea, jasmine fruit tea, and matcha cheese tea"
        />
      </header>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      <section className="status-lookup" aria-labelledby="lookup-title">
        <div>
          <p className="section-kicker">Already ordered?</p>
          <h2 id="lookup-title">Track an order</h2>
        </div>
        <form onSubmit={findOrder}>
          <label>
            Order code
            <input
              value={lookupCode}
              onChange={(event) => setLookupCode(event.target.value)}
              autoComplete="off"
              placeholder="ABCD1234"
            />
          </label>
          <button type="submit" disabled={!lookupCode.trim() || lookingUp}>
            {lookingUp ? "Finding..." : "Find order"}
          </button>
        </form>
      </section>

      <OrderStatus order={order} />

      <div className="shop-toolbar">
        <div>
          <p className="section-kicker">Fresh menu</p>
          <h2>Choose your drink</h2>
        </div>
        {products.length > 0 && (
          <div className="category-tabs" aria-label="Product categories">
            {categories.map((item) => (
              <button
                type="button"
                className={category === item ? "active" : ""}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="shop-layout">
        <div className="product-list" aria-live="polite">
          {loading && <p className="empty-state">Loading menu...</p>}
          {!loading && !error && products.length === 0 && (
            <p className="empty-state">No drinks are available right now.</p>
          )}
          {!loading &&
            visibleProducts.map((product, index) => (
              <article
                className="product-card"
                aria-labelledby={`product-${product.id}`}
                key={product.id}
              >
                <div
                  className={`drink-visual drink-visual-${(index % 3) + 1}`}
                  aria-hidden="true"
                />
                <div className="product-card-body">
                  <p className="section-kicker">{product.category}</p>
                  <h3 id={`product-${product.id}`}>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="product-card-actions">
                    <strong>{formatPrice(product.price)}</strong>
                    <button type="button" onClick={() => setSelectedProduct(product)}>
                      Customize
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>

        <aside className="cart-panel">
          <div className="cart-heading">
            <div>
              <p className="section-kicker">Your order</p>
              <h2>Cart</h2>
            </div>
            <span>{cart.length}</span>
          </div>

          {cart.length === 0 ? (
            <p className="cart-empty">No items yet.</p>
          ) : (
            <ul className="cart-items">
              {cart.map((item, index) => (
                <li key={`${item.product_id}-${index}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.options.size}, {item.options.sweetness}, {item.options.ice}
                    </span>
                    <span>Quantity {item.quantity}</span>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="cart-total">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <label>
            Customer name
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              autoComplete="name"
            />
          </label>
          <button
            className="primary-action"
            type="button"
            disabled={!cart.length || !customerName.trim() || submitting}
            onClick={placeOrder}
          >
            {submitting ? "Placing order..." : "Place order"}
          </button>
        </aside>
      </section>

      {selectedProduct && (
        <ProductCustomizer
          product={selectedProduct}
          onAdd={addToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}
