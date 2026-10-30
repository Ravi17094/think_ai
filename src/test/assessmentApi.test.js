import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentApi, resetAssessments, assessmentQuestions } from '../services/assessmentApi.js';

beforeEach(() => {
  resetAssessments();
});

describe('AssessmentApi', () => {
  describe('getQuestions', () => {
    it('returns all questions', async () => {
      const questions = await AssessmentApi.getQuestions();
      expect(questions.length).toBe(assessmentQuestions.length);
      expect(questions.length).toBe(10);
    });

    it('each question has required fields', async () => {
      const questions = await AssessmentApi.getQuestions();
      questions.forEach((q) => {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('topic');
        expect(q).toHaveProperty('question');
        expect(q).toHaveProperty('options');
        expect(q).toHaveProperty('correctIndex');
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
      });
    });

    it('returns deep-cloned data', async () => {
      const q1 = await AssessmentApi.getQuestions();
      const q2 = await AssessmentApi.getQuestions();
      expect(q1).not.toBe(q2);
      expect(q1).toEqual(q2);
    });
  });

  describe('getTopics', () => {
    it('returns unique topics', async () => {
      const topics = await AssessmentApi.getTopics();
      expect(topics.length).toBeGreaterThan(0);
      expect(new Set(topics).size).toBe(topics.length);
    });
  });

  describe('getQuestionsByTopic', () => {
    it('returns questions for a specific topic', async () => {
      const reactQs = await AssessmentApi.getQuestionsByTopic('React');
      expect(reactQs.length).toBeGreaterThanOrEqual(1);
      expect(reactQs.every((q) => q.topic === 'React')).toBe(true);
    });

    it('returns empty for nonexistent topic', async () => {
      const qs = await AssessmentApi.getQuestionsByTopic('Nonexistent');
      expect(qs).toEqual([]);
    });
  });

  describe('submitAssessment', () => {
    it('throws if userId is missing', async () => {
      await expect(
        AssessmentApi.submitAssessment({ userId: '', answers: [0, 1] })
      ).rejects.toThrow('userId is required');
    });

    it('throws if answers is empty', async () => {
      await expect(
        AssessmentApi.submitAssessment({ userId: 'u1', answers: [] })
      ).rejects.toThrow('answers array is required');
    });

    it('throws if answers is not an array', async () => {
      await expect(
        AssessmentApi.submitAssessment({ userId: 'u1', answers: null })
      ).rejects.toThrow('answers array is required');
    });

    it('returns correct score when all answers are correct', async () => {
      const questions = await AssessmentApi.getQuestions();
      const correctAnswers = questions.map((q) => q.correctIndex);
      const result = await AssessmentApi.submitAssessment({
        userId: 'u1',
        answers: correctAnswers,
      });
      expect(result.score).toBe(100);
      expect(result.correct).toBe(result.total);
      expect(result.passed).toBe(true);
    });

    it('returns score 0 when all answers are wrong', async () => {
      const questions = await AssessmentApi.getQuestions();
      const wrongAnswers = questions.map((q) => (q.correctIndex + 1) % q.options.length);
      const result = await AssessmentApi.submitAssessment({
        userId: 'u1',
        answers: wrongAnswers,
      });
      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.passed).toBe(false);
    });

    it('passes with score >= 70', async () => {
      const questions = await AssessmentApi.getQuestions();
      const mostlyCorrect = questions.map((q, i) =>
        i < Math.ceil(questions.length * 0.7) ? q.correctIndex : (q.correctIndex + 1) % q.options.length
      );
      const result = await AssessmentApi.submitAssessment({
        userId: 'u2',
        answers: mostlyCorrect,
      });
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.passed).toBe(true);
    });

    it('fails with score < 70', async () => {
      const questions = await AssessmentApi.getQuestions();
      const mostlyWrong = questions.map((q, i) =>
        i < 2 ? q.correctIndex : (q.correctIndex + 1) % q.options.length
      );
      const result = await AssessmentApi.submitAssessment({
        userId: 'u2',
        answers: mostlyWrong,
      });
      expect(result.score).toBeLessThan(70);
      expect(result.passed).toBe(false);
    });

    it('stores submission with correct structure', async () => {
      const questions = await AssessmentApi.getQuestions();
      const answers = questions.map(() => 0);
      const result = await AssessmentApi.submitAssessment({
        userId: 'u1',
        answers,
      });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId', 'u1');
      expect(result).toHaveProperty('answers');
      expect(result).toHaveProperty('correct');
      expect(result).toHaveProperty('total', questions.length);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('submittedAt');
      expect(Array.isArray(result.details)).toBe(true);
      expect(result.details.length).toBe(questions.length);
    });

    it('each detail has correct structure', async () => {
      const questions = await AssessmentApi.getQuestions();
      const answers = questions.map(() => 0);
      const result = await AssessmentApi.submitAssessment({
        userId: 'u1',
        answers,
      });
      result.details.forEach((d) => {
        expect(d).toHaveProperty('questionId');
        expect(d).toHaveProperty('topic');
        expect(d).toHaveProperty('question');
        expect(d).toHaveProperty('options');
        expect(d).toHaveProperty('selectedIndex');
        expect(d).toHaveProperty('correctIndex');
        expect(d).toHaveProperty('isCorrect');
        expect(typeof d.isCorrect).toBe('boolean');
      });
    });
  });

  describe('getSubmissionsByUser', () => {
    it('returns submissions for a user', async () => {
      const questions = await AssessmentApi.getQuestions();
      await AssessmentApi.submitAssessment({
        userId: 'u1',
        answers: questions.map(() => 0),
      });
      const subs = await AssessmentApi.getSubmissionsByUser('u1');
      expect(subs.length).toBe(1);
      expect(subs[0].userId).toBe('u1');
    });

    it('returns empty array for user with no submissions', async () => {
      const subs = await AssessmentApi.getSubmissionsByUser('nonexistent');
      expect(subs).toEqual([]);
    });

    it('returns multiple submissions in order', async () => {
      const questions = await AssessmentApi.getQuestions();
      await AssessmentApi.submitAssessment({
        userId: 'u3',
        answers: questions.map(() => 0),
      });
      await AssessmentApi.submitAssessment({
        userId: 'u3',
        answers: questions.map(() => 1),
      });
      const subs = await AssessmentApi.getSubmissionsByUser('u3');
      expect(subs.length).toBe(2);
    });
  });

  describe('getSubmissionById', () => {
    it('returns a submission by ID', async () => {
      const questions = await AssessmentApi.getQuestions();
      const sub = await AssessmentApi.submitAssessment({
        userId: 'u1',
        answers: questions.map(() => 0),
      });
      const found = await AssessmentApi.getSubmissionById(sub.id);
      expect(found.id).toBe(sub.id);
    });

    it('throws for nonexistent submission', async () => {
      await expect(AssessmentApi.getSubmissionById('nonexistent')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('resetAssessments', () => {
    it('clears all submissions', async () => {
      const questions = await AssessmentApi.getQuestions();
      await AssessmentApi.submitAssessment({
        userId: 'u1',
        answers: questions.map(() => 0),
      });
      resetAssessments();
      const subs = await AssessmentApi.getSubmissionsByUser('u1');
      expect(subs).toEqual([]);
    });
  });
});
