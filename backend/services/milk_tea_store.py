import json
import sqlite3
import time
from pathlib import Path
from secrets import token_hex


SEED_PRODUCTS = [
    {
        "name": "Brown Sugar Milk Tea",
        "category": "Milk Tea",
        "price": 18,
        "description": "Brown sugar, fresh milk, and black tea.",
    },
    {
        "name": "Jasmine Fruit Tea",
        "category": "Fruit Tea",
        "price": 16,
        "description": "Jasmine tea with seasonal fruit.",
    },
    {
        "name": "Cheese Matcha",
        "category": "Special",
        "price": 20,
        "description": "Matcha latte with a cheese foam top.",
    },
]


class MilkTeaStore:
    def __init__(self, db_path):
        self.db_path = Path(db_path)

    def connect(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def initialize(self):
        with self.connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS products (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  category TEXT NOT NULL,
                  price INTEGER NOT NULL,
                  description TEXT NOT NULL,
                  active INTEGER NOT NULL DEFAULT 1,
                  sort_order INTEGER NOT NULL DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS orders (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  lookup_code TEXT NOT NULL UNIQUE,
                  customer_name TEXT NOT NULL,
                  status TEXT NOT NULL,
                  total INTEGER NOT NULL,
                  created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS order_items (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  order_id INTEGER NOT NULL,
                  product_id INTEGER NOT NULL,
                  name TEXT NOT NULL,
                  quantity INTEGER NOT NULL,
                  unit_price INTEGER NOT NULL,
                  options_json TEXT NOT NULL,
                  FOREIGN KEY(order_id) REFERENCES orders(id),
                  FOREIGN KEY(product_id) REFERENCES products(id)
                );
                """
            )
            count = connection.execute("SELECT COUNT(*) AS count FROM products").fetchone()["count"]
            if count == 0:
                for index, product in enumerate(SEED_PRODUCTS):
                    connection.execute(
                        """
                        INSERT INTO products (name, category, price, description, active, sort_order)
                        VALUES (?, ?, ?, ?, 1, ?)
                        """,
                        (
                            product["name"],
                            product["category"],
                            product["price"],
                            product["description"],
                            index,
                        ),
                    )

    def list_products(self, include_inactive=False):
        query = "SELECT * FROM products"
        if not include_inactive:
            query += " WHERE active = 1"
        query += " ORDER BY sort_order ASC, id ASC"
        with self.connect() as connection:
            rows = connection.execute(query).fetchall()
        return [self._product(row) for row in rows]

    def get_product(self, product_id):
        with self.connect() as connection:
            row = connection.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        return self._product(row) if row else None

    def create_order(self, customer_name, items):
        if not isinstance(customer_name, str) or not customer_name.strip():
            raise ValueError("Customer name is required.")
        if not isinstance(items, list) or not items:
            raise ValueError("At least one item is required.")

        prepared_items = []
        with self.connect() as connection:
            for item in items:
                if not isinstance(item, dict):
                    raise ValueError("Each item must be an object.")

                try:
                    product_id = int(item.get("product_id"))
                    quantity = int(item.get("quantity"))
                except (TypeError, ValueError):
                    raise ValueError("Product and quantity are required.") from None

                if quantity < 1:
                    raise ValueError("Quantity must be at least 1.")

                options = item.get("options", {})
                if not isinstance(options, dict):
                    raise ValueError("Options must be an object.")

                product = connection.execute(
                    "SELECT * FROM products WHERE id = ? AND active = 1",
                    (product_id,),
                ).fetchone()
                if not product:
                    raise ValueError("Product not found.")

                prepared_items.append(
                    {
                        "product_id": product["id"],
                        "name": product["name"],
                        "quantity": quantity,
                        "unit_price": product["price"],
                        "options": options,
                    }
                )

            total = sum(item["unit_price"] * item["quantity"] for item in prepared_items)
            lookup_code = token_hex(4).upper()
            created_at = int(time.time())
            cursor = connection.execute(
                """
                INSERT INTO orders (lookup_code, customer_name, status, total, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (lookup_code, customer_name.strip(), "pending", total, created_at),
            )
            order_id = cursor.lastrowid
            for item in prepared_items:
                connection.execute(
                    """
                    INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, options_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        order_id,
                        item["product_id"],
                        item["name"],
                        item["quantity"],
                        item["unit_price"],
                        json.dumps(item["options"], ensure_ascii=True),
                    ),
                )

        return self.get_order_by_lookup(lookup_code)

    def get_order_by_lookup(self, lookup_code):
        with self.connect() as connection:
            order = connection.execute(
                "SELECT * FROM orders WHERE lookup_code = ?",
                (lookup_code,),
            ).fetchone()
            if not order:
                return None
            items = connection.execute(
                "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
                (order["id"],),
            ).fetchall()
        return self._order(order, items)

    def list_orders(self):
        with self.connect() as connection:
            orders = connection.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
            result = []
            for order in orders:
                items = connection.execute(
                    "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
                    (order["id"],),
                ).fetchall()
                result.append(self._order(order, items))
        return result

    def update_order_status(self, order_id, status):
        allowed = {"pending", "preparing", "ready", "completed", "cancelled"}
        if status not in allowed:
            raise ValueError("Unsupported order status.")

        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE orders SET status = ? WHERE id = ?",
                (status, order_id),
            )
            if cursor.rowcount == 0:
                return None
            order = connection.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
            items = connection.execute(
                "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
                (order_id,),
            ).fetchall()
        return self._order(order, items)

    def save_product(self, payload, product_id=None):
        name = (payload.get("name") or "").strip()
        category = (payload.get("category") or "").strip()
        description = (payload.get("description") or "").strip()
        try:
            price = int(payload.get("price") or 0)
        except (TypeError, ValueError):
            price = 0
        if not name or not category or not description or price <= 0:
            raise ValueError("Name, category, description, and positive price are required.")

        with self.connect() as connection:
            if product_id is not None:
                cursor = connection.execute(
                    """
                    UPDATE products
                    SET name = ?, category = ?, price = ?, description = ?
                    WHERE id = ?
                    """,
                    (name, category, price, description, product_id),
                )
                if cursor.rowcount == 0:
                    return None
            else:
                sort_order = connection.execute(
                    "SELECT COUNT(*) AS count FROM products"
                ).fetchone()["count"]
                cursor = connection.execute(
                    """
                    INSERT INTO products (name, category, price, description, active, sort_order)
                    VALUES (?, ?, ?, ?, 1, ?)
                    """,
                    (name, category, price, description, sort_order),
                )
                product_id = cursor.lastrowid
        return self.get_product(product_id)

    def update_product_status(self, product_id, active):
        with self.connect() as connection:
            cursor = connection.execute(
                "UPDATE products SET active = ? WHERE id = ?",
                (1 if active else 0, product_id),
            )
            if cursor.rowcount == 0:
                return None
        return self.get_product(product_id)

    def sales_summary(self):
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS revenue
                FROM orders
                """
            ).fetchone()
        return {"order_count": row["order_count"], "revenue": row["revenue"]}

    @staticmethod
    def _product(row):
        return {
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
            "price": row["price"],
            "description": row["description"],
            "active": bool(row["active"]),
            "sort_order": row["sort_order"],
        }

    @staticmethod
    def _order(row, item_rows):
        return {
            "id": row["id"],
            "lookup_code": row["lookup_code"],
            "customer_name": row["customer_name"],
            "status": row["status"],
            "total": row["total"],
            "created_at": row["created_at"],
            "items": [
                {
                    "id": item["id"],
                    "product_id": item["product_id"],
                    "name": item["name"],
                    "quantity": item["quantity"],
                    "unit_price": item["unit_price"],
                    "options": json.loads(item["options_json"]),
                }
                for item in item_rows
            ],
        }
