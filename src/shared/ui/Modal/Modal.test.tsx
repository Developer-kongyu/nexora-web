import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('focuses the close control, handles Escape, and restores the previous focus', () => {
    const onClose = vi.fn();
    const view = render(
      <>
        <button type="button">打开弹窗</button>
        <Modal open={false} title="编辑资料" onClose={onClose} />
      </>,
    );
    const trigger = screen.getByRole('button', { name: '打开弹窗' });
    trigger.focus();

    view.rerender(
      <>
        <button type="button">打开弹窗</button>
        <Modal
          open
          title="编辑资料"
          description="修改后保存"
          onClose={onClose}
        />
      </>,
    );

    const dialog = screen.getByRole('dialog', { name: '编辑资料' });
    expect(dialog).toHaveAccessibleDescription('修改后保存');
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();

    fireEvent.keyDown(dialog.ownerDocument, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    view.rerender(
      <>
        <button type="button">打开弹窗</button>
        <Modal open={false} title="编辑资料" onClose={onClose} />
      </>,
    );
    expect(screen.getByRole('button', { name: '打开弹窗' })).toHaveFocus();
  });
});
