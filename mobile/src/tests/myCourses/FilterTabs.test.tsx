import { fireEvent, render, screen } from '@testing-library/react-native';

import { FilterTabs, COURSE_STATUS_FILTERS } from '@/components/learner/FilterTabs';

describe('FilterTabs', () => {
  it('exposes exactly the three spec filters in order', () => {
    expect(COURSE_STATUS_FILTERS.map((f) => f.key)).toEqual([
      'all',
      'in-progress',
      'completed',
    ]);
    expect(COURSE_STATUS_FILTERS.map((f) => f.label)).toEqual([
      'All',
      'In-progress',
      'Completed',
    ]);
  });

  it('marks only the active tab as selected', () => {
    render(<FilterTabs onChange={jest.fn()} value="completed" />);

    expect(screen.getByTestId('filter-tabs-completed').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId('filter-tabs-all').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('reports the selected filter on press', () => {
    const onChange = jest.fn();
    render(<FilterTabs onChange={onChange} value="all" />);

    fireEvent.press(screen.getByTestId('filter-tabs-in-progress'));
    expect(onChange).toHaveBeenCalledWith('in-progress');

    fireEvent.press(screen.getByTestId('filter-tabs-completed'));
    expect(onChange).toHaveBeenCalledWith('completed');

    fireEvent.press(screen.getByTestId('filter-tabs-all'));
    expect(onChange).toHaveBeenCalledWith('all');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('renders counts when they are supplied', () => {
    render(
      <FilterTabs
        counts={{ all: 12, 'in-progress': 5, completed: 7 }}
        onChange={jest.fn()}
        value="all"
      />
    );

    expect(screen.getByText('All (12)')).toBeTruthy();
    expect(screen.getByText('In-progress (5)')).toBeTruthy();
    expect(screen.getByText('Completed (7)')).toBeTruthy();
  });

  it('omits the count suffix when counts are absent', () => {
    render(<FilterTabs onChange={jest.fn()} value="all" />);
    expect(screen.getByText('All')).toBeTruthy();
  });
});
