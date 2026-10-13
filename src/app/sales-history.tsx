import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    getSaleItems,
    getSales,
    type Sale,
    type SaleItem,
} from "../database/database";

const COLORS = {
  green: "#245C43",
  darkGreen: "#173D2D",
  cream: "#F8F7F0",
  white: "#FFFFFF",
  sage: "#E5EDE5",
  text: "#24352B",
  muted: "#7A857C",
  border: "#E4E8E0",
  orange: "#C17A35",
  red: "#B84A43",
};

function formatMoney(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString.replace(" ", "T")}Z`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string) {
  const date = new Date(`${dateString.replace(" ", "T")}Z`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isToday(dateString: string) {
  const date = new Date(`${dateString.replace(" ", "T")}Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function SalesHistoryScreen() {
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<number | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadSales = useCallback(async () => {
    try {
      const result = await getSales();
      setSales(result);
    } catch (error) {
      console.error("Failed to load sales:", error);
      Alert.alert("Error", "Unable to load sales history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSales();
    }, [loadSales]),
  );

  const todaysSales = sales.filter((sale) => isToday(sale.createdAt));

  const todayRevenue = todaysSales.reduce(
    (total, sale) => total + sale.totalAmount,
    0,
  );

  const todayProfit = todaysSales.reduce(
    (total, sale) => total + sale.totalProfit,
    0,
  );

  async function handleSalePress(saleId: number) {
    if (selectedSale === saleId) {
      setSelectedSale(null);
      setSaleItems([]);
      return;
    }

    setSelectedSale(saleId);
    setLoadingDetails(true);

    try {
      const items = await getSaleItems(saleId);
      setSaleItems(items);
    } catch (error) {
      console.error("Failed to load sale details:", error);
      Alert.alert("Error", "Unable to load the details of this sale.");
    } finally {
      setLoadingDetails(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back to Home</Text>
        </Pressable>

        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Sales History</Text>
          <Text style={styles.subtitle}>
            Track your store's sales and earnings.
          </Text>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Today's Sales</Text>
            <Text style={styles.revenueAmount}>
              {formatMoney(todayRevenue)}
            </Text>
            <Text style={styles.summaryDescription}>
              {todaysSales.length}{" "}
              {todaysSales.length === 1 ? "transaction" : "transactions"}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Today's Profit</Text>
            <Text
              style={[
                styles.profitAmount,
                todayProfit < 0 && styles.negativeAmount,
              ]}
            >
              {formatMoney(todayProfit)}
            </Text>
            <Text style={styles.summaryDescription}>Estimated earnings</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Transactions</Text>
          <Text style={styles.transactionCount}>{sales.length} total</Text>
        </View>

        {loading ? (
          <View style={styles.centerMessage}>
            <ActivityIndicator size="large" color={COLORS.green} />
            <Text style={styles.messageText}>Loading sales...</Text>
          </View>
        ) : sales.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No sales yet</Text>
            <Text style={styles.emptyDescription}>
              Completed transactions will appear here.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/sales")}
            >
              <Text style={styles.primaryButtonText}>Record a Sale</Text>
            </Pressable>
          </View>
        ) : (
          sales.map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              <Pressable
                style={styles.saleHeader}
                onPress={() => handleSalePress(sale.id)}
              >
                <View style={styles.saleInfo}>
                  <Text style={styles.saleNumber}>Transaction #{sale.id}</Text>

                  <Text style={styles.saleDate}>
                    {formatDate(sale.createdAt)}
                  </Text>

                  <Text style={styles.saleTime}>
                    {formatTime(sale.createdAt)}
                  </Text>
                </View>

                <View style={styles.saleAmountContainer}>
                  <Text style={styles.saleAmount}>
                    {formatMoney(sale.totalAmount)}
                  </Text>

                  <Text style={styles.saleProfit}>
                    Profit: {formatMoney(sale.totalProfit)}
                  </Text>

                  <Text style={styles.viewDetails}>
                    {selectedSale === sale.id
                      ? "Hide details ▲"
                      : "View details ▼"}
                  </Text>
                </View>
              </Pressable>

              {selectedSale === sale.id && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Products Sold</Text>

                  {loadingDetails ? (
                    <ActivityIndicator
                      color={COLORS.green}
                      style={styles.detailsLoader}
                    />
                  ) : saleItems.length === 0 ? (
                    <Text style={styles.messageText}>
                      No product details found.
                    </Text>
                  ) : (
                    saleItems.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>
                            {item.productName}
                          </Text>

                          <Text style={styles.itemQuantity}>
                            {item.quantity} ×{" "}
                            {formatMoney(item.unitSellingPrice)}
                          </Text>
                        </View>

                        <Text style={styles.itemSubtotal}>
                          {formatMoney(item.subtotal)}
                        </Text>
                      </View>
                    ))
                  )}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Cost</Text>
                    <Text style={styles.totalValue}>
                      {formatMoney(sale.totalCost)}
                    </Text>
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Profit</Text>
                    <Text style={[styles.totalValue, styles.profitHighlight]}>
                      {formatMoney(sale.totalProfit)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ))
        )}

        {!loading && sales.length > 0 && (
          <Text style={styles.footerText}>
            Showing all completed transactions.
          </Text>
        )}
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
    paddingTop: 48,
    paddingBottom: 36,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 18,
  },
  backText: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: "700",
  },
  headingContainer: {
    marginBottom: 22,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.darkGreen,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 6,
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 10,
  },
  revenueAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.green,
  },
  profitAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.orange,
  },
  negativeAmount: {
    color: COLORS.red,
  },
  summaryDescription: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.darkGreen,
  },
  transactionCount: {
    fontSize: 12,
    color: COLORS.muted,
  },
  saleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: "hidden",
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  saleInfo: {
    flex: 1,
  },
  saleNumber: {
    color: COLORS.darkGreen,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 7,
  },
  saleDate: {
    color: COLORS.text,
    fontSize: 13,
  },
  saleTime: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  saleAmountContainer: {
    alignItems: "flex-end",
    flexShrink: 1,
  },
  saleAmount: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "800",
  },
  saleProfit: {
    color: COLORS.orange,
    fontSize: 12,
    marginTop: 5,
  },
  viewDetails: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    backgroundColor: "#FBFCF8",
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.darkGreen,
    marginBottom: 12,
  },
  detailsLoader: {
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  itemQuantity: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  itemSubtotal: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  totalLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  totalValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  profitHighlight: {
    color: COLORS.green,
  },
  centerMessage: {
    alignItems: "center",
    padding: 30,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  messageText: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.darkGreen,
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.green,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 18,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});
