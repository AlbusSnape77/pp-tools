import { useState } from "react";
import { apiFetch } from "../../api/client";
import "./milk-tea.css";

const EMPTY_PRODUCT = { name: "", category: "", price: "", description: "" };

const STATUS_LABELS = {
  pending: "已接单",
  preparing: "制作中",
  ready: "待取餐",
  completed: "已完成",
  cancelled: "已取消",
};

const DEFAULT_PRODUCT_COPY = {
  "Brown Sugar Milk Tea": { name: "黑糖珍珠鲜奶", category: "奶茶", description: "慢熬黑糖、鲜牛乳与弹韧珍珠，醇厚不腻。" },
  "Jasmine Fruit Tea": { name: "茉莉鲜果茶", category: "果茶", description: "清香茉莉茶底搭配当季鲜果，轻盈清爽。" },
  "Cheese Matcha": { name: "芝士抹茶", category: "特调", description: "浓郁抹茶牛乳覆上绵密芝士奶盖。" },
};

function displayAdminProduct(product) {
  return { ...product, ...(DEFAULT_PRODUCT_COPY[product.name] || {}) };
}

function adminErrorMessage() {
  return "操作没有成功，请检查网络或登录状态后重试。";
}

export default function AdminMilkTeaPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [busy, setBusy] = useState(false);

  const headersFor = (nextToken = token) => ({ Authorization: `Bearer ${nextToken}` });

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

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
    } catch {
      showMessage("登录失败，请检查管理密码。", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const path = editingId ? `/api/admin/milk-tea/products/${editingId}` : "/api/admin/milk-tea/products";
      await apiFetch(path, {
        method: editingId ? "PUT" : "POST",
        headers: headersFor(),
        body: JSON.stringify({ ...productForm, price: Number(productForm.price) }),
      });
      const wasEditing = Boolean(editingId);
      setProductForm(EMPTY_PRODUCT);
      setEditingId(null);
      await loadAdminData(token);
      showMessage(wasEditing ? "商品已更新。" : "商品已新增。");
    } catch {
      showMessage(adminErrorMessage(), "error");
    } finally {
      setBusy(false);
    }
  };

  const editProduct = (product) => {
    const shownProduct = displayAdminProduct(product);
    setEditingId(product.id);
    setProductForm({
      name: shownProduct.name,
      category: shownProduct.category,
      price: String(product.price),
      description: shownProduct.description,
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const toggleProduct = async (product) => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/admin/milk-tea/products/${product.id}/status`, {
        method: "PATCH",
        headers: headersFor(),
        body: JSON.stringify({ active: !product.active }),
      });
      await loadAdminData(token);
      showMessage(product.active ? "商品已暂停销售。" : "商品已恢复销售。");
    } catch {
      showMessage(adminErrorMessage(), "error");
    } finally {
      setBusy(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/api/admin/milk-tea/orders/${orderId}/status`, {
        method: "PATCH",
        headers: headersFor(),
        body: JSON.stringify({ status }),
      });
      await loadAdminData(token);
      showMessage("订单状态已更新。");
    } catch {
      showMessage(adminErrorMessage(), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <main className="admin-page admin-login-page">
        <p className="tea-kicker">SANPINGFANG OPERATIONS</p>
        <h1>三平方门店管理</h1>
        <p className="lede">登录后管理今日订单、经营数据和在售商品。</p>
        {message && <p className="admin-notice is-error" role="alert">{message}</p>}
        <form className="admin-login" onSubmit={login}>
          <label>管理密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          <button type="submit" disabled={!password || busy}>{busy ? "正在登录..." : "进入管理台"}</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <div><p className="tea-kicker">门店运营</p><h1>三平方管理台</h1></div>
        <button type="button" className="secondary-button" onClick={() => setToken("")}>退出登录</button>
      </header>
      {message && <p className={`admin-notice ${messageType === "error" ? "is-error" : ""}`} role={messageType === "error" ? "alert" : "status"}>{message}</p>}

      {summary && (
        <section className="stats-grid" aria-label="经营概览">
          <article><span>累计订单</span><strong>{summary.order_count} 单</strong></article>
          <article><span>累计营业额</span><strong>¥{summary.revenue}</strong></article>
          <article><span>商品数量</span><strong>{products.length} 款</strong></article>
        </section>
      )}

      <div className="admin-grid">
        <section className="admin-section">
          <div className="admin-section-heading"><h2>订单处理</h2><span>{orders.length}</span></div>
          {orders.length === 0 ? <p>暂时没有订单。</p> : orders.map((order) => (
            <article className="admin-row" key={order.id}>
              <div>
                <strong>{order.lookup_code}</strong>
                <span>{order.customer_name} · ¥{order.total} · {STATUS_LABELS[order.status] || order.status}</span>
                {order.items?.length > 0 && <span>{order.items.map((item) => `${displayAdminProduct(item).name} × ${item.quantity}`).join("，")}</span>}
              </div>
              <div className="admin-row-actions">
                {order.status === "pending" && <button type="button" disabled={busy} onClick={() => updateOrderStatus(order.id, "preparing")}>开始制作</button>}
                {order.status !== "ready" && order.status !== "completed" && <button type="button" disabled={busy} onClick={() => updateOrderStatus(order.id, "ready")}>通知取餐</button>}
                {order.status === "ready" && <button type="button" disabled={busy} onClick={() => updateOrderStatus(order.id, "completed")}>完成订单</button>}
              </div>
            </article>
          ))}
        </section>

        <section className="admin-section">
          <h2>{editingId ? "编辑商品" : "新增商品"}</h2>
          <form aria-label={editingId ? "编辑商品" : "新增商品"} onSubmit={saveProduct} className="product-form">
            <label>商品名称<input required maxLength="60" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
            <label>分类<input required maxLength="30" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></label>
            <label>价格<input required type="number" min="1" max="999" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label>
            <label>商品描述<textarea required maxLength="180" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
            <div className="form-actions">
              <button type="submit" disabled={busy}>{editingId ? "保存修改" : "新增商品"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setProductForm(EMPTY_PRODUCT); }}>取消编辑</button>}
            </div>
          </form>
        </section>
      </div>

      <section className="admin-section product-management">
        <div className="admin-section-heading"><h2>商品管理</h2><span>{products.length}</span></div>
        <div className="admin-product-list">
          {products.map((product) => {
            const shownProduct = displayAdminProduct(product);
            return (
            <article className="admin-row" key={product.id}>
              <div><strong>{shownProduct.name}</strong><span>{shownProduct.category} · ¥{product.price} · {product.active ? "销售中" : "已停售"}</span></div>
              <div className="admin-row-actions">
                <button type="button" className="secondary-button" onClick={() => editProduct(product)}>编辑</button>
                <button type="button" disabled={busy} onClick={() => toggleProduct(product)}>{product.active ? "暂停销售" : "恢复销售"}</button>
              </div>
            </article>
          );})}
        </div>
      </section>
    </main>
  );
}
