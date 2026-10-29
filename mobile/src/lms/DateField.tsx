import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppButton } from "@/components/common/AppButton";
import { styles } from "./ui";
export interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}
export function DateField({ label, value, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = new Date(`${value}T12:00:00`);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.muted}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={styles.input}
      >
        <Text style={styles.text}>{value}</Text>
      </Pressable>
      {open ? (
        <>
          <DateTimePicker
            value={Number.isFinite(selected.getTime()) ? selected : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              if (Platform.OS !== "ios") setOpen(false);
              if (event.type === "set" && date)
                onChange(
                  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
                );
            }}
          />
          {Platform.OS === "ios" ? (
            <AppButton
              title="Done"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}
