import type { InputHTMLAttributes, ChangeEvent } from 'react';
import { MEDIA_IMAGE_ACCEPT } from '../model/constraints';

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'accept' | 'multiple' | 'onChange'
>;

export interface MediaImageFileInputProps extends NativeInputProps {
  onFileSelected: (file: File) => void;
}

export function MediaImageFileInput({ onFileSelected, ...inputProps }: MediaImageFileInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFileSelected(file);
  };

  return <input {...inputProps} type="file" accept={MEDIA_IMAGE_ACCEPT} onChange={handleChange} />;
}
