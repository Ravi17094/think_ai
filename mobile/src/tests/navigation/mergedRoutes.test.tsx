import { fireEvent, render } from '@testing-library/react-native';

import { resolveDeepLink } from '@/navigation/deepLinks';
import { linkingForRole } from '@/navigation/linking';
import { ResultsScreen } from '@/screens/learning/ResultsScreen';

function destination(path: string, role: string | null = 'Learner', signedIn = true) {
  const linking = linkingForRole(role, signedIn);
  const state = linking.getStateFromPath!(path, linking.config);
  return state?.routes[state.index ?? state.routes.length - 1];
}

test('LMS certificate IDs and the company course certificate route stay distinct', () => {
  expect(destination('learner/certificates/7')).toMatchObject({
    name: 'LmsCertificate', params: { certificateId: 7 },
  });
  expect(destination('learning/certificates/course-7')).toMatchObject({
    name: 'Certificate', params: { courseId: 'course-7' },
  });
  expect(resolveDeepLink('thinkzai://learner/certificates/7', { isSignedIn: true }))
    .toMatchObject({ status: 'navigate', route: { screen: 'LmsCertificate', params: { certificateId: 7 } } });
});

test('the company results page opens its course certificate rather than the LMS PDF screen', () => {
  const navigation = { navigate: jest.fn(), replace: jest.fn() };
  const view = render(<ResultsScreen navigation={navigation as any}
    route={{ key: 'results', name: 'Results', params: { assessmentId: 'course-7', score: 90, passed: true } }} />);
  fireEvent.press(view.getByTestId('view-certificate'));
  expect(navigation.navigate).toHaveBeenCalledWith('Certificate', { courseId: 'course-7' });
});

test('the active navigator accepts company aliases and preserves string IDs', () => {
  expect(destination('course/course-7?moduleId=module-2')).toMatchObject({
    name: 'CourseDetail', params: { courseId: 'course-7', moduleId: 'module-2' },
  });
  expect(destination('forum/thread/thread-7')).toMatchObject({ name: 'ForumThread', params: { threadId: 'thread-7' } });
  expect(destination('assessment/quiz-7')).toMatchObject({ name: 'Assessment', params: { assessmentId: 'quiz-7' } });
});

test.each([
  ['checkout/success?paymentId=payment-7', 'PaymentSuccess'],
  ['checkout/failed?reason=network', 'PaymentFailed'],
  ['settings/notifications', 'NotificationPreferences'],
])('company route %s remains reachable and requires verified account access', (path, name) => {
  expect(destination(path)).toMatchObject({ name });
  expect(destination(path, null, false)).toMatchObject({ name: 'SignIn' });
});

test('the login alias keeps role-based homes and learner pages reject admin access', () => {
  expect(destination('login', 'Admin')).toMatchObject({ name: 'AdminHome' });
  expect(destination('login', null, false)).toMatchObject({ name: 'Login' });
  expect(destination('learning/certificates/course-7', 'Admin')).toMatchObject({ name: 'AdminHome' });
});
