const ASSESSMENT_KEY = 'thinkz_assessments';

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));

const assessmentQuestions = [
  {
    id: 'q1',
    topic: 'React',
    question: 'What hook is used for side effects in functional components?',
    options: ['useState', 'useEffect', 'useContext', 'useReducer'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    topic: 'React',
    question: 'Which method prevents unnecessary re-renders of child components?',
    options: ['useEffect', 'React.memo', 'useCallback', 'useState'],
    correctIndex: 1,
  },
  {
    id: 'q3',
    topic: 'Java',
    question: 'Which interface must be implemented to use a for-each loop?',
    options: ['Comparable', 'Serializable', 'Iterable', 'Runnable'],
    correctIndex: 2,
  },
  {
    id: 'q4',
    topic: 'Spring Boot',
    question: 'What annotation marks a class as a REST controller?',
    options: ['@Component', '@Service', '@RestController', '@Repository'],
    correctIndex: 2,
  },
  {
    id: 'q5',
    topic: 'JavaScript',
    question: 'What does "===" check in JavaScript?',
    options: ['Value only', 'Type only', 'Value and type', 'Reference only'],
    correctIndex: 2,
  },
  {
    id: 'q6',
    topic: 'CSS',
    question: 'Which property creates space between an element\'s border and content?',
    options: ['margin', 'border', 'padding', 'gap'],
    correctIndex: 2,
  },
  {
    id: 'q7',
    topic: 'SQL',
    question: 'Which clause is used to filter rows after grouping?',
    options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'],
    correctIndex: 1,
  },
  {
    id: 'q8',
    topic: 'React',
    question: 'What is the purpose of keys in React lists?',
    options: ['Styling', 'Encryption', 'Efficient re-rendering', 'Type checking'],
    correctIndex: 2,
  },
  {
    id: 'q9',
    topic: 'Java',
    question: 'Which collection maintains insertion order and allows duplicates?',
    options: ['HashSet', 'TreeSet', 'LinkedHashSet', 'ArrayList'],
    correctIndex: 3,
  },
  {
    id: 'q10',
    topic: 'Docker',
    question: 'What file defines the build steps for a Docker image?',
    options: ['docker-compose.yml', 'Dockerfile', '.dockerignore', 'Makefile'],
    correctIndex: 1,
  },
];

let submissions = loadSubmissions();

function loadSubmissions() {
  try {
    const raw = localStorage.getItem(ASSESSMENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSubmissions() {
  try {
    localStorage.setItem(ASSESSMENT_KEY, JSON.stringify(submissions));
  } catch {
    // ignore
  }
}

export const AssessmentApi = {
  async getQuestions() {
    await delay(200);
    return clone(assessmentQuestions);
  },

  async submitAssessment({ userId, answers }) {
    await delay(500);
    if (!userId) throw new Error('userId is required');
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new Error('answers array is required and cannot be empty');
    }

    let correct = 0;
    const details = assessmentQuestions.map((q, i) => {
      const selected = answers[i] ?? -1;
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) correct += 1;
      return {
        questionId: q.id,
        topic: q.topic,
        question: q.question,
        options: q.options,
        selectedIndex: selected,
        correctIndex: q.correctIndex,
        isCorrect,
      };
    });

    const total = assessmentQuestions.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= 70;

    const submission = {
      id: `as${Date.now()}`,
      userId,
      answers,
      correct,
      total,
      score,
      passed,
      details,
      submittedAt: new Date().toISOString(),
    };

    submissions.push(submission);
    saveSubmissions();
    return clone(submission);
  },

  async getSubmissionsByUser(userId) {
    await delay(200);
    return clone(submissions.filter((s) => s.userId === userId));
  },

  async getSubmissionById(submissionId) {
    await delay(150);
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) throw new Error(`Submission ${submissionId} not found`);
    return clone(sub);
  },

  async getTopics() {
    await delay(100);
    const topics = [...new Set(assessmentQuestions.map((q) => q.topic))];
    return clone(topics);
  },

  async getQuestionsByTopic(topic) {
    await delay(200);
    return clone(assessmentQuestions.filter((q) => q.topic === topic));
  },
};

export function resetAssessments() {
  submissions = [];
  try {
    localStorage.removeItem(ASSESSMENT_KEY);
  } catch {
    // ignore
  }
}

export { assessmentQuestions };
