import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ChatInput from '@/components/ChatInput';
import { MESSAGE } from '@/config/constants';

/**
 * 音声入力の onTranscript を明示的に叩けるようにする。
 * 実物は Web Speech API 依存で jsdom では発火しないため、
 * クランプ処理を通すにはハンドラを直接呼べる必要がある。
 */
const VOICE_TEXT = 'あ'.repeat(200);
vi.mock('@/components/VoiceInputButton', () => ({
  default: ({ onTranscript }: { onTranscript: (t: string, final: boolean) => void }) => (
    <button type="button" onClick={() => onTranscript(VOICE_TEXT, true)}>
      voice-mock
    </button>
  ),
}));

/**
 * サーバー(server/rate-limiter.ts)は MESSAGE.MAX_LENGTH 超を 429 で弾く。
 * 入力欄側で止めないと、長い胸の内を書き切って送信した瞬間にエラーになる。
 */
describe('ChatInput の文字数上限', () => {
  const onSendMessage = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  const renderInput = () =>
    render(<ChatInput onSendMessage={onSendMessage} isLoading={false} />);

  const paste = async (text: string) => {
    const user = userEvent.setup();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.click(textarea);
    await user.paste(text);
    return { user, textarea };
  };

  it('textarea にサーバーと同じ maxLength が設定されている', () => {
    renderInput();
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'maxlength',
      String(MESSAGE.MAX_LENGTH)
    );
  });

  it('上限に近づくまではカウンタを出さない（急かさないため）', async () => {
    renderInput();
    await paste('あ'.repeat(MESSAGE.COUNTER_THRESHOLD - 1));

    expect(
      screen.queryByText(new RegExp(`/\\s*${MESSAGE.MAX_LENGTH}$`))
    ).not.toBeInTheDocument();
  });

  it('しきい値に達するとカウンタが出る', async () => {
    renderInput();
    await paste('あ'.repeat(MESSAGE.COUNTER_THRESHOLD));

    expect(
      screen.getByText(`${MESSAGE.COUNTER_THRESHOLD} / ${MESSAGE.MAX_LENGTH}`)
    ).toBeInTheDocument();
  });

  it('上限ちょうどでもカウンタが出る', async () => {
    renderInput();
    await paste('あ'.repeat(MESSAGE.MAX_LENGTH));

    expect(
      screen.getByText(`${MESSAGE.MAX_LENGTH} / ${MESSAGE.MAX_LENGTH}`)
    ).toBeInTheDocument();
  });

  /**
   * maxLength は DOM 側の入力にしか効かない。音声認識の結果は state へ
   * 直接差し込まれるので、別途クランプしないと上限を超えて送信され 429 になる。
   */
  it('音声入力の結果を継ぎ足しても上限を超えない', async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.click(textarea);
    await user.paste('あ'.repeat(MESSAGE.MAX_LENGTH - 10));

    await user.click(screen.getByRole('button', { name: 'voice-mock' }));

    expect(textarea.value.length).toBe(MESSAGE.MAX_LENGTH);
  });

  it('空欄から音声入力しただけなら切り詰めない', async () => {
    const user = userEvent.setup();
    renderInput();

    await user.click(screen.getByRole('button', { name: 'voice-mock' }));

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe(VOICE_TEXT);
  });
});
