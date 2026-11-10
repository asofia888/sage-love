import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import CrisisInterventionModal from '../CrisisInterventionModal';

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

  describe('相談窓口カード', () => {
    const highResult = { ...crisisResult, severity: 'high' as const };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('電話窓口は tel:、テキスト窓口は sms: のリンクになる', () => {
      render(
        <CrisisInterventionModal
          isOpen={true}
          onClose={() => {}}
          crisisResult={highResult}
          userLanguage="en"
          userCountry="US"
        />
      );
      expect(screen.getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988');
      expect(screen.getByRole('link', { name: 'Text HOME to 741741' })).toHaveAttribute(
        'href',
        'sms:741741?&body=HOME'
      );
    });

    it('窓口ごとに、どの国のものかを表示する', () => {
      render(
        <CrisisInterventionModal
          isOpen={true}
          onClose={() => {}}
          crisisResult={highResult}
          userLanguage="en"
          userCountry="US"
        />
      );
      expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
    });

    /**
     * 国を渡さなければ端末から推定する。英語表示でも日本に居る人には、
     * 米国専用の 988 ではなく日本から掛かる窓口を出す。
     */
    it('国の指定が無ければタイムゾーンから推定する', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: 'Asia/Tokyo',
      } as Intl.ResolvedDateTimeFormatOptions);
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');

      render(
        <CrisisInterventionModal
          isOpen={true}
          onClose={() => {}}
          crisisResult={crisisResult}
          userLanguage="en-US"
        />
      );
      expect(screen.getByRole('link', { name: '0120-279-338' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: '988' })).toBeNull();
    });
  });
});
