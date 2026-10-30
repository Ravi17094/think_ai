import "../global.css";
import { Tabs } from "expo-router";

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#0ef172', 
          borderTopColor: '#e1e293b' 
        },
        tabBarActiveTintColor: '#0966d4',
        tabBarInactiveTintColor: '#65474ab',
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
    </Tabs>
  );
}