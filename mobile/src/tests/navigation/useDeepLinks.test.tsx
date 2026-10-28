import type { NavigationContainerRef } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { __resetSessionForTests } from '@/api/session';
import { useDeepLinks } from '@/navigation/useDeepLinks';
import type { RootStackParamList } from '@/navigation/types';
import { flushAllPendingWork } from '../helpers';

type Listener = (event: { url: string }) => void;

function createRef(ready: boolean) {
  const navigate = jest.fn();
  let isReady = ready;
  const ref = {
    isReady: jest.fn(() => isReady),
    navigate,
  } as unknown as NavigationContainerRef<RootStackParamList>;
  return {
    ref,
    navigate,
    setReady: (value: boolean) => {
      isReady = value;
    },
  };
}

describe('useDeepLinks', () => {
  let listener: Listener | undefined;

  beforeEach(() => {
    listener = undefined;
    jest
      .spyOn(Linking, 'addEventListener')
      .mockImplementation((_type, handler) => {
        listener = handler as Listener;
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof Linking.addEventListener
        >;
      });
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  });

  afterEach(() => {
    __resetSessionForTests();
    jest.restoreAllMocks();
  });

  it('navigates when an incoming URL maps to a route', () => {
    const { ref, navigate } = createRef(true);
    renderHook(() => useDeepLinks(ref));

    act(() => {
      listener?.({ url: 'thinkzai://learner/courses/course-1?moduleId=mod-1' });
    });

    expect(navigate).toHaveBeenCalledWith('CourseDetail', {
      courseId: 'course-1',
      moduleId: 'mod-1',
    });
  });

  it('redirects auth-gated links to sign-in when signed out', () => {
    const { ref, navigate } = createRef(true);
    renderHook(() => useDeepLinks(ref));

    act(() => {
      listener?.({ url: 'thinkzai://forum/moderate' });
    });

    expect(navigate).toHaveBeenCalledWith('Login');
  });

  it('ignores URLs that resolve to nothing', () => {
    const { ref, navigate } = createRef(true);
    renderHook(() => useDeepLinks(ref));

    act(() => {
      listener?.({ url: 'thinkzai://deep/unknown' });
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('defers the launch URL until the container is ready', async () => {
    const { ref, navigate, setReady } = createRef(false);
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue('thinkzai://search');

    const { result } = renderHook(() => useDeepLinks(ref));

    await flushAllPendingWork();
    expect(navigate).not.toHaveBeenCalled();

    setReady(true);
    act(() => {
      result.current.handleReady();
    });

    expect(navigate).toHaveBeenCalledWith('GlobalSearch', {});
  });

  it('navigates the launch URL once ready', async () => {
    const { ref, navigate } = createRef(true);
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue('thinkzai://learner/dashboard');

    renderHook(() => useDeepLinks(ref));

    await flushAllPendingWork();

    expect(navigate).toHaveBeenCalledWith('LearnerDashboard', {});
  });
});
