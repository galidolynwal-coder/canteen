import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./services/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

test('renders configuration message when Supabase is missing', async () => {
  render(<App />);
  expect(await screen.findByText(/supabase url and anon key are required/i)).toBeInTheDocument();
});
