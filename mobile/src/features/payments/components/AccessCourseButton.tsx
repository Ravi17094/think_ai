import { Button } from 'react-native';

export function AccessCourseButton({
  courseTitle,
  onPress,
}: {
  courseId: string;
  courseTitle?: string;
  onPress: () => void;
}) {
  return (
    <Button
      title="Open Enrolled Course"
      onPress={onPress}
      accessibilityLabel={
        courseTitle
          ? `Open enrolled course, ${courseTitle}`
          : 'Open enrolled course'
      }
    />
  );
}
