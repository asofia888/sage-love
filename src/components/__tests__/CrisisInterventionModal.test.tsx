import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import CrisisInterventionModal from '../../../components/CrisisInterventionModal';

describe('CrisisInterventionModal', () => {
  const crisisResult = {
    isCrisis: true,
    severity: 'critical' as const,
    detectedKeywords: ['死にたい'],
    triggerPatterns: ['suicide'],
    recommendedAction: 'emergency_resources' as const
  };

  it('renders modal when open and crisis detected', () => {
    render(
      <CrisisInterventionModal
        isOpen={true}
        onClose={() => {}}
        crisisResult={crisisResult}
        userLanguage="ja"
      />
    );
    expect(screen.getByText(/重要なお知らせ|crisis/i)).toBeInTheDocument();
    expect(screen.getByText(/あなたは一人ではありません|not alone/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CrisisInterventionModal
        isOpen={false}
        onClose={() => {}}
        crisisResult={crisisResult}
        userLanguage="ja"
      />
    );
    expect(screen.queryByText(/重要なお知らせ|crisis/i)).toBeNull();
  });
}); 