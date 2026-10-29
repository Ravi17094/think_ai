import { useCallback, useState } from "react";
import { Modal, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import type { ScreenProps } from "@/navigation/types";
import { deleteDownload, recoverDownloads } from "../downloads";
import { useLms } from "../LmsProvider";
import { useLmsResource } from "../useLmsResource";
import { Card, LoadState, Message, Screen, styles } from "../ui";
export function DownloadsScreen({ navigation }: ScreenProps<"Downloads">) {
  const { session } = useLms();
  const fetcher = useCallback(
    () => recoverDownloads(session.userId),
    [session.userId],
  );
  const resource = useLmsResource(fetcher);
  const [remove, setRemove] = useState<number | null>(null),
    [error, setError] = useState("");
  async function confirm() {
    if (remove === null) return;
    try {
      await deleteDownload(session.userId, remove);
      setRemove(null);
      await resource.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot delete download.");
    }
  }
  return (
    <Screen title="Offline downloads">
      <LoadState {...resource} retry={resource.refresh} />
      {error ? <Message error text={error} /> : null}
      <Message text="Videos use up to 1 GB of app storage. A 100 MB device reserve is kept. Interrupted files are removed on recovery." />
      {resource.data?.length === 0 ? (
        <Card>
          <Text style={styles.text}>
            No downloads. Open a course lesson and choose Download this video.
          </Text>
        </Card>
      ) : null}
      {resource.data?.map((row) => (
        <Card key={row.lessonId}>
          <Text style={styles.heading}>{row.title}</Text>
          <Text style={styles.muted}>
            {(row.bytes / 1024 / 1024).toFixed(1)} MB · {row.status}
          </Text>
          <AppButton
            title="Play offline"
            onPress={() =>
              navigation.navigate("CoursePlayer", {
                courseId: row.courseId,
                lessonId: row.lessonId,
              })
            }
          />
          <AppButton
            title="Delete video"
            variant="danger"
            onPress={() => setRemove(row.lessonId)}
          />
        </Card>
      ))}
      <Modal
        visible={remove !== null}
        transparent
        onRequestClose={() => setRemove(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "rgba(0,0,0,.8)",
          }}
        >
          <Card>
            <Text style={styles.heading}>Delete downloaded video?</Text>
            <Message text="You can download it again while online." />
            <AppButton
              title="Delete"
              variant="danger"
              onPress={() => void confirm()}
            />
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={() => setRemove(null)}
            />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
