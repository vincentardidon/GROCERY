import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    completeSale,
    getProducts,
    initializeDatabase,
    initializeSalesDatabase,
    Product,
    SaleCartItem,
} from "../database/database";

const COLORS = {
  green: "#245C45",
  darkGreen: "#173F30",
  cream: "#F8F7F0",
  white: "#FFFFFF",
  text: "#24352C",
  muted: "#78857B",
  border: "#E4E8DF",
  lightGreen: "#E8F0E8",
  red: "#B84040",
  lightRed: "#FCECEC",
};

type CartItem = {
  product: Product;
  quantity: number;
};

export default function SalesScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      await initializeDatabase();
      await initializeSalesDatabase();

      const result = await getProducts();
      setProducts(result);
    } catch (error) {
      console.error("Failed to load products:", error);
      Alert.alert("Error", "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts]),
  );

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const totalAmount = cart.reduce(
    (total, item) => total + item.product.sellingPrice * item.quantity,
    0,
  );

  const totalCost = cart.reduce(
    (total, item) => total + item.product.buyingPrice * item.quantity,
    0,
  );

  const totalProfit = totalAmount - totalCost;

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

  const formatMoney = (amount: number) =>
    `₱${amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  function addToCart(product: Product) {
    if (product.quantity <= 0) {
      Alert.alert("Out of Stock", `${product.name} is currently unavailable.`);
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.product.id === product.id,
      );

      if (existing) {
        if (existing.quantity >= product.quantity) {
          Alert.alert(
            "Insufficient Stock",
            `Only ${product.quantity} units of ${product.name} are available.`,
          );
          return currentCart;
        }

        return currentCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, change: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.product.id !== productId) {
            return item;
          }

          const newQuantity = item.quantity + change;

          if (newQuantity <= 0) {
            return { ...item, quantity: 0 };
          }

          if (newQuantity > item.product.quantity) {
            Alert.alert(
              "Insufficient Stock",
              `Only ${item.product.quantity} units are available.`,
            );

            return item;
          }

          return { ...item, quantity: newQuantity };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.product.id !== productId),
    );
  }

  async function handleCompleteSale() {
    if (cart.length === 0) {
      Alert.alert(
        "Empty Cart",
        "Add at least one product before completing a sale.",
      );
      return;
    }

    Alert.alert(
      "Complete Sale",
      `Total: ${formatMoney(totalAmount)}\nEstimated profit: ${formatMoney(totalProfit)}\n\nSave this transaction?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Complete Sale",
          onPress: async () => {
            setSaving(true);

            try {
              const saleItems: SaleCartItem[] = cart.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
              }));

              const saleId = await completeSale(saleItems);

              setCart([]);
              await loadProducts();

              Alert.alert(
                "Sale Completed!",
                `Sale #${saleId} was saved successfully.\n\nTotal: ${formatMoney(totalAmount)}\nEstimated profit: ${formatMoney(totalProfit)}`,
                [
                  {
                    text: "OK",
                  },
                ],
              );
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Unable to complete the sale.";

              Alert.alert("Sale Failed", message);
              await loadProducts();
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {" "}
        <ActivityIndicator size="large" color={COLORS.green} />{" "}
        <Text style={styles.loadingText}>Loading sales...</Text>{" "}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>{" "}
          </Pressable>

          <Text style={styles.headerTitle}>Sales</Text>
          <Text style={styles.headerSubtitle}>Record customer purchases</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Current Sale Total</Text>

          <Text style={styles.summaryAmount}>{formatMoney(totalAmount)}</Text>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summarySmallLabel}>Items</Text>
              <Text style={styles.summarySmallValue}>{totalItems}</Text>
            </View>

            <View>
              <Text style={styles.summarySmallLabel}>Estimated Profit</Text>
              <Text style={styles.summaryProfit}>
                {formatMoney(totalProfit)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Products</Text>
          <Text style={styles.sectionCount}>
            {filteredProducts.length} products
          </Text>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              Try another search or add products to your inventory.
            </Text>
          </View>
        ) : (
          filteredProducts.map((product) => {
            const inCart = cart.find((item) => item.product.id === product.id);

            const outOfStock = product.quantity <= 0;

            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>

                  <Text style={styles.productCategory}>{product.category}</Text>

                  <Text style={styles.productPrice}>
                    {formatMoney(product.sellingPrice)}
                  </Text>

                  <Text
                    style={[
                      styles.stockText,
                      outOfStock && styles.outOfStockText,
                    ]}
                  >
                    {outOfStock ? "Out of Stock" : `Stock: ${product.quantity}`}
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.addButton,
                    outOfStock && styles.disabledButton,
                  ]}
                  disabled={outOfStock}
                  onPress={() => addToCart(product)}
                >
                  <Text style={styles.addButtonText}>
                    {inCart ? `Added (${inCart.quantity})` : "+ Add"}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
        <View style={styles.cartHeader}>
          <Text style={styles.sectionTitle}>Shopping Cart</Text>
          <Text style={styles.sectionCount}>{cart.length} products</Text>
        </View>
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>
              Add products above to start a sale.
            </Text>
          </View>
        ) : (
          cart.map((item) => (
            <View key={item.product.id} style={styles.cartItem}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartProductName}>{item.product.name}</Text>

                <Text style={styles.cartProductPrice}>
                  {formatMoney(item.product.sellingPrice)} each
                </Text>

                <Text style={styles.cartSubtotal}>
                  Subtotal:{" "}
                  {formatMoney(item.product.sellingPrice * item.quantity)}
                </Text>
              </View>

              <View style={styles.quantitySection}>
                <View style={styles.quantityControls}>
                  <Pressable
                    style={styles.quantityButton}
                    onPress={() => changeQuantity(item.product.id, -1)}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </Pressable>

                  <Text style={styles.quantityValue}>{item.quantity}</Text>

                  <Pressable
                    style={styles.quantityButton}
                    onPress={() => changeQuantity(item.product.id, 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => removeFromCart(item.product.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
        {cart.length > 0 && (
          <View style={styles.checkoutCard}>
            <Text style={styles.checkoutTitle}>Sale Summary</Text>

            <View style={styles.checkoutRow}>
              <Text style={styles.checkoutLabel}>Items</Text>
              <Text style={styles.checkoutValue}>{totalItems}</Text>
            </View>

            <View style={styles.checkoutRow}>
              <Text style={styles.checkoutLabel}>Total Cost</Text>
              <Text style={styles.checkoutValue}>{formatMoney(totalCost)}</Text>
            </View>

            <View style={styles.checkoutRow}>
              <Text style={styles.checkoutLabel}>Estimated Profit</Text>
              <Text style={styles.checkoutProfit}>
                {formatMoney(totalProfit)}
              </Text>
            </View>

            <View style={styles.checkoutDivider} />

            <View style={styles.checkoutRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>{formatMoney(totalAmount)}</Text>
            </View>

            <Pressable
              style={[styles.completeButton, saving && styles.disabledButton]}
              disabled={saving}
              onPress={handleCompleteSale}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.completeButtonText}>Complete Sale</Text>
              )}
            </Pressable>

            <Text style={styles.checkoutNote}>
              Completing this sale will deduct the sold quantities from your
              inventory.
            </Text>
          </View>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cream,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
  },
  header: {
    marginBottom: 22,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 8,
  },
  backText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "700",
  },
  headerTitle: {
    color: COLORS.darkGreen,
    fontSize: 30,
    fontWeight: "800",
  },
  headerSubtitle: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: COLORS.green,
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  summaryLabel: {
    color: "#E0EDE3",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryAmount: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#648472",
    marginVertical: 18,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summarySmallLabel: {
    color: "#D8E6DA",
    fontSize: 12,
  },
  summarySmallValue: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 5,
  },
  summaryProfit: {
    color: "#D7F0D8",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.darkGreen,
    fontSize: 19,
    fontWeight: "800",
  },
  sectionCount: {
    color: COLORS.muted,
    fontSize: 12,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 49,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 14,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  productCategory: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  productPrice: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 7,
  },
  stockText: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  outOfStockText: {
    color: COLORS.red,
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: COLORS.lightGreen,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  addButtonText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.5,
  },
  cartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 15,
  },
  emptyCart: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyCartIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 18,
  },
  cartItem: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartItemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  cartProductName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  cartProductPrice: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  cartSubtotal: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 7,
  },
  quantitySection: {
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityButton: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    color: COLORS.green,
    fontSize: 18,
    fontWeight: "800",
  },
  quantityValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    minWidth: 15,
    textAlign: "center",
  },
  removeButton: {
    paddingTop: 9,
    paddingHorizontal: 4,
  },
  removeText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "700",
  },
  checkoutCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 19,
    marginTop: 15,
  },
  checkoutTitle: {
    color: COLORS.darkGreen,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 17,
  },
  checkoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  checkoutLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  checkoutValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  checkoutProfit: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "800",
  },
  checkoutDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 7,
  },
  totalLabel: {
    color: COLORS.darkGreen,
    fontSize: 15,
    fontWeight: "800",
  },
  totalAmount: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: "800",
  },
  completeButton: {
    backgroundColor: COLORS.green,
    borderRadius: 13,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
  checkoutNote: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
  },
  bottomSpace: {
    height: 25,
  },
});
