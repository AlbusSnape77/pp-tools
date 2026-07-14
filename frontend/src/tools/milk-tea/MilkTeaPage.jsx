import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../api/client";
import "./milk-tea.css";

const DEFAULT_OPTIONS = {
  size: "regular",
  sweetness: "50%",
  ice: "less",
  toppings: [],
};

const STATUS_LABELS = {
  pending: "已接单",
  preparing: "制作中",
  ready: "待取餐",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_STEPS = ["pending", "preparing", "ready", "completed"];

const PRODUCT_COPY = {
  "Brown Sugar Milk Tea": {
    name: "黑糖珍珠鲜奶",
    category: "奶茶",
    description: "慢熬黑糖、鲜牛乳与弹韧珍珠，醇厚不腻。",
  },
  "Jasmine Fruit Tea": {
    name: "茉莉鲜果茶",
    category: "果茶",
    description: "清香茉莉茶底搭配当季鲜果，轻盈清爽。",
  },
  "Cheese Matcha": {
    name: "芝士抹茶",
    category: "特调",
    description: "浓郁抹茶牛乳覆上绵密芝士奶盖。",
  },
};

const CATEGORY_LABELS = {
  All: "全部",
  "Milk Tea": "奶茶",
  "Fruit Tea": "果茶",
  Special: "特调",
};

const OPTION_LABELS = {
  regular: "中杯",
  large: "大杯",
  none: "去冰",
  less: "少冰",
  Pearls: "珍珠",
  "Coconut Jelly": "椰果",
};

function formatPrice(value) {
  return `¥${value}`;
}

function displayProduct(product) {
  return { ...product, ...(PRODUCT_COPY[product.name] || {}) };
}

function optionSummary(options) {
  const values = [
    OPTION_LABELS[options.size] || options.size,
    `${options.sweetness} 糖`,
    OPTION_LABELS[options.ice] || options.ice,
    ...options.toppings.map((item) => OPTION_LABELS[item] || item),
  ];
  return values.join(" · ");
}

function friendlyError() {
  return "暂时无法连接门店服务，请稍后重试。";
}

function OrderStatus({ order }) {
  const [copied, setCopied] = useState(false);
  if (!order) return null;

  const currentIndex = STATUS_STEPS.indexOf(order.status);
  const copyCode = async () => {
    await navigator.clipboard?.writeText(order.lookup_code);
    setCopied(true);
  };

  return (
    <section className="order-status" aria-label="订单状态">
      <div className="order-status-heading">
        <div>
          <p className="tea-kicker">下单成功</p>
          <h2>订单 {order.lookup_code}</h2>
          <p>{order.customer_name}，请保存订单编号用于查询。</p>
        </div>
        <button className="tea-secondary" type="button" onClick={copyCode}>
          {copied ? "已复制" : "复制编号"}
        </button>
      </div>
      <div className="order-meta">
        <span className={`tea-status tea-status-${order.status}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
        <strong>{formatPrice(order.total)}</strong>
      </div>
      {order.status !== "cancelled" && (
        <ol className="order-timeline" aria-label="订单进度">
          {STATUS_STEPS.map((step, index) => (
            <li className={index <= currentIndex ? "is-complete" : ""} key={step}>
              <span aria-hidden="true">{index + 1}</span>
              {STATUS_LABELS[step]}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ProductCustomizer({ product, onAdd, onClose }) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [quantity, setQuantity] = useState(1);
  const shownProduct = displayProduct(product);

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
      displayName: shownProduct.name,
      price: product.price,
      quantity: Number(quantity),
      options,
    });
  };

  return (
    <div className="customizer-backdrop">
      <section className="customizer-panel" role="dialog" aria-modal="true" aria-labelledby="customizer-title">
        <div className="customizer-heading">
          <div>
            <p className="tea-kicker">定制你的这一杯</p>
            <h2 id="customizer-title">{shownProduct.name}</h2>
          </div>
          <button className="tea-icon-button" type="button" aria-label="关闭规格选择" onClick={onClose}>×</button>
        </div>

        <div className="customizer-grid">
          <label>
            杯型
            <select value={options.size} onChange={(event) => setOptions({ ...options, size: event.target.value })}>
              <option value="regular">中杯</option>
              <option value="large">大杯</option>
            </select>
          </label>
          <label>
            甜度
            <select value={options.sweetness} onChange={(event) => setOptions({ ...options, sweetness: event.target.value })}>
              <option value="0%">不另外加糖</option>
              <option value="25%">微糖 25%</option>
              <option value="50%">半糖 50%</option>
              <option value="75%">少糖 75%</option>
              <option value="100%">标准糖 100%</option>
            </select>
          </label>
          <label>
            冰量
            <select value={options.ice} onChange={(event) => setOptions({ ...options, ice: event.target.value })}>
              <option value="none">去冰</option>
              <option value="less">少冰</option>
              <option value="regular">标准冰</option>
            </select>
          </label>
          <label>
            数量
            <input type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
        </div>

        <fieldset className="topping-options">
          <legend>加料</legend>
          {["Pearls", "Coconut Jelly"].map((topping) => (
            <label key={topping}>
              <input type="checkbox" checked={options.toppings.includes(topping)} onChange={() => toggleTopping(topping)} />
              {OPTION_LABELS[topping]}
            </label>
          ))}
        </fieldset>

        <div className="customizer-actions">
          <div><span>小计</span><strong>{formatPrice(product.price * (Number(quantity) || 0))}</strong></div>
          <button type="button" disabled={!Number.isInteger(Number(quantity)) || Number(quantity) < 1} onClick={addToCart}>
            加入购物车
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
  const [reloadKey, setReloadKey] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiFetch("/api/milk-tea/products")
      .then((data) => { if (active) setProducts(data.products); })
      .catch(() => { if (active) setError(friendlyError()); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  const categories = useMemo(() => ["All", ...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = category === "All" ? products : products.filter((product) => product.category === category);
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (item) => {
    setCart((current) => [...current, item]);
    setSelectedProduct(null);
    setCartOpen(true);
    setError("");
  };

  const changeQuantity = (index, amount) => {
    setCart((current) => current
      .map((item, itemIndex) => itemIndex === index ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  };

  const placeOrder = async () => {
    setSubmitting(true);
    setError("");
    try {
      const data = await apiFetch("/api/milk-tea/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_name: customerName.trim(),
          items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity, options: item.options })),
        }),
      });
      setOrder(data.order);
      setLookupCode(data.order.lookup_code);
      setCart([]);
      setCustomerName("");
    } catch {
      setError("下单没有成功，购物车已经为你保留，请稍后重试。");
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
    } catch {
      setOrder(null);
      setError("没有找到这个订单，请检查编号后再试。");
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <main className="milk-tea-page">
      <header className="milk-tea-intro">
        <div className="milk-tea-hero-copy">
          <p className="tea-kicker">SANPINGFANG TEA HOUSE</p>
          <h1>三平方茶作</h1>
          <p>现点现做的一杯好茶。从挑选口味到查询进度，都在这里完成。</p>
          <a href="#tea-menu" className="tea-hero-action">开始点单 <span aria-hidden="true">↓</span></a>
        </div>
        <div className="milk-tea-hero-media">
          <img src="/images/milk-tea-menu.png" alt="黑糖珍珠鲜奶、茉莉鲜果茶和芝士抹茶" />
          <span>今日新鲜制作</span>
        </div>
      </header>

      <section className="status-lookup" aria-labelledby="lookup-title">
        <div>
          <p className="tea-kicker">订单查询</p>
          <h2 id="lookup-title">看看你的饮品做到哪一步了</h2>
        </div>
        <form onSubmit={findOrder}>
          <label>订单编号<input value={lookupCode} onChange={(event) => setLookupCode(event.target.value)} autoComplete="off" placeholder="例如 ABCD1234" /></label>
          <button type="submit" disabled={!lookupCode.trim() || lookingUp}>{lookingUp ? "查询中..." : "查询订单"}</button>
        </form>
      </section>

      {error && (
        <div className="tea-notice" role="alert">
          <span>{error}</span>
          {!products.length && !loading && <button type="button" onClick={() => setReloadKey((value) => value + 1)}>重新加载</button>}
        </div>
      )}

      <OrderStatus order={order} />

      <section id="tea-menu" className="tea-menu-section">
        <div className="shop-toolbar">
          <div><p className="tea-kicker">今日菜单</p><h2>选一杯喜欢的</h2></div>
          {products.length > 0 && (
            <div className="category-tabs" aria-label="饮品分类">
              {categories.map((item) => (
                <button type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)} key={item}>
                  {CATEGORY_LABELS[item] || item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shop-layout">
          <div className="product-list" aria-live="polite">
            {loading && <p className="tea-empty-state">正在准备今日菜单...</p>}
            {!loading && !error && products.length === 0 && <p className="tea-empty-state">今日饮品暂时售罄，请稍后再来。</p>}
            {!loading && visibleProducts.map((product, index) => {
              const shownProduct = displayProduct(product);
              return (
                <article className="product-card" aria-labelledby={`product-${product.id}`} key={product.id}>
                  <div className={`drink-visual drink-visual-${(index % 3) + 1}`} aria-hidden="true"><span>热销</span></div>
                  <div className="product-card-body">
                    <p className="tea-kicker">{shownProduct.category || CATEGORY_LABELS[product.category] || product.category}</p>
                    <h3 id={`product-${product.id}`}>{shownProduct.name}</h3>
                    <p>{shownProduct.description}</p>
                    <div className="product-card-actions"><strong>{formatPrice(product.price)}</strong><button type="button" onClick={() => setSelectedProduct(product)}>选规格</button></div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className={`cart-panel ${cartOpen ? "is-mobile-open" : ""}`} aria-label="购物车结算">
            <div className="cart-heading">
              <div><p className="tea-kicker">你的选择</p><h2>购物车</h2></div>
              <div className="cart-heading-actions"><span>{totalCount}</span><button className="mobile-cart-close" type="button" aria-label="收起购物车" onClick={() => setCartOpen(false)}>×</button></div>
            </div>
            {cart.length === 0 ? <p className="cart-empty">购物车还是空的<br /><span>选一杯喜欢的饮品吧</span></p> : (
              <ul className="cart-items">
                {cart.map((item, index) => (
                  <li key={`${item.product_id}-${index}`}>
                    <div className="cart-item-copy"><strong>{item.displayName || displayProduct(item).name}</strong><span>{optionSummary(item.options)}</span></div>
                    <div className="cart-item-controls">
                      <button type="button" aria-label={`减少 ${item.name} 数量`} onClick={() => changeQuantity(index, -1)}>−</button>
                      <span>{item.quantity} 杯</span>
                      <button type="button" aria-label={`增加 ${item.name} 数量`} onClick={() => changeQuantity(index, 1)}>＋</button>
                      <button className="cart-remove" type="button" aria-label={`移除 ${item.name}`} onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}>移除</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="cart-total"><span>合计</span><strong>{formatPrice(total)}</strong></div>
            <label className="customer-name">取餐姓名<input value={customerName} maxLength="30" onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" placeholder="请输入姓名" /></label>
            <button className="tea-primary-action" type="button" disabled={!cart.length || !customerName.trim() || submitting} onClick={placeOrder}>
              {submitting ? "正在提交..." : "确认下单"}
            </button>
            <p className="cart-footnote">订单金额由门店系统重新核算</p>
          </aside>
        </div>
      </section>

      <button className="mobile-cart-trigger" type="button" aria-label={`打开购物车，当前 ${totalCount} 杯`} onClick={() => setCartOpen(true)}>
        <span>购物车 · {totalCount} 杯</span><strong>{formatPrice(total)}</strong>
      </button>

      <footer className="milk-tea-footer"><strong>三平方茶作</strong><span>每一杯，都认真对待。</span><a href="/admin/milk-tea">门店管理</a></footer>

      {selectedProduct && <ProductCustomizer product={selectedProduct} onAdd={addToCart} onClose={() => setSelectedProduct(null)} />}
    </main>
  );
}
