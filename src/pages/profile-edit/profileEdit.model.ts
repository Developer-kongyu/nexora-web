import { z } from 'zod';
import type { UserProfileEditableView } from '@/domains/users/model';
import { isDateOnly } from '@/shared/lib/date';
import { isValidHttpUrlInput } from '@/shared/lib/url';

export const profileEditSchema = z.object({
  displayName: z.string().trim().min(1, '请输入展示名称').max(50, '最多 50 个字符'),
  bio: z.string().trim().max(160, '最多 160 个字符'),
  location: z.string().trim().max(50, '最多 50 个字符'),
  websiteUrl: z
    .string()
    .trim()
    .max(2048, '网址过长')
    .refine(isValidHttpUrlInput, '请输入有效的网址'),
  birthday: z.string().refine((value) => !value || isDateOnly(value), '请输入有效日期'),
});

export type ProfileEditFormValues = z.infer<typeof profileEditSchema>;

export const EMPTY_PROFILE_FORM: ProfileEditFormValues = {
  displayName: '',
  bio: '',
  location: '',
  websiteUrl: '',
  birthday: '',
};

export function profileToFormValues(profile: UserProfileEditableView): ProfileEditFormValues {
  return {
    displayName: profile.displayName,
    bio: profile.bio ?? '',
    location: profile.location ?? '',
    websiteUrl: profile.websiteUrl ?? '',
    birthday: profile.birthday ?? '',
  };
}

export function profileMediaStateLabel(state: UserProfileEditableView['avatarMediaState']): string {
  switch (state) {
    case 'READY':
      return '当前图片可用';
    case 'PROCESSING':
      return '当前图片仍在处理中';
    case 'FAILED':
      return '当前图片处理失败';
    case 'MISSING':
      return '尚未设置图片';
  }
}
