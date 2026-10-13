import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    getLowStockProducts,
    initializeDatabase,
    Product,
} from "../database/database";

const COLORS = {
  green: "#245C45",
  darkGreen: "#173F30",
  cream: "#F8F7F0",
  white: "#FFFFFF",
  text: "#24352C",
  muted: "#78857B",
  border: "#E4E8DF",
  red: "#C74747",
  redBackground: "#FCEDEC",
  yellow: "#A86C18",
  yellowBackground: "#FFF4DD",
};

const TARGET_STOCK = 20;

export default function RestockScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      await initializeDatabase();
      const result = await getLowStockProducts(5);
      setProducts(result);
    } catch (error) {
      console.error("Failed to load restock suggestions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProducts();
    }, [loadProducts]),
  );

  const outOfStock = products.filter(
    (product) => product.quantity === 0,
  ).length;

  const lowStock = products.filter((product) => product.quantity > 0).length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Restock Suggestions</Text>

        <Text style={styles.subtitle}>
          Check which products need replenishing in your store.
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{outOfStock}</Text>
            <Text style={styles.summaryLabel}>Out of Stock</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{lowStock}</Text>
            <Text style={styles.summaryLabel}>Low Stock</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.green}
            style={styles.loader}
          />
        ) : products.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>Stock Levels Look Good!</Text>
            <Text style={styles.emptyText}>
              No products have five or fewer items remaining.
            </Text>
          </View>
        ) : (
          products.map((product) => {
            const suggestedQuantity = Math.max(
              0,
              TARGET_STOCK - product.quantity,
            );

            const isOutOfStock = product.quantity === 0;

            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.category}>{product.category}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isOutOfStock
                        ? styles.outOfStockBadge
                        : styles.lowStockBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: isOutOfStock ? COLORS.red : COLORS.yellow,
                        },
                      ]}
                    >
                      {isOutOfStock ? "OUT OF STOCK" : "LOW STOCK"}
                    </Text>
                  </View>
                </View>

                <View style={styles.stockRow}>
                  <Text style={styles.stockLabel}>Current quantity</Text>
                  <Text style={styles.stockValue}>
                    {product.quantity} units
                  </Text>
                </View>

                <View style={styles.stockRow}>
                  <Text style={styles.stockLabel}>Suggested restock</Text>
                  <Text style={styles.suggestedValue}>
                    +{suggestedQuantity} units
                  </Text>
                </View>

                <Text style={styles.note}>
                  Suggestion is based on a target stock of {TARGET_STOCK} units.
                </Text>
              </View>
            );
          })
        )}

        <Pressable style={styles.refreshButton} onPress={loadProducts}>
          <Text style={styles.refreshButtonText}>Refresh Suggestions</Text>
        </Pressable>
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
    padding: 20,
    paddingTop: 55,
    paddingBottom: 35,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 15,
  },
  backText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: COLORS.darkGreen,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 22,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.green,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  loader: {
    marginTop: 35,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    color: COLORS.green,
    fontSize: 36,
    fontWeight: "800",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 12,
    textAlign: "center",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  productCard: {
    backgroundColor: COLORS.white,
    padding: 17,
    borderRadius: 18,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 18,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  category: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  outOfStockBadge: {
    backgroundColor: COLORS.redBackground,
  },
  lowStockBadge: {
    backgroundColor: COLORS.yellowBackground,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  stockLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  stockValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  suggestedValue: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: "800",
  },
  note: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  refreshButton: {
    backgroundColor: COLORS.green,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
