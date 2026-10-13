import * as SQLite from "expo-sqlite";

export type Product = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("grocery.db");
  }
  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      buyingPrice REAL NOT NULL DEFAULT 0,
      sellingPrice REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId TEXT NOT NULL,
      productName TEXT NOT NULL,
      movementType TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      previousStock INTEGER NOT NULL,
      newStock INTEGER NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // No sample products are inserted.
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDatabase();
  return db.getAllAsync<Product>("SELECT * FROM products ORDER BY rowid DESC");
}

export async function addProduct(product: Product): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO products
      (id, name, category, quantity, buyingPrice, sellingPrice)
     VALUES (?, ?, ?, ?, ?, ?)`,
    product.id,
    product.name,
    product.category,
    product.quantity,
    product.buyingPrice,
    product.sellingPrice,
  );
}

export async function updateProduct(product: Product): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE products
     SET name = ?, category = ?, quantity = ?,
         buyingPrice = ?, sellingPrice = ?
     WHERE id = ?`,
    product.name,
    product.category,
    product.quantity,
    product.buyingPrice,
    product.sellingPrice,
    product.id,
  );
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM stock_movements WHERE productId = ?", id);
    await db.runAsync("DELETE FROM products WHERE id = ?", id);
  });
}

export type StockMovementType = "IN" | "OUT";

export type StockMovement = {
  id: number;
  productId: string;
  productName: string;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  note: string | null;
  createdAt: string;
};

export async function recordStockMovement(
  productId: string,
  movementType: StockMovementType,
  quantity: number,
  note: string = "",
): Promise<Product> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a whole number greater than zero.");
  }

  const db = await getDatabase();
  let updatedProduct: Product | null = null;

  await db.withTransactionAsync(async () => {
    const product = await db.getFirstAsync<Product>(
      "SELECT * FROM products WHERE id = ?",
      productId,
    );

    if (!product) {
      throw new Error("Product not found.");
    }

    const previousStock = product.quantity;
    const newStock =
      movementType === "IN"
        ? previousStock + quantity
        : previousStock - quantity;

    if (movementType === "OUT" && quantity > previousStock) {
      throw new Error(
        `Insufficient stock. Only ${previousStock} units are available.`,
      );
    }

    await db.runAsync(
      "UPDATE products SET quantity = ? WHERE id = ?",
      newStock,
      productId,
    );

    await db.runAsync(
      `INSERT INTO stock_movements
       (productId, productName, movementType, quantity,
        previousStock, newStock, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      product.id,
      product.name,
      movementType,
      quantity,
      previousStock,
      newStock,
      note.trim() || null,
    );

    updatedProduct = { ...product, quantity: newStock };
  });

  if (!updatedProduct) {
    throw new Error("Unable to update product stock.");
  }

  return updatedProduct;
}

export async function getStockMovements(): Promise<StockMovement[]> {
  const db = await getDatabase();

  return db.getAllAsync<StockMovement>(
    "SELECT * FROM stock_movements ORDER BY id DESC",
  );
}

export async function getLowStockProducts(
  threshold: number = 5,
): Promise<Product[]> {
  const db = await getDatabase();

  return db.getAllAsync<Product>(
    `SELECT * FROM products
     WHERE quantity <= ?
     ORDER BY quantity ASC`,
    threshold,
  );
}

export type InventorySummary = {
  totalInventoryCost: number;
  potentialSales: number;
  potentialProfit: number;
  totalProducts: number;
  totalUnits: number;
};

export async function getInventorySummary(): Promise<InventorySummary> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{
    totalInventoryCost: number;
    potentialSales: number;
    totalProducts: number;
    totalUnits: number;
  }>(`
    SELECT
      COALESCE(SUM(quantity * buyingPrice), 0) AS totalInventoryCost,
      COALESCE(SUM(quantity * sellingPrice), 0) AS potentialSales,
      COUNT(*) AS totalProducts,
      COALESCE(SUM(quantity), 0) AS totalUnits
    FROM products
  `);

  const totalInventoryCost = result?.totalInventoryCost ?? 0;
  const potentialSales = result?.potentialSales ?? 0;

  return {
    totalInventoryCost,
    potentialSales,
    potentialProfit: potentialSales - totalInventoryCost,
    totalProducts: result?.totalProducts ?? 0,
    totalUnits: result?.totalUnits ?? 0,
  };
}

export type SaleCartItem = {
  productId: string;
  quantity: number;
};

export type SaleItem = {
  id: number;
  saleId: number;
  productId: string;
  productName: string;
  quantity: number;
  unitSellingPrice: number;
  unitBuyingPrice: number;
  subtotal: number;
  profit: number;
};

export type Sale = {
  id: number;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  createdAt: string;
};

export async function initializeSalesDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      totalAmount REAL NOT NULL DEFAULT 0,
      totalCost REAL NOT NULL DEFAULT 0,
      totalProfit REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saleId INTEGER NOT NULL,
      productId TEXT NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitSellingPrice REAL NOT NULL,
      unitBuyingPrice REAL NOT NULL,
      subtotal REAL NOT NULL,
      profit REAL NOT NULL,
      FOREIGN KEY (saleId) REFERENCES sales(id)
    );
  `);
}

export async function completeSale(items: SaleCartItem[]): Promise<number> {
  if (items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(
        "Each quantity must be a whole number greater than zero.",
      );
    }
  }

  const db = await getDatabase();
  let saleId = 0;

  await db.withTransactionAsync(async () => {
    const combinedItems = new Map<string, number>();

    for (const item of items) {
      combinedItems.set(
        item.productId,
        (combinedItems.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const saleItems: {
      product: Product;
      quantity: number;
      subtotal: number;
      profit: number;
    }[] = [];

    let totalAmount = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const [productId, quantity] of combinedItems) {
      const product = await db.getFirstAsync<Product>(
        "SELECT * FROM products WHERE id = ?",
        productId,
      );

      if (!product) {
        throw new Error("A product in your cart no longer exists.");
      }

      if (product.quantity < quantity) {
        throw new Error(
          `Not enough stock for ${product.name}. Available: ${product.quantity}.`,
        );
      }

      const subtotal = product.sellingPrice * quantity;
      const cost = product.buyingPrice * quantity;
      const profit = subtotal - cost;

      totalAmount += subtotal;
      totalCost += cost;
      totalProfit += profit;

      saleItems.push({ product, quantity, subtotal, profit });
    }

    const saleResult = await db.runAsync(
      `INSERT INTO sales (totalAmount, totalCost, totalProfit)
       VALUES (?, ?, ?)`,
      totalAmount,
      totalCost,
      totalProfit,
    );

    saleId = saleResult.lastInsertRowId;

    for (const item of saleItems) {
      const { product, quantity, subtotal, profit } = item;
      const previousStock = product.quantity;
      const newStock = previousStock - quantity;

      await db.runAsync(
        `INSERT INTO sale_items
         (saleId, productId, productName, quantity,
          unitSellingPrice, unitBuyingPrice, subtotal, profit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        saleId,
        product.id,
        product.name,
        quantity,
        product.sellingPrice,
        product.buyingPrice,
        subtotal,
        profit,
      );

      await db.runAsync(
        "UPDATE products SET quantity = ? WHERE id = ?",
        newStock,
        product.id,
      );

      await db.runAsync(
        `INSERT INTO stock_movements
         (productId, productName, movementType, quantity,
          previousStock, newStock, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        product.id,
        product.name,
        "OUT",
        quantity,
        previousStock,
        newStock,
        `Sale #${saleId}`,
      );
    }
  });

  if (saleId === 0) {
    throw new Error("The sale could not be completed.");
  }

  return saleId;
}

export async function getSales(): Promise<Sale[]> {
  const db = await getDatabase();

  return db.getAllAsync<Sale>("SELECT * FROM sales ORDER BY id DESC");
}

export async function getSaleItems(saleId: number): Promise<SaleItem[]> {
  const db = await getDatabase();

  return db.getAllAsync<SaleItem>(
    "SELECT * FROM sale_items WHERE saleId = ? ORDER BY id ASC",
    saleId,
  );
}

// EXPENSE TRACKING

export type Expense = {
  id: number;
  title: string;
  category: string;
  amount: number;
  note: string;
  createdAt: string;
};

export async function initializeExpenseDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function addExpense(
  title: string,
  category: string,
  amount: number,
  note: string = "",
): Promise<void> {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error("Please enter an expense name.");
  }

  if (!category.trim()) {
    throw new Error("Please select an expense category.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Please enter an amount greater than zero.");
  }

  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO expenses (title, category, amount, note)
     VALUES (?, ?, ?, ?)`,
    cleanTitle,
    category,
    amount,
    note.trim(),
  );
}

export async function getExpenses(): Promise<Expense[]> {
  const db = await getDatabase();

  return db.getAllAsync<Expense>("SELECT * FROM expenses ORDER BY id DESC");
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM expenses WHERE id = ?", id);
}

// BACKUP AND RESTORE

export type GroceryBackup = {
  appName: "GROCERY";
  version: 1;
  createdAt: string;
  products: Product[];
  stockMovements: StockMovement[];
  sales: Sale[];
  saleItems: SaleItem[];
  expenses: Expense[];
};

export async function createBackupData(): Promise<GroceryBackup> {
  const db = await getDatabase();

  const [products, stockMovements, sales, saleItems, expenses] =
    await Promise.all([
      db.getAllAsync<Product>("SELECT * FROM products"),
      db.getAllAsync<StockMovement>("SELECT * FROM stock_movements"),
      db.getAllAsync<Sale>("SELECT * FROM sales"),
      db.getAllAsync<SaleItem>("SELECT * FROM sale_items"),
      db.getAllAsync<Expense>("SELECT * FROM expenses"),
    ]);

  return {
    appName: "GROCERY",
    version: 1,
    createdAt: new Date().toISOString(),
    products,
    stockMovements,
    sales,
    saleItems,
    expenses,
  };
}

export async function restoreBackupData(backup: GroceryBackup): Promise<void> {
  if (
    !backup ||
    backup.appName !== "GROCERY" ||
    backup.version !== 1 ||
    !Array.isArray(backup.products) ||
    !Array.isArray(backup.stockMovements) ||
    !Array.isArray(backup.sales) ||
    !Array.isArray(backup.saleItems) ||
    !Array.isArray(backup.expenses)
  ) {
    throw new Error("This file is not a valid GROCERY backup.");
  }

  const db = await getDatabase();

  await initializeDatabase();
  await initializeSalesDatabase();
  await initializeExpenseDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM sale_items");
    await db.runAsync("DELETE FROM sales");
    await db.runAsync("DELETE FROM stock_movements");
    await db.runAsync("DELETE FROM expenses");
    await db.runAsync("DELETE FROM products");

    for (const product of backup.products) {
      await db.runAsync(
        `INSERT INTO products
         (id, name, category, quantity, buyingPrice, sellingPrice)
         VALUES (?, ?, ?, ?, ?, ?)`,
        product.id,
        product.name,
        product.category,
        product.quantity,
        product.buyingPrice,
        product.sellingPrice,
      );
    }

    for (const movement of backup.stockMovements) {
      await db.runAsync(
        `INSERT INTO stock_movements
         (id, productId, productName, movementType, quantity,
          previousStock, newStock, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        movement.id,
        movement.productId,
        movement.productName,
        movement.movementType,
        movement.quantity,
        movement.previousStock,
        movement.newStock,
        movement.note,
        movement.createdAt,
      );
    }

    for (const sale of backup.sales) {
      await db.runAsync(
        `INSERT INTO sales
         (id, totalAmount, totalCost, totalProfit, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        sale.id,
        sale.totalAmount,
        sale.totalCost,
        sale.totalProfit,
        sale.createdAt,
      );
    }

    for (const item of backup.saleItems) {
      await db.runAsync(
        `INSERT INTO sale_items
         (id, saleId, productId, productName, quantity,
          unitSellingPrice, unitBuyingPrice, subtotal, profit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.saleId,
        item.productId,
        item.productName,
        item.quantity,
        item.unitSellingPrice,
        item.unitBuyingPrice,
        item.subtotal,
        item.profit,
      );
    }

    for (const expense of backup.expenses) {
      await db.runAsync(
        `INSERT INTO expenses
         (id, title, category, amount, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        expense.id,
        expense.title,
        expense.category,
        expense.amount,
        expense.note,
        expense.createdAt,
      );
    }
  });
}
