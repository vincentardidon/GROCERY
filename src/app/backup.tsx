import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    createBackupData,
    GroceryBackup,
    restoreBackupData,
} from "../database/database";

export default function BackupScreen() {
  const [loading, setLoading] = useState(false);

  async function createBackup() {
    try {
      setLoading(true);

      const backup = await createBackupData();
      const json = JSON.stringify(backup, null, 2);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      const fileUri = `${FileSystem.cacheDirectory}GROCERY-Backup-${timestamp}.json`;

      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          "Sharing unavailable",
          "Your backup was created, but sharing is not available on this device.",
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Save Your GROCERY Backup",
        UTI: "public.json",
      });
    } catch (error) {
      console.error("Backup error:", error);
      Alert.alert(
        "Backup Failed",
        error instanceof Error ? error.message : "Unable to create backup.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function chooseBackup() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: false,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      if (!file) {
        Alert.alert("Error", "No backup file was selected.");
        return;
      }

      setLoading(true);

      const pickedFile = new File(file.uri);
      const content = await pickedFile.text();

      let parsedBackup: GroceryBackup;

      try {
        parsedBackup = JSON.parse(content) as GroceryBackup;
      } catch {
        Alert.alert("Invalid File", "The selected file is not valid JSON.");
        return;
      }

      setLoading(false);

      Alert.alert(
        "Restore Backup?",
        "Restoring will replace your current products, stock history, sales, and expenses with the data in this backup. This cannot be undone. Create a backup of your current data first if you want to keep it.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => {
              try {
                setLoading(true);
                await restoreBackupData(parsedBackup);

                Alert.alert(
                  "Restore Complete",
                  "Your backup data has been restored successfully. Return to Home and reopen the screens to see the restored data.",
                );
              } catch (error) {
                console.error("Restore error:", error);
                Alert.alert(
                  "Restore Failed",
                  error instanceof Error
                    ? error.message
                    : "Unable to restore this backup.",
                );
              } finally {
                setLoading(false);
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error("File selection error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Unable to open the selected file.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>DATA MANAGEMENT</Text>
      <Text style={styles.title}>Backup & Restore</Text>
      <Text style={styles.description}>
        Keep a copy of your store records so you can recover them when needed.
      </Text>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>↑</Text>
        </View>

        <Text style={styles.cardTitle}>Create a Backup</Text>
        <Text style={styles.cardDescription}>
          Export your products, stock movements, sales, sale items, and expenses
          into a JSON backup file.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={createBackup}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Create Backup</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>↓</Text>
        </View>

        <Text style={styles.cardTitle}>Restore a Backup</Text>
        <Text style={styles.cardDescription}>
          Choose a previous GROCERY backup file to restore your store records.
          Restoring replaces the current data.
        </Text>

        <TouchableOpacity
          style={[styles.secondaryButton, loading && styles.disabledButton]}
          onPress={chooseBackup}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Choose Backup File</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#245C43" />
          <Text style={styles.loadingText}>Processing your data...</Text>
        </View>
      )}
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Important reminder</Text>
        <Text style={styles.noticeText}>
          Save backup files somewhere safe, such as your phone's Files folder or
          cloud storage. A backup stored only on your device may be lost if the
          app or device data is deleted.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F0",
  },
  content: {
    padding: 22,
    paddingTop: 35,
    paddingBottom: 40,
  },
  eyebrow: {
    color: "#66816F",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: "#183F2D",
    fontSize: 28,
    fontWeight: "800",
  },
  description: {
    color: "#778078",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8EDE5",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EAF2E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  icon: {
    color: "#245C43",
    fontSize: 27,
    fontWeight: "700",
  },
  cardTitle: {
    color: "#183F2D",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardDescription: {
    color: "#778078",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: "#245C43",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#245C43",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#245C43",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginVertical: 12,
  },
  loadingText: {
    color: "#66816F",
    fontSize: 13,
  },
  notice: {
    backgroundColor: "#F0EDE0",
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  noticeTitle: {
    color: "#554B2F",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  noticeText: {
    color: "#716A55",
    fontSize: 12,
    lineHeight: 19,
  },
});
