import { ShieldAlert } from 'lucide-react';
import { Card } from '@/shared/ui';
import { EmptyPanel, Notice } from '@/pages/_shared/PageParts';
import styles from '../CommunityManagePage.module.css';

export function ContentAvailabilitySection() {
  return (
    <div className={styles.stack}>
      <Notice tone="warning">
        当前后端版本没有社群举报队列、举报审批或自由文本公告接口。此页面不会再用静态数据模拟处理成功。
      </Notice>
      <Card className={styles.panel}>
        <header>
          <div>
            <h2>内容管理</h2>
            <p>等待正式举报与内容审核合同接入。</p>
          </div>
        </header>
        <EmptyPanel
          icon={<ShieldAlert size={30} />}
          title="内容举报队列尚未开放"
          description="后端提供帖子删除、解绑与置顶审计能力，但当前管理路由没有可供本页读取和审批的举报列表。为避免误导，保留明确的不可用状态，不展示虚构举报。"
        />
      </Card>
    </div>
  );
}
