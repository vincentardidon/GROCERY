import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
    addProduct,
    deleteProduct,
    getProducts,
    initializeDatabase,
    Product,
    recordStockMovement,
    StockMovementType,
    updateProduct,
} from "../database/database";

const COLORS = {
  green: "#245C45",
  darkGreen: "#183F30",
  lightGreen: "#E5F0E8",
  sage: "#A7BDA9",
  cream: "#F8F7F0",
  white: "#FFFFFF",
  text: "#24352B",
  gray: "#7A857D",
  border: "#E5E8DF",
  red: "#C94B45",
  lightRed: "#FBEAE8",
  orange: "#D99135",
};

const CATEGORIES = [
  "All",
  "Noodles",
  "Canned Goods",
  "Coffee",
  "Snacks",
  "Beverages",
  "Laundry",
  "Personal Care",
  "Condiments",
  "Household",
  "Other",
];

type ProductForm = {
  name: string;
  category: string;
  quantity: string;
  buyingPrice: string;
  sellingPrice: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "Other",
  quantity: "0",
  buyingPrice: "",
  sellingPrice: "",
};

export default function InventoryScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [databaseError, setDatabaseError] = useState(false);

  // Add/Edit product modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  // Stock In / Stock Out modal
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockMovementType, setStockMovementType] =
    useState<StockMovementType>("IN");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [stockSaving, setStockSaving] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      setLoading(true);
      setDatabaseError(false);

      await initializeDatabase();

      const savedProducts = await getProducts();
      setProducts(savedProducts);
    } catch (error) {
      console.error("Failed to load inventory:", error);
      setDatabaseError(true);

      Alert.alert(
        "Database Error",
        "The inventory could not be loaded. Please close and reopen the app.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const lowStockCount = products.filter(
    (product) => product.quantity <= 5,
  ).length;

  const inventoryValue = products.reduce(
    (total, product) => total + product.quantity * product.buyingPrice,
    0,
  );

  const totalUnits = products.reduce(
    (total, product) => total + product.quantity,
    0,
  );

  function formatPeso(amount: number) {
    return `₱${amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // ------------------------------------------
  // ADD / EDIT PRODUCT FUNCTIONS
  // ------------------------------------------

  function openAddForm() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);

    setForm({
      name: product.name,
      category: product.category,
      quantity: String(product.quantity),
      buyingPrice: String(product.buyingPrice),
      sellingPrice: String(product.sellingPrice),
    });

    setModalVisible(true);
  }

  function closeForm() {
    if (saving) return;

    setModalVisible(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function saveProduct() {
    if (saving) return;

    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const buyingPrice = Number(form.buyingPrice);
    const sellingPrice = Number(form.sellingPrice);

    if (!name) {
      Alert.alert("Missing Product Name", "Please enter the product name.");
      return;
    }

    if (
      form.quantity.trim() === "" ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      Alert.alert(
        "Invalid Quantity",
        "Please enter a whole number of zero or greater.",
      );
      return;
    }

    if (
      form.buyingPrice.trim() === "" ||
      !Number.isFinite(buyingPrice) ||
      buyingPrice < 0
    ) {
      Alert.alert("Invalid Buying Price", "Please enter a valid buying price.");
      return;
    }

    if (
      form.sellingPrice.trim() === "" ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      Alert.alert(
        "Invalid Selling Price",
        "Please enter a valid selling price.",
      );
      return;
    }

    const product: Product = {
      id: editingProduct
        ? editingProduct.id
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      category: form.category,
      quantity,
      buyingPrice,
      sellingPrice,
    };

    try {
      setSaving(true);

      if (editingProduct) {
        await updateProduct(product);
      } else {
        await addProduct(product);
      }

      const savedProducts = await getProducts();
      setProducts(savedProducts);

      setModalVisible(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);

      Alert.alert(
        editingProduct ? "Product Updated" : "Product Added",
        editingProduct
          ? `${name} has been updated successfully.`
          : `${name} has been saved to your inventory.`,
      );
    } catch (error) {
      console.error("Failed to save product:", error);

      Alert.alert(
        "Save Failed",
        "The product could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------
  // STOCK IN / STOCK OUT FUNCTIONS
  // ------------------------------------------

  function openStockForm(product: Product, movementType: StockMovementType) {
    setStockProduct(product);
    setStockMovementType(movementType);
    setStockQuantity("");
    setStockNote("");
    setStockModalVisible(true);
  }

  function closeStockForm() {
    if (stockSaving) return;

    setStockModalVisible(false);
    setStockProduct(null);
    setStockQuantity("");
    setStockNote("");
  }

  async function saveStockChange() {
    if (stockSaving || !stockProduct) return;

    const quantity = Number(stockQuantity);

    // Validate the quantity
    if (
      stockQuantity.trim() === "" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      Alert.alert(
        "Invalid Quantity",
        "Enter a whole number greater than zero.",
      );
      return;
    }

    // Check whether enough stock is available
    if (stockMovementType === "OUT" && quantity > stockProduct.quantity) {
      Alert.alert(
        "Insufficient Stock",
        `Only ${stockProduct.quantity} units of ${stockProduct.name} are available.`,
      );
      return;
    }

    try {
      setStockSaving(true);

      // Update stock and save its transaction history in SQLite
      await recordStockMovement(
        stockProduct.id,
        stockMovementType,
        quantity,
        stockNote,
      );

      // Refresh inventory
      const savedProducts = await getProducts();
      setProducts(savedProducts);

      const productName = stockProduct.name;
      const movementLabel = stockMovementType === "IN" ? "Added" : "Removed";

      // Close and clear the form
      setStockModalVisible(false);
      setStockProduct(null);
      setStockQuantity("");
      setStockNote("");

      Alert.alert(
        "Stock Updated",
        `${productName}: ${movementLabel} ${quantity} units successfully.`,
      );
    } catch (error) {
      console.error("Failed to update stock:", error);

      Alert.alert(
        "Stock Update Failed",
        error instanceof Error
          ? error.message
          : "Unable to update stock. Please try again.",
      );
    } finally {
      setStockSaving(false);
    }
  }

  const previewQuantity = Number(stockQuantity);

  const hasValidStockQuantity =
    stockQuantity.trim() !== "" &&
    Number.isInteger(previewQuantity) &&
    previewQuantity > 0;

  const projectedStock =
    stockProduct && hasValidStockQuantity
      ? stockMovementType === "IN"
        ? stockProduct.quantity + previewQuantity
        : stockProduct.quantity - previewQuantity
      : (stockProduct?.quantity ?? 0);

  // ------------------------------------------
  // DELETE PRODUCT
  // ------------------------------------------

  function confirmDelete(product: Product) {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
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
              await deleteProduct(product.id);

              const savedProducts = await getProducts();
              setProducts(savedProducts);

              Alert.alert(
                "Product Deleted",
                `${product.name} has been removed from your inventory.`,
              );
            } catch (error) {
              console.error("Failed to delete product:", error);

              Alert.alert(
                "Delete Failed",
                "The product could not be deleted. Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  // ------------------------------------------
  // PRODUCT CARD
  // ------------------------------------------

  function renderProduct({ item }: { item: Product }) {
    const isLowStock = item.quantity <= 5;
    const isOutOfStock = item.quantity === 0;

    return (
      <View style={styles.productCard}>
        <View style={styles.productTop}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
          </View>

          <View
            style={[
              styles.stockBadge,
              isOutOfStock
                ? styles.outOfStockBadge
                : isLowStock
                  ? styles.lowStockBadge
                  : styles.availableBadge,
            ]}
          >
            <Text
              style={[
                styles.stockBadgeText,
                isOutOfStock
                  ? styles.outOfStockText
                  : isLowStock
                    ? styles.lowStockText
                    : styles.availableText,
              ]}
            >
              {isOutOfStock
                ? "Out of Stock"
                : isLowStock
                  ? "Low Stock"
                  : "In Stock"}
            </Text>
          </View>
        </View>

        <View style={styles.productDivider} />

        <View style={styles.productDetails}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.quantityValue}>{item.quantity} units</Text>
          </View>

          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Buying Price</Text>
            <Text style={styles.detailValue}>
              {formatPeso(item.buyingPrice)}
            </Text>
          </View>

          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Selling Price</Text>
            <Text style={styles.sellingPriceValue}>
              {formatPeso(item.sellingPrice)}
            </Text>
          </View>
        </View>

        <View style={styles.productFooter}>
          <Text style={styles.stockValueLabel}>
            Stock value: {formatPeso(item.quantity * item.buyingPrice)}
          </Text>

          <View style={styles.productActions}>
            <Pressable
              style={styles.stockInButton}
              onPress={() => openStockForm(item, "IN")}
            >
              <Text style={styles.stockInButtonText}>+ Stock In</Text>
            </Pressable>

            <Pressable
              style={styles.stockOutButton}
              onPress={() => openStockForm(item, "OUT")}
            >
              <Text style={styles.stockOutButtonText}>− Stock Out</Text>
            </Pressable>

            <Pressable
              style={styles.editButton}
              onPress={() => openEditForm(item)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>

            <Pressable
              style={styles.deleteButton}
              onPress={() => confirmDelete(item)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ------------------------------------------
  // INVENTORY HEADER
  // ------------------------------------------

  function renderHeader() {
    return (
      <View>
        <View style={styles.headingRow}>
          <View style={styles.headingTextContainer}>
            <Text style={styles.eyebrow}>YOUR STORE</Text>
            <Text style={styles.screenTitle}>Inventory</Text>
            <Text style={styles.subtitle}>Keep your products organized.</Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>G</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Inventory Value</Text>

          <Text style={styles.summaryValue}>{formatPeso(inventoryValue)}</Text>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBottom}>
            <View>
              <Text style={styles.summarySmallLabel}>Different Products</Text>
              <Text style={styles.summarySmallValue}>{products.length}</Text>
            </View>

            <View>
              <Text style={styles.summarySmallLabel}>Total Units</Text>
              <Text style={styles.summarySmallValue}>{totalUnits}</Text>
            </View>

            <View>
              <Text style={styles.summarySmallLabel}>Low Stock</Text>
              <Text style={styles.summaryWarningValue}>{lowStockCount}</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.historyButton}
          onPress={() => router.push("/history")}
        >
          <Text style={styles.historyButtonText}>↻ View Stock History</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Your Products</Text>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={COLORS.gray}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />

          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Text style={styles.clearSearch}>✕</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;

            return (
              <Pressable
                key={category}
                style={[
                  styles.categoryChip,
                  active && styles.activeCategoryChip,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.activeCategoryChipText,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.listHeading}>
          <Text style={styles.listHeadingTitle}>
            {selectedCategory === "All" ? "All Products" : selectedCategory}
          </Text>

          <Text style={styles.productCount}>
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "item" : "items"}
          </Text>
        </View>
      </View>
    );
  }

  // ------------------------------------------
  // LOADING SCREEN
  // ------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />

        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>G</Text>
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.green}
          style={styles.loadingSpinner}
        />

        <Text style={styles.loadingTitle}>Preparing your inventory</Text>

        <Text style={styles.loadingSubtitle}>
          Loading your saved products...
        </Text>
      </SafeAreaView>
    );
  }

  // ------------------------------------------
  // MAIN INVENTORY SCREEN
  // ------------------------------------------

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />

      {databaseError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Inventory</Text>

          <Text style={styles.errorMessage}>
            Your saved products could not be loaded.
          </Text>

          <Pressable style={styles.retryButton} onPress={loadInventory}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>▤</Text>
              </View>

              <Text style={styles.emptyTitle}>
                {search.trim()
                  ? "No matching products"
                  : "Your inventory is empty"}
              </Text>

              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? "Try another product name or category."
                  : "Add your first product to get started."}
              </Text>

              {!search.trim() && (
                <Pressable style={styles.emptyAddButton} onPress={openAddForm}>
                  <Text style={styles.emptyAddButtonText}>
                    + Add Your First Product
                  </Text>
                </Pressable>
              )}
            </View>
          }
          ListFooterComponent={<View style={styles.listFooter} />}
        />
      )}

      {/* ------------------------------------- */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ------------------------------------- */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeForm} />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeading}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingProduct ? "Edit Product" : "Add Product"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Enter the product details below.
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={closeForm}
                disabled={saving}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              <Text style={styles.inputLabel}>Product Name</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Lucky Me Pancit Canton"
                placeholderTextColor={COLORS.gray}
                value={form.name}
                onChangeText={(value) => updateForm("name", value)}
                maxLength={100}
                editable={!saving}
              />

              <Text style={styles.inputLabel}>Category</Text>

              <View style={styles.formCategoryContainer}>
                {CATEGORIES.filter((category) => category !== "All").map(
                  (category) => {
                    const active = form.category === category;

                    return (
                      <Pressable
                        key={category}
                        style={[
                          styles.formCategoryChip,
                          active && styles.formCategoryChipActive,
                        ]}
                        onPress={() => updateForm("category", category)}
                        disabled={saving}
                      >
                        <Text
                          style={[
                            styles.formCategoryText,
                            active && styles.formCategoryTextActive,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <Text style={styles.inputLabel}>Quantity</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                placeholderTextColor={COLORS.gray}
                value={form.quantity}
                onChangeText={(value) =>
                  updateForm("quantity", value.replace(/[^0-9]/g, ""))
                }
                keyboardType="number-pad"
                editable={!saving}
              />

              <Text style={styles.inputLabel}>Buying Price (₱)</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 12.00"
                placeholderTextColor={COLORS.gray}
                value={form.buyingPrice}
                onChangeText={(value) =>
                  updateForm("buyingPrice", value.replace(/[^0-9.]/g, ""))
                }
                keyboardType="decimal-pad"
                editable={!saving}
              />

              <Text style={styles.inputLabel}>Selling Price (₱)</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 15.00"
                placeholderTextColor={COLORS.gray}
                value={form.sellingPrice}
                onChangeText={(value) =>
                  updateForm("sellingPrice", value.replace(/[^0-9.]/g, ""))
                }
                keyboardType="decimal-pad"
                editable={!saving}
              />

              <View style={styles.profitPreview}>
                <Text style={styles.profitPreviewLabel}>Profit per item</Text>

                <Text
                  style={[
                    styles.profitPreviewValue,
                    Number(form.sellingPrice) - Number(form.buyingPrice) < 0
                      ? styles.negativeProfit
                      : null,
                  ]}
                >
                  {formatPeso(
                    (Number(form.sellingPrice) || 0) -
                      (Number(form.buyingPrice) || 0),
                  )}
                </Text>
              </View>

              <Pressable
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={saveProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? "Save Changes" : "Save Product"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={closeForm}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ------------------------------------- */}
      {/* STOCK IN / STOCK OUT MODAL */}
      {/* ------------------------------------- */}

      <Modal
        visible={stockModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeStockForm}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeStockForm} />

          <View style={styles.stockModalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeading}>
              <View>
                <Text style={styles.modalTitle}>
                  {stockMovementType === "IN" ? "Stock In" : "Stock Out"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {stockProduct?.name ?? "Update product quantity"}
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={closeStockForm}
                disabled={stockSaving}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              <View style={styles.currentStockCard}>
                <View>
                  <Text style={styles.currentStockLabel}>CURRENT STOCK</Text>

                  <Text style={styles.currentStockValue}>
                    {stockProduct?.quantity ?? 0} units
                  </Text>
                </View>

                <View style={styles.currentStockIcon}>
                  <Text style={styles.currentStockIconText}>G</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Transaction Type</Text>

              <View style={styles.movementToggle}>
                <Pressable
                  style={[
                    styles.movementOption,
                    stockMovementType === "IN" && styles.movementOptionInActive,
                  ]}
                  onPress={() => setStockMovementType("IN")}
                  disabled={stockSaving}
                >
                  <Text
                    style={[
                      styles.movementOptionText,
                      stockMovementType === "IN" &&
                        styles.movementOptionTextActive,
                    ]}
                  >
                    + Stock In
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.movementOption,
                    stockMovementType === "OUT" &&
                      styles.movementOptionOutActive,
                  ]}
                  onPress={() => setStockMovementType("OUT")}
                  disabled={stockSaving}
                >
                  <Text
                    style={[
                      styles.movementOptionText,
                      stockMovementType === "OUT" &&
                        styles.movementOptionTextActive,
                    ]}
                  >
                    − Stock Out
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>
                Quantity to {stockMovementType === "IN" ? "Add" : "Remove"}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter a whole number"
                placeholderTextColor={COLORS.gray}
                value={stockQuantity}
                onChangeText={(value) =>
                  setStockQuantity(value.replace(/[^0-9]/g, ""))
                }
                keyboardType="number-pad"
                editable={!stockSaving}
              />

              <Text style={styles.inputLabel}>Note (Optional)</Text>

              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder={
                  stockMovementType === "IN"
                    ? "e.g. New delivery from supplier"
                    : "e.g. Sold to customer or damaged goods"
                }
                placeholderTextColor={COLORS.gray}
                value={stockNote}
                onChangeText={setStockNote}
                multiline
                maxLength={250}
                editable={!stockSaving}
              />

              <View style={styles.stockPreviewCard}>
                <View style={styles.stockPreviewTextContainer}>
                  <Text style={styles.stockPreviewLabel}>
                    Expected remaining stock
                  </Text>

                  <Text style={styles.stockPreviewHint}>
                    {hasValidStockQuantity
                      ? "After this transaction"
                      : "Enter a quantity to preview"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.stockPreviewValue,
                    projectedStock < 0 && styles.negativeProfit,
                  ]}
                >
                  {projectedStock} units
                </Text>
              </View>

              {stockMovementType === "OUT" &&
                hasValidStockQuantity &&
                stockProduct &&
                previewQuantity > stockProduct.quantity && (
                  <Text style={styles.stockWarningText}>
                    You cannot remove more units than are available.
                  </Text>
                )}

              <Pressable
                style={[
                  styles.saveButton,
                  stockMovementType === "OUT" && styles.stockOutConfirmButton,
                  stockSaving && styles.disabledButton,
                ]}
                onPress={saveStockChange}
                disabled={stockSaving}
              >
                {stockSaving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {stockMovementType === "IN"
                      ? "Confirm Stock In"
                      : "Confirm Stock Out"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={closeStockForm}
                disabled={stockSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ------------------------------------------
// STYLES
// ------------------------------------------

const styles = StyleSheet.create({
  historyButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  historyButtonText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: "800",
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  headingTextContainer: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 5,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 5,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.green,
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "800",
  },
  summaryCard: {
    backgroundColor: COLORS.green,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
  },
  summaryLabel: {
    color: "#D5E6D8",
    fontSize: 13,
    fontWeight: "500",
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 7,
    letterSpacing: -0.8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#547C66",
    marginVertical: 20,
  },
  summaryBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summarySmallLabel: {
    color: "#D5E6D8",
    fontSize: 11,
    marginBottom: 7,
  },
  summarySmallValue: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "800",
  },
  summaryWarningValue: {
    color: "#FFD49A",
    fontSize: 21,
    fontWeight: "800",
  },
  addProductButton: {
    backgroundColor: COLORS.darkGreen,
    borderRadius: 15,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  addProductButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 14,
    height: 51,
  },
  searchIcon: {
    color: COLORS.green,
    fontSize: 27,
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 8,
  },
  clearSearch: {
    color: COLORS.gray,
    fontSize: 17,
    padding: 5,
  },
  categoryScroll: {
    marginTop: 16,
    marginBottom: 22,
    marginHorizontal: -20,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  activeCategoryChip: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  categoryChipText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  activeCategoryChipText: {
    color: COLORS.white,
  },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  listHeadingTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  productCount: {
    color: COLORS.gray,
    fontSize: 12,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#ECEDE6",
  },
  productTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  productCategory: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 5,
  },
  stockBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },
  availableBadge: {
    backgroundColor: COLORS.lightGreen,
  },
  lowStockBadge: {
    backgroundColor: "#FFF0D9",
  },
  outOfStockBadge: {
    backgroundColor: COLORS.lightRed,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  availableText: {
    color: COLORS.green,
  },
  lowStockText: {
    color: "#9A651B",
  },
  outOfStockText: {
    color: COLORS.red,
  },
  productDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },
  productDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.gray,
    fontSize: 10,
    marginBottom: 7,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  quantityValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  sellingPriceValue: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "800",
  },
  productFooter: {
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  stockValueLabel: {
    color: COLORS.gray,
    fontSize: 11,
  },
  productActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stockInButton: {
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stockInButtonText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "800",
  },
  stockOutButton: {
    backgroundColor: "#FFF0D9",
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stockOutButtonText: {
    color: "#9A651B",
    fontSize: 11,
    fontWeight: "800",
  },
  editButton: {
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  editButtonText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "800",
  },
  deleteButton: {
    backgroundColor: COLORS.lightRed,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 35,
    paddingBottom: 45,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.lightGreen,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 17,
  },
  emptyIconText: {
    color: COLORS.green,
    fontSize: 30,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    color: COLORS.gray,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  emptyAddButton: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 20,
  },
  emptyAddButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 13,
  },
  listFooter: {
    height: 25,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  loadingLogoText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "800",
  },
  loadingSpinner: {
    marginBottom: 15,
  },
  loadingTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  loadingSubtitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 7,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  errorMessage: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 22,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 31, 23, 0.45)",
  },
  modalCard: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    maxHeight: "92%",
  },
  stockModalCard: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#D4D8CF",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EDEFE7",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  formContent: {
    paddingBottom: 15,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 9,
    marginTop: 15,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 14,
  },
  formCategoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  formCategoryChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: COLORS.white,
  },
  formCategoryChipActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  formCategoryText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "600",
  },
  formCategoryTextActive: {
    color: COLORS.white,
  },
  profitPreview: {
    backgroundColor: COLORS.lightGreen,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profitPreviewLabel: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "600",
  },
  profitPreviewValue: {
    color: COLORS.green,
    fontSize: 17,
    fontWeight: "800",
  },
  negativeProfit: {
    color: COLORS.red,
  },
  saveButton: {
    backgroundColor: COLORS.green,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  stockOutConfirmButton: {
    backgroundColor: "#9A651B",
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  cancelButtonText: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: "700",
  },
  currentStockCard: {
    backgroundColor: COLORS.lightGreen,
    padding: 16,
    borderRadius: 14,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currentStockLabel: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  currentStockValue: {
    color: COLORS.green,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 5,
  },
  currentStockIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  currentStockIconText: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "800",
  },
  movementToggle: {
    flexDirection: "row",
    gap: 10,
    marginTop: 3,
  },
  movementOption: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  movementOptionInActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  movementOptionOutActive: {
    backgroundColor: "#9A651B",
    borderColor: "#9A651B",
  },
  movementOptionText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  movementOptionTextActive: {
    color: COLORS.white,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  stockPreviewCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    borderRadius: 13,
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  stockPreviewTextContainer: {
    flex: 1,
  },
  stockPreviewLabel: {
    color: COLORS.gray,
    fontSize: 11,
  },
  stockPreviewHint: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 5,
  },
  stockPreviewValue: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: "800",
  },
  stockWarningText: {
    color: COLORS.red,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
});
