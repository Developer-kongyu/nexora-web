import type { LabeledOption } from '@/shared/model/options';

export interface SelectOptionsProps<TValue extends string | number> {
  options: readonly LabeledOption<TValue>[];
}

export function SelectOptions<TValue extends string | number>({
  options,
}: SelectOptionsProps<TValue>) {
  return (
    <>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}
