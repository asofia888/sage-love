import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import Modal from '../../../components/Modal';

describe('Modal', () => {
  it('renders children when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} titleId="modal-title" title="テストタイトル">
        <div>モーダル内容</div>
      </Modal>
    );
    expect(screen.getByText('モーダル内容')).toBeInTheDocument();
    expect(screen.getByText('テストタイトル')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} titleId="modal-title" title="テストタイトル">
        <div>モーダル内容</div>
      </Modal>
    );
    expect(screen.queryByText('モーダル内容')).toBeNull();
  });
}); 