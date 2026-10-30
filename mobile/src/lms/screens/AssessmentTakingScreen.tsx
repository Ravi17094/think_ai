import { useCallback, useState } from "react";
import { Modal, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import type { ScreenProps } from "@/navigation/types";
import { CodeEditor } from "../CodeEditor";
import type { Language } from "../types";
import { useAssessment } from "../useAssessment";
import { Card, LoadState, Message, Screen, styles } from "../ui";
export function AssessmentTakingScreen({
  route,
  navigation,
}: ScreenProps<"AssessmentTaking">) {
  const onSubmitted = useCallback(
    (attemptId: number) =>
      navigation.replace("AssessmentResults", {
        assessmentId: route.params.assessmentId,
        attemptId,
      }),
    [navigation, route.params.assessmentId],
  );
  const model = useAssessment(
    route.params.assessmentId,
    route.params.enrollmentId,
    onSubmitted,
  );
  const [index, setIndex] = useState(0),
    [confirm, setConfirm] = useState(false);
  const questions = model.attempt?.assessment.questions || [],
    question = questions[index];
  const answer = question ? model.answers[question.id] : undefined;
  const unanswered = questions.filter(
    (q) =>
      !model.answers[q.id]?.selectedOptionId &&
      !model.answers[q.id]?.code?.trim(),
  ).length;
  return (
    <Screen title={model.attempt?.assessment.title || "Assessment"}>
      <LoadState
        loading={model.loading}
        error={model.error}
        retry={model.retry}
      />
      {model.pendingDraft ? (
        <Card>
          <Text style={styles.heading}>Resume Assessment?</Text>
          <Text style={styles.muted}>
            A draft from {new Date(model.pendingDraft.savedAt).toLocaleString()}{" "}
            is saved on this device. The original time limit still applies.
          </Text>
          <AppButton
            title="Resume Assessment"
            onPress={() => void model.resume()}
          />
          <AppButton
            title="Discard draft"
            variant="danger"
            onPress={() => void model.discard()}
          />
        </Card>
      ) : null}
      {model.attempt && question ? (
        <>
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.badge,
              model.seconds <= 300 ? { color: "#fbbf24" } : null,
            ]}
          >
            Time remaining: {Math.floor(model.seconds / 60)}:
            {String(model.seconds % 60).padStart(2, "0")}
            {model.seconds <= 300 ? " · 5 minutes or less" : ""}
          </Text>
          <Message
            text={
              model.savedAt
                ? `Draft saved ${new Date(model.savedAt).toLocaleTimeString()}`
                : "Draft auto-saves every 30 seconds"
            }
          />
          <View style={styles.row}>
            {questions.map((q, i) => (
              <AppButton
                key={q.id}
                title={`${i + 1}${model.flags.includes(q.id) ? " ⚑" : ""}${model.answers[q.id] ? " ✓" : ""}`}
                variant={i === index ? "primary" : "secondary"}
                onPress={() => setIndex(i)}
              />
            ))}
          </View>
          <Card>
            <Text style={styles.heading}>
              Question {index + 1} · {question.marks} marks
            </Text>
            <Text style={styles.text}>{question.questionText}</Text>
            {question.questionType === "MCQ" ? (
              question.options.map((option) => (
                <AppButton
                  key={option.id}
                  title={`${answer?.selectedOptionId === option.id ? "● " : "○ "}${option.optionText}`}
                  variant={
                    answer?.selectedOptionId === option.id
                      ? "primary"
                      : "secondary"
                  }
                  disabled={model.seconds === 0 || model.submitting}
                  onPress={() =>
                    model.answer({
                      questionId: question.id,
                      selectedOptionId: option.id,
                    })
                  }
                />
              ))
            ) : (
              <>
                <View style={styles.row}>
                  {(
                    question.supportedLanguages ||
                    (["python", "javascript", "java", "cpp"] as Language[])
                  ).map((language) => (
                    <AppButton
                      key={language}
                      title={language}
                      variant={
                        answer?.language === language ? "primary" : "secondary"
                      }
                      onPress={() =>
                        model.answer({
                          questionId: question.id,
                          code: question.starterCode?.[language] || "",
                          language,
                        })
                      }
                    />
                  ))}
                </View>
                <CodeEditor
                  language={answer?.language || "python"}
                  code={answer?.code || ""}
                  onChange={(code) => {
                    if (model.seconds > 0 && !model.submitting)
                      model.answer({
                        questionId: question.id,
                        code,
                        language: answer?.language || "python",
                      });
                  }}
                />
              </>
            )}
            <AppButton
              title={
                model.flags.includes(question.id)
                  ? "Unflag question"
                  : "Flag for review"
              }
              variant="secondary"
              onPress={() => model.toggleFlag(question.id)}
            />
          </Card>
          <View style={styles.row}>
            <AppButton
              title="Previous"
              disabled={index === 0}
              variant="secondary"
              onPress={() => setIndex((i) => i - 1)}
            />
            <AppButton
              title="Next"
              disabled={index >= questions.length - 1}
              variant="secondary"
              onPress={() => setIndex((i) => i + 1)}
            />
            <AppButton
              title="Save draft"
              variant="secondary"
              onPress={() => void model.persist()}
            />
          </View>
          <AppButton
            title="Submit assessment"
            loading={model.submitting}
            onPress={() => setConfirm(true)}
          />
        </>
      ) : null}
      <Modal
        visible={confirm}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(false)}
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
            <Text style={styles.heading}>Submit assessment?</Text>
            <Text style={styles.text}>
              {unanswered
                ? `${unanswered} unanswered question(s) will receive zero marks.`
                : "All questions are answered."}{" "}
              You cannot edit answers after submission.
            </Text>
            <AppButton
              title="Confirm submission"
              onPress={() => {
                setConfirm(false);
                void model.submit();
              }}
            />
            <AppButton
              title="Keep working"
              variant="secondary"
              onPress={() => setConfirm(false)}
            />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
