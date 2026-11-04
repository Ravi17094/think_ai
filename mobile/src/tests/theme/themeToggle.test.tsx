import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { Text, Pressable } from 'react-native';

function ThemeProbe() {
  const { mode, setMode } = useTheme();
  return <><Text testID="mode">{mode}</Text><Pressable testID="light" onPress={() => setMode('light')} /><Pressable testID="dark" onPress={() => setMode('dark')} /></>;
}

describe('theme preference', () => {
  it('switches between light and dark modes', async () => {
    render(<ThemeProvider initialMode="dark"><ThemeProbe /></ThemeProvider>);
    expect(screen.getByTestId('mode').props.children).toBe('dark');
    await act(async () => { fireEvent.press(screen.getByTestId('light')); });
    expect(screen.getByTestId('mode').props.children).toBe('light');
    await act(async () => { fireEvent.press(screen.getByTestId('dark')); });
    expect(screen.getByTestId('mode').props.children).toBe('dark');
  });
});
