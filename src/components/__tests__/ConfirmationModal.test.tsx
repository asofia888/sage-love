import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import ConfirmationModal from '../../../components/ConfirmationModal';

describe('ConfirmationModal', () => {
  it('renders modal when open', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="確認"
        confirmText="はい"
        cancelText="いいえ"
      >
        本当に実行しますか？
      </ConfirmationModal>
    );
    expect(screen.getByText('確認')).toBeInTheDocument();
    expect(screen.getByText('本当に実行しますか？')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
        title="確認"
        confirmText="はい"
        cancelText="いいえ"
      >
        本当に実行しますか？
      </ConfirmationModal>
    );
    expect(screen.queryByText('確認')).toBeNull();
  });
}); 