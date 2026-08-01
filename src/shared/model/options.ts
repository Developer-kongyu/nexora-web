export interface LabeledOption<TValue extends string | number = string> {
  value: TValue;
  label: string;
}

export function buildLabeledOptions<TValue extends string | number>(
  values: readonly TValue[],
  labels: Readonly<Record<TValue, string>>,
): Array<LabeledOption<TValue>> {
  return values.map((value) => ({ value, label: labels[value] }));
}
