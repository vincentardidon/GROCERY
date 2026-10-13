import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    addExpense,
    deleteExpense,
    getExpenses,
    getSales,
    type Expense,
    type Sale,
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
  red: "#B84A43",
  orange: "#C17A35",
};

const CATEGORIES = [
  "Electricity",
  "Transportation",
  "Store Supplies",
  "Maintenance",
  "Other",
];

function formatMoney(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isThisMonth(dateString: string) {
  const date = new Date(`${dateString.replace(" ", "T")}Z`);
  const now = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
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

export default function ExpensesScreen() {
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("Other");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [expenseData, salesData] = await Promise.all([
        getExpenses(),
        getSales(),
      ]);

      setExpenses(expenseData);
      setSales(salesData);
    } catch (error) {
      console.error("Failed to load expense data:", error);
      Alert.alert("Error", "Unable to load expenses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const monthlyExpenses = expenses.filter((expense) =>
    isThisMonth(expense.createdAt),
  );

  const monthlySales = sales.filter((sale) => isThisMonth(sale.createdAt));

  const totalMonthlyExpenses = monthlyExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );

  const monthlyGrossProfit = monthlySales.reduce(
    (total, sale) => total + sale.totalProfit,
    0,
  );

  const estimatedNetProfit = monthlyGrossProfit - totalMonthlyExpenses;

  async function handleAddExpense() {
    const parsedAmount = Number(amountText);

    if (!title.trim()) {
      Alert.alert("Missing information", "Enter an expense name.");
      return;
    }

    if (
      !amountText.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than zero.");
      return;
    }

    try {
      setSaving(true);

      await addExpense(title, category, parsedAmount, note);

      setTitle("");
      setAmountText("");
      setNote("");
      setCategory("Other");
      setShowForm(false);

      await loadData();

      Alert.alert("Success", "Expense recorded successfully.");
    } catch (error) {
      console.error("Failed to save expense:", error);

      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Unable to save the expense.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteExpense(expense: Expense) {
    Alert.alert(
      "Delete Expense",
      `Delete "${expense.title}" (${formatMoney(expense.amount)})?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              await loadData();
            } catch (error) {
              console.error("Failed to delete expense:", error);
              Alert.alert("Error", "Unable to delete this expense.");
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back to Home</Text>
        </Pressable>

        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Expenses</Text>
          <Text style={styles.subtitle}>
            Track your store's operating costs.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses This Month</Text>

          <Text style={styles.expenseAmount}>
            {formatMoney(totalMonthlyExpenses)}
          </Text>

          <Text style={styles.summaryDescription}>
            {monthlyExpenses.length}{" "}
            {monthlyExpenses.length === 1
              ? "recorded expense"
              : "recorded expenses"}
          </Text>
        </View>

        <View style={styles.profitCard}>
          <Text style={styles.profitHeading}>Estimated Net Profit</Text>

          <Text
            style={[
              styles.profitAmount,
              estimatedNetProfit < 0 && styles.negativeAmount,
            ]}
          >
            {formatMoney(estimatedNetProfit)}
          </Text>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Gross profit from sales</Text>
            <Text style={styles.calculationValue}>
              {formatMoney(monthlyGrossProfit)}
            </Text>
          </View>

          <View style={styles.calculationRow}>
            <Text style={styles.calculationLabel}>Operating expenses</Text>
            <Text style={styles.calculationValue}>
              − {formatMoney(totalMonthlyExpenses)}
            </Text>
          </View>

          <View style={styles.calculationDivider} />

          <Text style={styles.calculationNote}>
            Net profit = gross profit − recorded expenses
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => setShowForm((previous) => !previous)}
        >
          <Text style={styles.addButtonText}>
            {showForm ? "− Cancel" : "+ Add Expense"}
          </Text>
        </Pressable>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Expense</Text>

            <Text style={styles.inputLabel}>Expense Name</Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Electricity bill"
              placeholderTextColor={COLORS.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <Text style={styles.inputLabel}>Amount (₱)</Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              placeholderTextColor={COLORS.muted}
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              maxLength={12}
            />

            <Text style={styles.inputLabel}>Category</Text>

            <View style={styles.categoryContainer}>
              {CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryChip,
                    category === item && styles.selectedCategory,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === item && styles.selectedCategoryText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Note (Optional)</Text>

            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Additional details"
              placeholderTextColor={COLORS.muted}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={250}
            />

            <Pressable
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleAddExpense}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Expense"}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Expense History</Text>
          <Text style={styles.historyCount}>{expenses.length} total</Text>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading expenses...</Text>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyText}>
              Record your first store expense to start tracking costs.
            </Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseTitle}>{expense.title}</Text>

                <Text style={styles.expenseCategory}>{expense.category}</Text>

                <Text style={styles.expenseDate}>
                  {formatDate(expense.createdAt)}
                </Text>

                {!!expense.note && (
                  <Text style={styles.expenseNote}>{expense.note}</Text>
                )}
              </View>

              <View style={styles.expenseActions}>
                <Text style={styles.expenseRowAmount}>
                  {formatMoney(expense.amount)}
                </Text>

                <Pressable
                  onPress={() => handleDeleteExpense(expense)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
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
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },
  expenseAmount: {
    fontSize: 28,
    color: COLORS.red,
    fontWeight: "800",
    marginTop: 8,
  },
  summaryDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
  },
  profitCard: {
    backgroundColor: COLORS.darkGreen,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  profitHeading: {
    color: "#D9E7D9",
    fontSize: 13,
    fontWeight: "600",
  },
  profitAmount: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 20,
  },
  negativeAmount: {
    color: "#FFB9B3",
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  calculationLabel: {
    color: "#D9E7D9",
    fontSize: 12,
    flex: 1,
  },
  calculationValue: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  calculationDivider: {
    height: 1,
    backgroundColor: "#527361",
    marginVertical: 5,
  },
  calculationNote: {
    color: "#D9E7D9",
    fontSize: 11,
    marginTop: 10,
  },
  addButton: {
    backgroundColor: COLORS.green,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.darkGreen,
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: COLORS.text,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.cream,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedCategory: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  categoryText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  selectedCategoryText: {
    color: COLORS.white,
  },
  saveButton: {
    backgroundColor: COLORS.darkGreen,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 22,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.darkGreen,
  },
  historyCount: {
    fontSize: 12,
    color: COLORS.muted,
  },
  expenseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.darkGreen,
  },
  expenseCategory: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: "600",
    marginTop: 5,
  },
  expenseDate: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 5,
  },
  expenseNote: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 7,
  },
  expenseActions: {
    alignItems: "flex-end",
  },
  expenseRowAmount: {
    fontSize: 15,
    color: COLORS.red,
    fontWeight: "800",
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  deleteButtonText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    color: COLORS.darkGreen,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});
