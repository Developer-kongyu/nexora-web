import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function ToastTrigger({ title }: { title: string }) {
  const { showToast } = useToast();

  return (
    <button type="button" onClick={() => showToast({ title, tone: 'info' })}>
      {`显示${title}`}
    </button>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('automatically dismisses a toast after its display duration', () => {
    render(
      <ToastProvider>
        <ToastTrigger title="保存成功" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '显示保存成功' }));
    expect(screen.getByText('保存成功')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3_600));
    expect(screen.queryByText('保存成功')).not.toBeInTheDocument();
  });

  it('clears the dismissal timer when a toast is closed manually', () => {
    render(
      <ToastProvider>
        <ToastTrigger title="可关闭提示" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '显示可关闭提示' }));
    expect(vi.getTimerCount()).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: '关闭提示' }));
    expect(screen.queryByText('可关闭提示')).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps at most three visible toasts and cancels the evicted timer', () => {
    render(
      <ToastProvider>
        <ToastTrigger title="提示一" />
        <ToastTrigger title="提示二" />
        <ToastTrigger title="提示三" />
        <ToastTrigger title="提示四" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '显示提示一' }));
    fireEvent.click(screen.getByRole('button', { name: '显示提示二' }));
    fireEvent.click(screen.getByRole('button', { name: '显示提示三' }));
    fireEvent.click(screen.getByRole('button', { name: '显示提示四' }));

    expect(screen.queryByText('提示一')).not.toBeInTheDocument();
    expect(screen.getByText('提示二')).toBeInTheDocument();
    expect(screen.getByText('提示三')).toBeInTheDocument();
    expect(screen.getByText('提示四')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(3);
  });

  it('clears outstanding timers when the provider unmounts', () => {
    const view = render(
      <ToastProvider>
        <ToastTrigger title="即将卸载" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '显示即将卸载' }));
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
