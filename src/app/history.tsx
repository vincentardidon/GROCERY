import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    getStockMovements,
    initializeDatabase,
    StockMovement,
} from "../database/database";

const COLORS = {
  green: "#245C45",
  darkGreen: "#183F30",
  lightGreen: "#E5F0E8",
  cream: "#F8F7F0",
  white: "#FFFFFF",
  text: "#24352B",
  gray: "#7A857D",
  border: "#E5E8DF",
  orange: "#9A651B",
  lightOrange: "#FFF0D9",
  red: "#C94B45",
  lightRed: "#FBEAE8",
};

export default function HistoryScreen() {
  const router = useRouter();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "IN" | "OUT">("ALL");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      await initializeDatabase();

      const savedMovements = await getStockMovements();
      setMovements(savedMovements);
    } catch (error) {
      console.error("Failed to load stock history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const filteredMovements = movements.filter((movement) => {
    return filter === "ALL" || movement.movementType === filter;
  });

  function formatDate(dateString: string) {
    const date = new Date(`${dateString.replace(" ", "T")}Z`);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function renderMovement({ item }: { item: StockMovement }) {
    const isStockIn = item.movementType === "IN";

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.productName}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>

          <View
            style={[
              styles.typeBadge,
              isStockIn ? styles.stockInBadge : styles.stockOutBadge,
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                isStockIn ? styles.stockInText : styles.stockOutText,
              ]}
            >
              {isStockIn ? "+ STOCK IN" : "− STOCK OUT"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.stockDetails}>
          <View style={styles.stockColumn}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text
              style={[
                styles.quantityValue,
                isStockIn ? styles.stockInText : styles.stockOutText,
              ]}
            >
              {isStockIn ? "+" : "−"}
              {item.quantity}
            </Text>
          </View>

          <View style={styles.stockColumn}>
            <Text style={styles.detailLabel}>Previous</Text>
            <Text style={styles.detailValue}>{item.previousStock}</Text>
          </View>

          <View style={styles.stockColumn}>
            <Text style={styles.detailLabel}>New Stock</Text>
            <Text style={styles.newStockValue}>{item.newStock}</Text>
          </View>
        </View>

        {item.note ? (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>NOTE</Text>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>YOUR STORE</Text>
          <Text style={styles.title}>Stock History</Text>
          <Text style={styles.subtitle}>Track every inventory movement.</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Transactions</Text>
        <Text style={styles.summaryValue}>{movements.length}</Text>

        <View style={styles.summaryBottom}>
          <View style={styles.summaryItem}>
            <Text style={styles.summarySmallLabel}>Stock In</Text>
            <Text style={styles.summaryInValue}>
              {movements.filter((m) => m.movementType === "IN").length}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summarySmallLabel}>Stock Out</Text>
            <Text style={styles.summaryOutValue}>
              {movements.filter((m) => m.movementType === "OUT").length}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(["ALL", "IN", "OUT"] as const).map((value) => {
          const active = filter === value;

          return (
            <Pressable
              key={value}
              style={[styles.filterButton, active && styles.activeFilterButton]}
              onPress={() => setFilter(value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  active && styles.activeFilterButtonText,
                ]}
              >
                {value === "ALL"
                  ? "All"
                  : value === "IN"
                    ? "Stock In"
                    : "Stock Out"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading transaction history...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMovements}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMovement}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>↻</Text>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Stock In and Stock Out transactions will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    color: COLORS.green,
    fontSize: 32,
    lineHeight: 36,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: COLORS.green,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 22,
    marginBottom: 20,
  },
  summaryLabel: {
    color: "#D5E6D8",
    fontSize: 12,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 5,
  },
  summaryBottom: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#547C66",
    gap: 40,
  },
  summaryItem: {
    flex: 1,
  },
  summarySmallLabel: {
    color: "#D5E6D8",
    fontSize: 11,
    marginBottom: 5,
  },
  summaryInValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },
  summaryOutValue: {
    color: "#FFD49A",
    fontSize: 20,
    fontWeight: "800",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeFilterButton: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  filterButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  activeFilterButtonText: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 17,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  dateText: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 6,
  },
  typeBadge: {
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  stockInBadge: {
    backgroundColor: COLORS.lightGreen,
  },
  stockOutBadge: {
    backgroundColor: COLORS.lightOrange,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  stockInText: {
    color: COLORS.green,
  },
  stockOutText: {
    color: COLORS.orange,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },
  stockDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stockColumn: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.gray,
    fontSize: 10,
    marginBottom: 6,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  quantityValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  newStockValue: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "800",
  },
  noteContainer: {
    marginTop: 15,
    backgroundColor: COLORS.cream,
    borderRadius: 10,
    padding: 12,
  },
  noteLabel: {
    color: COLORS.gray,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  noteText: {
    color: COLORS.text,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: COLORS.gray,
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  emptyIcon: {
    color: COLORS.green,
    fontSize: 45,
    marginBottom: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },
});
