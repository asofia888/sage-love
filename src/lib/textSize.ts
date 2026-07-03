/**
 * テキストサイズ設定の一元管理。
 * 選択肢・保存値・本文へのTailwindクラスをここに集約し、コンポーネント側の
 * 重複した三項演算子（large ? base : sm）によるドリフトを防ぐ。
 */
export type TextSize = 'normal' | 'large' | 'x-large';

export const TEXT_SIZES: TextSize[] = ['normal', 'large', 'x-large'];

const BODY_CLASS: Record<TextSize, string> = {
  normal: 'text-sm',
  large: 'text-base',
  'x-large': 'text-lg',
};

export function isTextSize(value: string): value is TextSize {
  return (TEXT_SIZES as string[]).includes(value);
}

/** 本文表示用のフォントサイズクラス。未知の値はnormalにフォールバック。 */
export function textSizeBodyClass(size: string): string {
  return isTextSize(size) ? BODY_CLASS[size] : BODY_CLASS.normal;
}
