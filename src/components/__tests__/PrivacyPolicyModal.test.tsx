import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import PrivacyPolicyModal from '../PrivacyPolicyModal';

describe('PrivacyPolicyModal', () => {
  it('renders modal when open', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={() => {}} />);
    expect(screen.getAllByText(/プライバシー/).length).toBeGreaterThan(0);
  });

  it('does not render when closed', () => {
    render(<PrivacyPolicyModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText(/プライバシー|privacy/i)).toBeNull();
  });
}); 