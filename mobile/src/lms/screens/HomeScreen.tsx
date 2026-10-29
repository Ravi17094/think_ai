import { useCallback, useEffect } from "react";
import { Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { AppButton } from "@/components/common/AppButton";
import { signOut } from "@/api/session";
import type { ScreenProps } from "@/navigation/types";
import { lmsApi } from "../api";
import { useLms } from "../LmsProvider";
import { useLmsResource } from "../useLmsResource";
import { Card, LoadState, Screen, styles } from "../ui";
export function LmsHomeScreen({ navigation }: ScreenProps<"LmsHome">) {
  const { session, sync } = useLms();
  const focused = useIsFocused();
  const fetcher = useCallback(() => lmsApi.enrollments(), [session.token]);
  const resource = useLmsResource(fetcher);
  useEffect(() => {
    if (focused && session.token) void resource.refresh();
  }, [focused, session.token]);
  return (
    <Screen title="Learning workspace">
      <View style={styles.row}>
        <AppButton
          title="My profile"
          variant="secondary"
          onPress={() => navigation.navigate("LearnerProfile")}
        />
        <AppButton
          title="Playground"
          variant="secondary"
          onPress={() => navigation.navigate("CodePlayground")}
        />
        <AppButton
          title="Downloads"
          variant="secondary"
          onPress={() => navigation.navigate("Downloads")}
        />
        <AppButton
          title="Teaching tools"
          variant="secondary"
          onPress={() => navigation.navigate("StaffTools")}
        />
      </View>
      <LoadState {...resource} retry={resource.refresh} />
      {resource.data?.length === 0 ? (
        <Card>
          <Text style={styles.text}>
            No enrollments yet. Your payment or enrollment administrator can
            enroll you in a course.
          </Text>
        </Card>
      ) : null}
      {resource.data?.map((row) => (
        <Card key={row.id}>
          <Text style={styles.heading}>{row.batch.course.title}</Text>
          <Text style={styles.muted}>
            {row.summary.completedLessons}/{row.summary.totalLessons} lessons ·{" "}
            {row.summary.percentage.toFixed(1)}% complete
          </Text>
          <Text style={styles.badge}>
            {row.courseAccess
              ? row.enrollmentStatus
              : "Awaiting enrollment unlock"}
          </Text>
          <AppButton
            title="Continue learning"
            disabled={!row.courseAccess}
            onPress={() =>
              navigation.navigate("CoursePlayer", {
                courseId: row.batch.course.id,
              })
            }
          />
        </Card>
      ))}
      <AppButton
        title="Sync progress"
        onPress={() => void sync()}
        variant="secondary"
      />
      <AppButton
        title="Community dashboard"
        variant="secondary"
        onPress={() => navigation.navigate("LearnerDashboard")}
      />
      <AppButton
        title="Sign out"
        variant="secondary"
        onPress={() => void signOut()}
      />
    </Screen>
  );
}
