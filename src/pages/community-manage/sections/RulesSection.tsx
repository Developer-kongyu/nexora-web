import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  COMMUNITY_MAX_RULE_COUNT,
  COMMUNITY_MAX_RULE_LENGTH,
  communitiesApi,
  communityManageKeys,
} from '@/domains/communities';
import { Badge, Button, Card, IconButton, useToast } from '@/shared/ui';
import { EmptyPanel } from '@/pages/_shared/PageParts';
import { type CommunityManageDetailSectionProps } from '../communityManage.model';
import styles from '../CommunityManagePage.module.css';

export function RulesSection({ communityId, detail }: CommunityManageDetailSectionProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rules, setRules] = useState(() => detail.rules.map((item) => item.content));

  const canonicalRules = useMemo(() => rules.map((rule) => rule.trim()), [rules]);
  const originalRules = detail.rules.map((item) => item.content);
  const isDirty = JSON.stringify(canonicalRules) !== JSON.stringify(originalRules);
  const hasInvalidRule = canonicalRules.some(
    (rule) => rule.length === 0 || rule.length > COMMUNITY_MAX_RULE_LENGTH,
  );

  const saveRules = useMutation({
    mutationFn: () => communitiesApi.updateRules(communityId, canonicalRules),
    onSuccess: (result) => {
      showToast({
        tone: 'success',
        title: '社群规则已保存',
        description: `规则版本已更新为 ${result.rulesVersion}，共 ${result.ruleCount} 条。`,
      });
      void queryClient.invalidateQueries({ queryKey: communityManageKeys.root(communityId) });
    },
    onError: () =>
      showToast({
        tone: 'error',
        title: '规则保存失败',
        description: '请检查规则数量、长度与当前管理权限。',
      }),
  });

  return (
    <Card className={styles.panel}>
      <header>
        <div>
          <h2>社群规则</h2>
          <p>整组替换规则；顺序就是成员看到的规则顺序。</p>
        </div>
        <Badge tone="brand">版本 {detail.community.rulesVersion}</Badge>
      </header>
      <div className={styles.formSection}>
        {rules.length ? (
          <div className={styles.ruleList}>
            {rules.map((rule, index) => (
              <div key={`rule-${index}`} className={styles.ruleRow}>
                <span>{index + 1}</span>
                <label>
                  <span className={styles.visuallyHidden}>社群规则 {index + 1}</span>
                  <textarea
                    aria-label={`社群规则 ${index + 1}`}
                    value={rule}
                    maxLength={COMMUNITY_MAX_RULE_LENGTH}
                    onChange={(event) =>
                      setRules((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                  />
                  <small>
                    {rule.length} / {COMMUNITY_MAX_RULE_LENGTH}
                  </small>
                </label>
                <IconButton
                  size="sm"
                  label={`删除规则 ${index + 1}`}
                  icon={<X size={15} />}
                  disabled={saveRules.isPending}
                  onClick={() =>
                    setRules((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="当前没有社群规则"
            description={`可以保持空规则，也可以添加最多 ${COMMUNITY_MAX_RULE_COUNT} 条规则。`}
          />
        )}

        <div className={styles.ruleActions}>
          <Button
            variant="secondary"
            disabled={rules.length >= COMMUNITY_MAX_RULE_COUNT || saveRules.isPending}
            onClick={() => setRules((current) => [...current, ''])}
          >
            <Plus size={15} /> 添加规则
          </Button>
          <span>
            {rules.length} / {COMMUNITY_MAX_RULE_COUNT} 条
          </span>
        </div>

        <div className={styles.inlineActions}>
          <Button
            variant="secondary"
            disabled={!isDirty || saveRules.isPending}
            onClick={() => setRules(originalRules)}
          >
            放弃修改
          </Button>
          <Button
            loading={saveRules.isPending}
            disabled={!isDirty || hasInvalidRule || rules.length > COMMUNITY_MAX_RULE_COUNT}
            onClick={() => saveRules.mutate()}
          >
            <Save size={15} /> 保存规则
          </Button>
        </div>
      </div>
    </Card>
  );
}
