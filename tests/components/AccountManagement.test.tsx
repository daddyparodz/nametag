import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountManagement from '../../components/AccountManagement';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Mock next-auth
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AccountManagement - Export Data', () => {
  const mockGroups = [
    { id: 'group-1', name: 'Family', color: '#FF0000' },
    { id: 'group-2', name: 'Friends', color: '#00FF00' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe('When there is no data', () => {
    it('should disable export button when no people and no groups', () => {
      render(<AccountManagement groups={[]} peopleCount={0} />);

      const exportButton = screen.getByRole('button', { name: /export data/i });
      expect(exportButton).toBeDisabled();
    });

    it('should disable "Export everything" radio when no data', () => {
      render(<AccountManagement groups={[]} peopleCount={0} />);

      const exportAllRadio = screen.getByRole('radio', { name: /export everything/i });
      expect(exportAllRadio).toBeDisabled();
    });

    it('should show helpful message when no data to export', () => {
      render(<AccountManagement groups={[]} peopleCount={0} />);

      expect(screen.getByText(/no data to export/i)).toBeInTheDocument();
      expect(screen.getByText(/add people or groups first/i)).toBeInTheDocument();
    });

    it('should disable "Export specific groups" when no groups exist', () => {
      render(<AccountManagement groups={[]} peopleCount={5} />);

      const exportGroupsRadio = screen.getByRole('radio', { name: /export specific groups/i });
      expect(exportGroupsRadio).toBeDisabled();
    });
  });

  describe('When there is data', () => {
    it('should enable export button when there are people', () => {
      render(<AccountManagement groups={[]} peopleCount={10} />);

      const exportButton = screen.getByRole('button', { name: /export data/i });
      expect(exportButton).not.toBeDisabled();
    });

    it('should enable export button when there are groups', () => {
      render(<AccountManagement groups={mockGroups} peopleCount={0} />);

      const exportButton = screen.getByRole('button', { name: /export data/i });
      expect(exportButton).not.toBeDisabled();
    });

    it('should enable "Export everything" radio when there is data', () => {
      render(<AccountManagement groups={mockGroups} peopleCount={5} />);

      const exportAllRadio = screen.getByRole('radio', { name: /export everything/i });
      expect(exportAllRadio).not.toBeDisabled();
    });

    it('should enable "Export specific groups" radio when groups exist', () => {
      render(<AccountManagement groups={mockGroups} peopleCount={0} />);

      const exportGroupsRadio = screen.getByRole('radio', { name: /export specific groups/i });
      expect(exportGroupsRadio).not.toBeDisabled();
    });

    it('should not show "no data" message when there is data', () => {
      render(<AccountManagement groups={mockGroups} peopleCount={5} />);

      expect(screen.queryByText(/no data to export/i)).not.toBeInTheDocument();
    });
  });

  describe('Export functionality', () => {
    it('should call export API when clicking export button with data', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ people: [], groups: [] }),
        })
      ) as unknown as typeof fetch;
      global.fetch = mockFetch;

      const user = userEvent.setup();
      render(<AccountManagement groups={mockGroups} peopleCount={10} />);

      const exportButton = screen.getByRole('button', { name: /export data/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user/export');
      });
    });

    it('should disable button while exporting', async () => {
      const mockFetch = vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ people: [], groups: [] }),
                }),
              100
            )
          )
      ) as unknown as typeof fetch;
      global.fetch = mockFetch;

      const user = userEvent.setup();
      render(<AccountManagement groups={mockGroups} peopleCount={10} />);

      const exportButton = screen.getByRole('button', { name: /export data/i });
      await user.click(exportButton);

      expect(screen.getByRole('button', { name: /exporting\.\.\./i })).toBeDisabled();
    });

    it('should not call export API when no data exists', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      render(<AccountManagement groups={[]} peopleCount={0} />);

      const exportButton = screen.getByRole('button', { name: /export data/i });
      expect(exportButton).toBeDisabled();

      // Try to click (should not trigger anything since it's disabled)
      fireEvent.click(exportButton);

      expect(mockFetch).not.toHaveBeenCalled();
    });

  });
});
