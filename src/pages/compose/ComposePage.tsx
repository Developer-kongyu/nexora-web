import { CheckCircle2, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { ComposeEditor } from '@/widgets/compose-editor/ComposeEditor';
import { PageLayout } from '@/widgets/layout/PageLayout';
import { PageTitle, SideCard } from '../_shared/PageParts';

const inlineIconStyle = {
  display: 'inline',
  verticalAlign: '-3px',
  marginRight: 6,
  color: 'var(--color-primary)',
} as const;

export function ComposePage() {
  return (
    <>
      <PageTitle
        title="发布帖子"
        description="编辑正文、媒体、投递位置与互动权限。"
      />
      <PageLayout
        aside={
          <>
            <SideCard title="发布规则">
              <ul>
                <li>正文、媒体或链接至少包含一项</li>
                <li>媒体处理完成后才能发布</li>
                <li>社群发帖遵循对应社群规则</li>
                <li>敏感内容需要按要求添加说明</li>
              </ul>
            </SideCard>
            <SideCard title="创作建议">
              <div style={{ display: 'grid', gap: 12 }}>
                <p>
                  <Sparkles size={15} style={inlineIconStyle} />
                  具体的观点和真实经验更容易获得高质量讨论。
                </p>
                <p>
                  <FileText size={15} style={inlineIconStyle} />
                  长内容可先保存草稿，避免编辑中断。
                </p>
                <p>
                  <ShieldCheck size={15} style={inlineIconStyle} />
                  发布前请确认可见范围和互动权限。
                </p>
              </div>
            </SideCard>
            <SideCard title="草稿保护">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--color-success)',
                  fontSize: 12,
                }}
              >
                <CheckCircle2 size={16} />
                草稿首次保存后，后续修改将自动保存
              </div>
            </SideCard>
          </>
        }
      >
        <ComposeEditor />
      </PageLayout>
    </>
  );
}
