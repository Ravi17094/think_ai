import { fireEvent, render, screen } from '@testing-library/react-native';

import { ResultRow } from '@/components/search/HighlightedResults';
import { RecentSearches } from '@/components/search/RecentSearches';
import { ResultTabs } from '@/components/search/ResultTabs';
import { SearchInput } from '@/components/search/SearchInput';
import { createSearchResultFactory } from '@/mock/factories';
import type { SearchResult } from '@/types';

const createSearchResult = createSearchResultFactory(17);

describe('ResultRow', () => {
  const result: SearchResult = {
    ...createSearchResult('course', 0, 'react'),
    title: 'React patterns for react teams',
    subtitle: 'Course · 24 lessons · 4.6',
  };

  it('highlights every occurrence of the query term', () => {
    render(<ResultRow query="react" result={result} />);

    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByText('react')).toBeTruthy();
    expect(screen.getAllByTestId(/^result-row-.*-match-\d+$/)).toHaveLength(2);
  });

  it('renders the type badge and subtitle', () => {
    render(<ResultRow query="react" result={result} />);

    expect(screen.getByText('course')).toBeTruthy();
    expect(screen.getByText('Course · 24 lessons · 4.6')).toBeTruthy();
  });

  it('selects the result when pressed', () => {
    const onSelect = jest.fn();
    render(<ResultRow onSelect={onSelect} query="react" result={result} />);

    fireEvent.press(screen.getByTestId(`result-row-${result.id}`));

    expect(onSelect).toHaveBeenCalledWith(result);
  });

  it('stays pressable when no handler is supplied', () => {
    render(<ResultRow query="react" result={result} />);

    expect(() =>
      fireEvent.press(screen.getByTestId(`result-row-${result.id}`))
    ).not.toThrow();
  });
});

describe('ResultTabs', () => {
  const tabs = ['Courses', 'Lessons', 'Forum', 'Assessments'];

  it('marks only the active tab as selected', () => {
    render(<ResultTabs activeTab="Lessons" onChange={jest.fn()} tabs={tabs} />);

    expect(screen.getByTestId('result-tabs-Lessons').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId('result-tabs-Forum').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('reports the pressed tab', () => {
    const onChange = jest.fn();
    render(<ResultTabs activeTab="Courses" onChange={onChange} tabs={tabs} />);

    fireEvent.press(screen.getByTestId('result-tabs-Forum'));

    expect(onChange).toHaveBeenCalledWith('Forum');
  });

  it('appends counts when supplied', () => {
    render(
      <ResultTabs
        activeTab="Courses"
        counts={{ Courses: 12, Forum: 0 }}
        onChange={jest.fn()}
        tabs={tabs}
      />
    );

    expect(screen.getByTestId('result-tabs-Courses-label')).toHaveTextContent('Courses 12');
    expect(screen.getByTestId('result-tabs-Forum-label')).toHaveTextContent('Forum 0');
    expect(screen.getByTestId('result-tabs-Lessons-label')).toHaveTextContent('Lessons');
  });
});

describe('RecentSearches', () => {
  it('renders nothing when hidden or empty', () => {
    const { rerender } = render(
      <RecentSearches isVisible={false} onSelect={jest.fn()} recent={['react']} />
    );
    expect(screen.queryByTestId('recent-searches')).toBeNull();

    rerender(<RecentSearches isVisible onSelect={jest.fn()} recent={[]} />);
    expect(screen.queryByTestId('recent-searches')).toBeNull();
  });

  it('renders one chip per term, newest first', () => {
    render(
      <RecentSearches
        onSelect={jest.fn()}
        recent={['react native', 'typescript']}
      />
    );

    expect(screen.getByTestId('recent-searches-item-react native')).toBeTruthy();
    expect(screen.getByTestId('recent-searches-item-typescript')).toBeTruthy();
  });

  it('selects and removes individual terms', () => {
    const onSelect = jest.fn();
    const onRemove = jest.fn();
    render(
      <RecentSearches
        onRemove={onRemove}
        onSelect={onSelect}
        recent={['react native']}
      />
    );

    fireEvent.press(screen.getByTestId('recent-searches-item-react native'));
    fireEvent.press(screen.getByTestId('recent-searches-remove-react native'));

    expect(onSelect).toHaveBeenCalledWith('react native');
    expect(onRemove).toHaveBeenCalledWith('react native');
  });

  it('clears the whole list', () => {
    const onClearAll = jest.fn();
    render(
      <RecentSearches
        onClearAll={onClearAll}
        onSelect={jest.fn()}
        recent={['react native']}
      />
    );

    fireEvent.press(screen.getByTestId('recent-searches-clear-all'));

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});

describe('SearchInput', () => {
  it('reports text changes and clears through onClear', () => {
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    render(
      <SearchInput
        onChangeText={onChangeText}
        onClear={onClear}
        value="react"
      />
    );

    fireEvent.changeText(screen.getByTestId('search-input-field'), 'react native');
    expect(onChangeText).toHaveBeenCalledWith('react native');

    fireEvent.press(screen.getByTestId('search-input-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledTimes(1);
  });

  it('falls back to onChangeText when onClear is omitted', () => {
    const onChangeText = jest.fn();
    render(<SearchInput onChangeText={onChangeText} value="react" />);

    fireEvent.press(screen.getByTestId('search-input-clear'));

    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('hides the clear affordance while empty', () => {
    render(<SearchInput onChangeText={jest.fn()} value="" />);

    expect(screen.queryByTestId('search-input-clear')).toBeNull();
  });

  it('submits the current term from the keyboard', () => {
    const onSubmit = jest.fn();
    render(<SearchInput onChangeText={jest.fn()} onSubmit={onSubmit} value="react" />);

    fireEvent(screen.getByTestId('search-input-field'), 'submitEditing');

    expect(onSubmit).toHaveBeenCalledWith('react');
  });

  it('shows the busy affordance only when isBusy is set', () => {
    const { rerender } = render(
      <SearchInput isBusy onChangeText={jest.fn()} value="react" />
    );
    expect(screen.getByTestId('search-input-busy')).toBeTruthy();

    rerender(<SearchInput isBusy={false} onChangeText={jest.fn()} value="react" />);
    expect(screen.queryByTestId('search-input-busy')).toBeNull();
  });
});