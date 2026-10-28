import { act, fireEvent, render, screen } from '@testing-library/react-native';

import {
  ACCORDION_ANIMATION_MS,
  ModuleAccordion,
} from '@/components/course/ModuleAccordion';
import { createModuleFactory } from '@/mock/factories';

const createModule = createModuleFactory(401);
const modules = [createModule(0, 0), createModule(0, 1), createModule(0, 2)];

describe('ModuleAccordion', () => {
  it('renders one header per module with lesson counts and duration', () => {
    render(<ModuleAccordion modules={modules} />);

    expect(screen.getAllByTestId(/^module-accordion-header-\d$/)).toHaveLength(3);
    expect(
      screen.getByText(
        `Module 1 · ${modules[0]!.lessons.length} lessons · ${modules[0]!.durationMinutes} min`
      )
    ).toBeTruthy();
  });

  it('keeps every module collapsed until one is pressed', () => {
    render(<ModuleAccordion modules={modules} />);

    for (let index = 0; index < modules.length; index += 1) {
      expect(
        screen.getByTestId(`module-accordion-header-${index}`).props
          .accessibilityState
      ).toEqual({ expanded: false });
    }
  });

  it('expands and collapses the pressed module', () => {
    const onToggle = jest.fn();
    render(<ModuleAccordion modules={modules} onToggle={onToggle} />);

    fireEvent.press(screen.getByTestId('module-accordion-header-1'));
    expect(
      screen.getByTestId('module-accordion-header-1').props.accessibilityState
    ).toEqual({ expanded: true });
    expect(onToggle).toHaveBeenCalledWith(modules[1]!.id);

    fireEvent.press(screen.getByTestId('module-accordion-header-1'));
    expect(
      screen.getByTestId('module-accordion-header-1').props.accessibilityState
    ).toEqual({ expanded: false });
  });

  it('closes the previously expanded module when another is pressed', () => {
    render(<ModuleAccordion modules={modules} />);

    fireEvent.press(screen.getByTestId('module-accordion-header-0'));
    fireEvent.press(screen.getByTestId('module-accordion-header-2'));

    expect(
      screen.getByTestId('module-accordion-header-0').props.accessibilityState
    ).toEqual({ expanded: false });
    expect(
      screen.getByTestId('module-accordion-header-2').props.accessibilityState
    ).toEqual({ expanded: true });
  });

  it('drives the expand/collapse animation on toggle', () => {
    const spy = jest.spyOn(require('react-native').Animated, 'timing');

    render(<ModuleAccordion modules={modules} />);
    fireEvent.press(screen.getByTestId('module-accordion-header-0'));

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: ACCORDION_ANIMATION_MS,
        useNativeDriver: false,
      })
    );
    spy.mockRestore();
  });

  it('reveals the lessons of the expanded module', () => {
    render(<ModuleAccordion modules={modules} />);

    fireEvent.press(screen.getByTestId('module-accordion-header-1'));
    expect(
      screen.getAllByTestId(/^module-accordion-lesson-1-\d$/)
    ).toHaveLength(modules[1]!.lessons.length);
    expect(screen.getByText(modules[1]!.description)).toBeTruthy();
  });

  it('auto-expands the module requested by a deep link', () => {
    render(<ModuleAccordion modules={modules} initiallyExpandedId={modules[2]!.id} />);

    expect(
      screen.getByTestId('module-accordion-header-2').props.accessibilityState
    ).toEqual({ expanded: true });
  });

  it('adopts a deep-linked module that arrives after the first render', () => {
    const { rerender } = render(<ModuleAccordion modules={modules} />);

    expect(
      screen.getByTestId('module-accordion-header-1').props.accessibilityState
    ).toEqual({ expanded: false });

    act(() => {
      rerender(<ModuleAccordion modules={modules} initiallyExpandedId={modules[1]!.id} />);
    });

    expect(
      screen.getByTestId('module-accordion-header-1').props.accessibilityState
    ).toEqual({ expanded: true });
  });
});