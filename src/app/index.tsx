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
  getInventorySummary,
  initializeDatabase,
  InventorySummary,
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
};

export default function HomeScreen() {
  const router = useRouter();

  const [summary, setSummary] = useState<InventorySummary>({
    totalInventoryCost: 0,
    potentialSales: 0,
    potentialProfit: 0,
    totalProducts: 0,
    totalUnits: 0,
  });

  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      await initializeDatabase();

      const result = await getInventorySummary();
      setSummary(result);
    } catch (error) {
      console.error("Failed to load inventory summary:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSummary();
    }, [loadSummary]),
  );

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.title}>GROCERY</Text>
          <Text style={styles.subtitle}>Your store, organized.</Text>
        </View>

        <View style={styles.logoCircle}>
          <Text style={styles.logo}>G</Text>
        </View>
      </View>

      <View style={styles.summaryHeader}>
        <Text style={styles.sectionTitle}>Inventory Overview</Text>
        <Text style={styles.sectionSubtitle}>
          Your current stock value and estimated earnings
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.green}
          style={styles.loader}
        />
      ) : (
        <>
          <View style={styles.mainCard}>
            <Text style={styles.mainCardLabel}>Total Inventory Cost</Text>

            <Text style={styles.mainCardAmount}>
              {formatCurrency(summary.totalInventoryCost)}
            </Text>

            <Text style={styles.mainCardDescription}>
              Estimated amount invested in your current stock
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Text style={styles.statEmoji}>🛍️</Text>
              </View>

              <Text style={styles.statLabel}>Potential Sales</Text>

              <Text style={styles.statAmount}>
                {formatCurrency(summary.potentialSales)}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Text style={styles.statEmoji}>💰</Text>
              </View>

              <Text style={styles.statLabel}>Potential Profit</Text>

              <Text style={styles.profitAmount}>
                {formatCurrency(summary.potentialProfit)}
              </Text>
            </View>
          </View>

          <View style={styles.stockSummary}>
            <View style={styles.stockSummaryItem}>
              <Text style={styles.stockNumber}>{summary.totalProducts}</Text>
              <Text style={styles.stockLabel}>Products</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.stockSummaryItem}>
              <Text style={styles.stockNumber}>{summary.totalUnits}</Text>
              <Text style={styles.stockLabel}>Total Units</Text>
            </View>
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.actionsContainer}>
        <ActionButton
          title="Manage Inventory"
          description="Add, edit, and manage products"
          icon="📦"
          onPress={() => router.push("/inventory")}
        />

        <ActionButton
          title="Record a Sale"
          description="Sell products and manage customer purchases"
          icon="🛍️"
          onPress={() => router.push("/sales")}
        />

        <ActionButton
          title="Sales History"
          description="View today's sales and transaction details"
          icon="🧾"
          onPress={() => router.push("/sales-history")}
        />

        <ActionButton
          title="Stock History"
          description="View stock-in and stock-out records"
          icon="📋"
          onPress={() => router.push("/history")}
        />

        <ActionButton
          title="Restock Suggestions"
          description="Find products that need replenishing"
          icon="🛒"
          onPress={() => router.push("/restock")}
        />

        <ActionButton
          title="Expense Tracking"
          description="Track store expenses and estimated net profit"
          icon="🧾"
          onPress={() => router.push("/expenses")}
        />

        <ActionButton
          title="Backup & Restore"
          description="Create and restore backups of your store data"
          icon="💾"
          onPress={() => router.push("/backup")}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          GROCERY • Simple Inventory Management
        </Text>
      </View>
    </ScrollView>
  );
}

type ActionButtonProps = {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
};

function ActionButton({
  title,
  description,
  icon,
  onPress,
}: ActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }: { pressed: boolean }) => [
        styles.actionButton,
        pressed && styles.actionButtonPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Text style={styles.actionEmoji}>{icon}</Text>
      </View>

      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>

      <Text style={styles.actionArrow}>›</Text>
    </Pressable>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  greeting: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 5,
  },
  title: {
    color: COLORS.darkGreen,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
  },
  logoCircle: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "900",
  },
  summaryHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: COLORS.darkGreen,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  loader: {
    marginVertical: 40,
  },
  mainCard: {
    backgroundColor: COLORS.green,
    borderRadius: 22,
    padding: 22,
    marginBottom: 14,
  },
  mainCardLabel: {
    color: "#E3EDE5",
    fontSize: 14,
    fontWeight: "600",
  },
  mainCardAmount: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 12,
  },
  mainCardDescription: {
    color: "#E3EDE5",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statEmoji: {
    fontSize: 17,
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 7,
  },
  statAmount: {
    color: COLORS.darkGreen,
    fontSize: 17,
    fontWeight: "800",
  },
  profitAmount: {
    color: COLORS.green,
    fontSize: 17,
    fontWeight: "800",
  },
  stockSummary: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stockSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  stockNumber: {
    color: COLORS.darkGreen,
    fontSize: 24,
    fontWeight: "900",
  },
  stockLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.lightGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  actionEmoji: {
    fontSize: 21,
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 13,
  },
  actionTitle: {
    color: COLORS.darkGreen,
    fontSize: 14,
    fontWeight: "800",
  },
  actionDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  actionArrow: {
    color: COLORS.green,
    fontSize: 28,
    marginLeft: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: 30,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 11,
  },
});
