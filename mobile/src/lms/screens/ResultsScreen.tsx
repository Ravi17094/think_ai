import { useAssessmentResults } from "@/hooks/useAssessmentResults";
import { Text } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import type { ScreenProps } from "@/navigation/types";
import { lmsApi } from "../api";
import { Card, LoadState, Message, Screen, styles } from "../ui";
export function AssessmentResultsScreen({
  route,
  navigation,
}: ScreenProps<"AssessmentResults">) {
  const resource = useAssessmentResults(route.params.attemptId);
  const result = resource.data;
  return (
    <Screen title="Assessment results">
      <LoadState {...resource} retry={resource.refresh} />
      {result && !["GRADED", "FAILED"].includes(result.status) ? (
        <Card>
          <Text style={styles.heading}>Your answers are being graded</Text>
          <Message text="Coding questions run in the remote sandbox. This page updates automatically." />
        </Card>
      ) : null}
      {result?.status === "FAILED" ? (
        <Card>
          <Message
            error
            text={`Grading could not finish (${result.error || "service unavailable"}). Contact the assessment administrator.`}
          />
          {result.canRetake ? (
            <AppButton
              title="Start another attempt"
              onPress={() =>
                navigation.replace("AssessmentTaking", {
                  assessmentId: result.assessmentId,
                  enrollmentId: result.enrollmentId,
                })
              }
            />
          ) : null}
        </Card>
      ) : null}
      {result?.status === "GRADED" ? (
        <>
          <Card>
            <Text style={styles.heading}>{result.title}</Text>
            <Text style={styles.title}>
              {result.score?.toFixed(1)} / {result.totalMarks}
            </Text>
            <Text style={styles.badge}>
              {result.percentage?.toFixed(1)}% ·{" "}
              {result.passed ? "Passed" : "Not passed"}
            </Text>
            <Message
              text={
                result.certificateEligible
                  ? "Certificate requirements met."
                  : "Complete the course and pass required assessments to earn a certificate."
              }
            />
            {result.canRetake ? (
              <AppButton
                title="Retake assessment"
                variant="secondary"
                onPress={() =>
                  navigation.replace("AssessmentTaking", {
                    assessmentId: result.assessmentId,
                    enrollmentId: result.enrollmentId,
                  })
                }
              />
            ) : null}
            {result.certificateId ? (
              <AppButton
                title="View certificate"
                onPress={() =>
                  navigation.navigate("LmsCertificate", {
                    certificateId: result.certificateId!,
                  })
                }
              />
            ) : result.certificateEligible ? (
              <AppButton
                title="Generate certificate"
                onPress={() =>
                  void lmsApi
                    .generate(result.enrollmentId)
                    .then((c) =>
                      navigation.navigate("LmsCertificate", {
                        certificateId: c.id,
                      }),
                    )
                    .catch((e) =>
                      resource.setData({ ...result, error: e.message }),
                    )
                }
              />
            ) : null}
            {result.error ? <Message error text={result.error} /> : null}
          </Card>
          <Text style={styles.heading}>Flagged for review</Text>
          {result.questions.filter((q) => q.flagged).length === 0 ? (
            <Message text="No questions were flagged." />
          ) : (
            result.questions
              .filter((q) => q.flagged)
              .map((q) => (
                <Text style={styles.text} key={q.id}>
                  ⚑ {q.text}
                </Text>
              ))
          )}
          <Text style={styles.heading}>Question breakdown</Text>
          {result.questions.map((q) => (
            <Card key={q.id}>
              <Text style={styles.heading}>{q.text}</Text>
              <Text style={styles.badge}>
                {q.marksObtained.toFixed(1)} / {q.marks}
              </Text>
              <Text selectable style={styles.text}>
                Your answer: {q.selectedAnswer}
              </Text>
              <Text style={styles.text}>Correct answer: {q.correctAnswer}</Text>
              {q.explanation ? (
                <Text style={styles.muted}>{q.explanation}</Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
