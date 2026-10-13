import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { initializeExpenseDatabase } from "../database/database";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepareDatabase() {
      try {
        await initializeExpenseDatabase();
      } catch (error) {
        console.error("Failed to initialize expense database:", error);
      } finally {
        setReady(true);
      }
    }

    prepareDatabase();
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F8F7F0",
        }}
      >
        <ActivityIndicator size="large" color="#245C43" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
