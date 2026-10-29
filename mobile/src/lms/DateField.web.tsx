import { Text, View } from "react-native";
import type { DateFieldProps } from "./DateField";
import { styles } from "./ui";
export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.muted}>{label}</Text>
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          background: "#222a45",
          color: "#f1f3f9",
          border: "1px solid #3a4570",
          borderRadius: 10,
          padding: 12,
          minHeight: 48,
          boxSizing: "border-box",
          fontFamily: "inherit",
          colorScheme: "dark",
        }}
      />
    </View>
  );
}
