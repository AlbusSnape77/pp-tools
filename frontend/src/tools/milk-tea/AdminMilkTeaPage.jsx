import { useState } from "react";
import { apiFetch } from "../../api/client";

const EMPTY_PRODUCT = { name: "", category: "", price: "", description: "" };

export default function AdminMilkTeaPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const headersFor = (nextToken = token) => ({ Authorization: `Bearer ${nextToken}` });

  const loadAdminData = async (nextToken) => {
    const headers = headersFor(nextToken);
    const [summaryData, orderData, productData] = await Promise.all([
      apiFetch("/api/admin/milk-tea/summary", { headers }),
      apiFetch("/api/admin/milk-tea/orders", { headers }),
      apiFetch("/api/admin/milk-tea/products", { headers }),
    ]);
    setSummary(summaryData.summary);
    setOrders(orderData.orders);
    setProducts(productData.products);
  };

  const login = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const data = await apiFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      await loadAdminData(data.token);
      setToken(data.token);
      setPassword("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const path = editingId
        ? `/api/admin/milk-tea/products/${editingId}`
        : "/api/admin/milk-tea/products";
      await apiFetch(path, {
        method: editingId ? "PUT" : "POST",
        headers: headersFor(),
        body: JSON.stringify({ ...productForm, price: Number(productForm.price) }),
      });
      setProductForm(EMPTY_PRODUCT);
      setEditingId(null);
      await loadAdminData(token);
      setMessage(editingId ? "Product updated." : "Product created.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setProductForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      description: product.description,
    });
  };

  const toggleProduct = async (product) => {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/milk-tea/products/${product.id}/status`, {
        method: "PATCH",
        headers: headersFor(),
        body: JSON.stringify({ active: !product.active }),
      });
      await loadAdminData(token);
      setMessage(product.active ? "Product disabled." : "Product enabled.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/milk-tea/orders/${orderId}/status`, {
        method: "PATCH",
        headers: headersFor(),
        body: JSON.stringify({ status }),
      });
      await loadAdminData(token);
      setMessage("Order updated.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <main className="shell admin-page admin-login-page">
        <p className="section-kicker">Protected workspace</p>
        <h1>Milk Tea Admin</h1>
        <p className="lede">Sign in to manage products, orders, and sales totals.</p>
        {message && <p className="notice notice-error" role="alert">{message}</p>}
        <form className="admin-login" onSubmit={login}>
          <label>
            Admin password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={!password || busy}>{busy ? "Signing in..." : "Log in"}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="shell admin-page">
      <header className="admin-heading">
        <div>
          <p className="section-kicker">Operations</p>
          <h1>Milk Tea Admin</h1>
        </div>
        <button type="button" className="secondary-button" onClick={() => setToken("")}>Log out</button>
      </header>
      {message && <p className="notice" role="status">{message}</p>}

      {summary && (
        <section className="stats-grid" aria-label="Sales summary">
          <article><span>Orders</span><strong>{summary.order_count} orders</strong></article>
          <article><span>Revenue</span><strong>¥{summary.revenue} revenue</strong></article>
          <article><span>Products</span><strong>{products.length} products</strong></article>
        </section>
      )}

      <div className="admin-grid">
        <section className="admin-section">
          <div className="admin-section-heading"><h2>Orders</h2><span>{orders.length}</span></div>
          {orders.length === 0 ? <p>No orders yet.</p> : orders.map((order) => (
            <article className="admin-row" key={order.id}>
              <div>
                <strong>{order.lookup_code}</strong>
                <span>{order.customer_name} · ¥{order.total} · {order.status}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" disabled={busy} onClick={() => updateOrderStatus(order.id, "ready")}>Mark ready</button>
                <button type="button" disabled={busy} onClick={() => updateOrderStatus(order.id, "completed")}>Complete</button>
              </div>
            </article>
          ))}
        </section>

        <section className="admin-section">
          <h2>{editingId ? "Edit product" : "Create product"}</h2>
          <form aria-label={editingId ? "Edit product" : "Create product"} onSubmit={saveProduct} className="product-form">
            <label>Product name<input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
            <label>Category<input value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></label>
            <label>Price<input type="number" min="1" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label>
            <label>Description<textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
            <div className="form-actions">
              <button type="submit" disabled={busy}>{editingId ? "Update product" : "Create product"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setProductForm(EMPTY_PRODUCT); }}>Cancel</button>}
            </div>
          </form>
        </section>
      </div>

      <section className="admin-section product-management">
        <div className="admin-section-heading"><h2>Products</h2><span>{products.length}</span></div>
        <div className="admin-product-list">
          {products.map((product) => (
            <article className="admin-row" key={product.id}>
              <div><strong>{product.name}</strong><span>{product.category} · ¥{product.price} · {product.active ? "Active" : "Disabled"}</span></div>
              <div className="admin-row-actions">
                <button type="button" className="secondary-button" onClick={() => editProduct(product)}>Edit</button>
                <button type="button" disabled={busy} onClick={() => toggleProduct(product)}>{product.active ? "Disable" : "Enable"}</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
