import { fireEvent, render, screen } from '@testing-library/react-native';

import { SearchBar } from '@/components/learner/SearchBar';

describe('SearchBar', () => {
  it('renders the input with the supplied value and placeholder', () => {
    render(<SearchBar onChangeText={jest.fn()} value="react" />);

    const input = screen.getByTestId('search-bar-input');
    expect(input.props.value).toBe('react');
    expect(input.props.placeholder).toBe('Search courses…');
  });

  it('forwards each keystroke', () => {
    const onChangeText = jest.fn();
    render(<SearchBar onChangeText={onChangeText} value="" />);

    fireEvent.changeText(screen.getByTestId('search-bar-input'), 'r');
    expect(onChangeText).toHaveBeenCalledWith('r');
  });

  it('hides the clear button while the field is empty', () => {
    render(<SearchBar onChangeText={jest.fn()} value="" />);
    expect(screen.queryByTestId('search-bar-clear')).toBeNull();
  });

  it('shows the clear button once the field has content', () => {
    render(<SearchBar onChangeText={jest.fn()} value="react" />);
    expect(screen.getByTestId('search-bar-clear')).toBeTruthy();
  });

  it('clears via onClear when provided', () => {
    const onClear = jest.fn();
    const onChangeText = jest.fn();
    render(<SearchBar onClear={onClear} onChangeText={onChangeText} value="react" />);

    fireEvent.press(screen.getByTestId('search-bar-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChangeText).not.toHaveBeenCalled();
  });

  it('falls back to emptying the value when onClear is omitted', () => {
    const onChangeText = jest.fn();
    render(<SearchBar onChangeText={onChangeText} value="react" />);

    fireEvent.press(screen.getByTestId('search-bar-clear'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('shows a busy indicator while a debounced search is in flight', () => {
    const { rerender } = render(
      <SearchBar isSearching={false} onChangeText={jest.fn()} value="re" />
    );
    expect(screen.queryByTestId('search-bar-searching')).toBeNull();

    rerender(<SearchBar isSearching onChangeText={jest.fn()} value="re" />);
    expect(screen.getByTestId('search-bar-searching')).toBeTruthy();
  });
});
