import { Text } from "react-native";
import { useLms } from "./LmsProvider";
import { styles } from "./ui";
export function LmsSyncIndicator() {
  const { ready, syncStatus } = useLms();
  return ready ? (
    <Text accessibilityLiveRegion="polite" style={styles.muted}>
      {syncStatus}
    </Text>
  ) : null;
}
