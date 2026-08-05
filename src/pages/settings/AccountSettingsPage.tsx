import { KeyRound, Laptop, LockKeyhole, Mail, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { APP_BRAND } from '@/shared/config/brand';
import { cn } from '@/shared/lib/cn';
import { Button, Card, Modal, TextField, useToast } from '@/shared/ui';
import { SettingsPage } from '../_shared/SettingsPage';
import styles from './SettingsPages.module.css';

type IdentityField = 'handle' | 'email' | 'phone';

const identityMeta: Record<IdentityField, { title: string; label: string; value: string }> = {
  handle: { title: '修改 Handle', label: '新 Handle', value: 'zhiqiu' },
  email: { title: '更换邮箱', label: '新邮箱', value: 'chuntao@example.com' },
  phone: { title: '更换手机号', label: '新手机号', value: '+86 13800005200' },
};

export function AccountSettingsPage() {
  const [password, setPassword] = useState(false);
  const [danger, setDanger] = useState(false);
  const [deactivate, setDeactivate] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [identityField, setIdentityField] = useState<IdentityField | null>(null);
  const [identityValue, setIdentityValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const { showToast } = useToast();

  const openIdentity = (field: IdentityField) => {
    setIdentityField(field);
    setIdentityValue(identityMeta[field].value);
  };

  return (
    <SettingsPage title="账号与安全" description="管理登录身份、密码、验证方式与活跃设备。">
      <div className={styles.stack}>
        <Card className={styles.section}>
          <header>
            <span>
              <Mail size={18} />
            </span>
            <div>
              <h2>账号身份</h2>
              <p>Handle、邮箱和手机号用于登录与找回账号。</p>
            </div>
          </header>
          <div className={styles.rows}>
            <div>
              <div>
                <strong>Handle</strong>
                <span>@zhiqiu</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openIdentity('handle')}>
                修改
              </Button>
            </div>
            <div>
              <div>
                <strong>邮箱</strong>
                <span>ch***@example.com · 已验证</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openIdentity('email')}>
                更换
              </Button>
            </div>
            <div>
              <div>
                <strong>手机号</strong>
                <span>+86 138****5200 · 已验证</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openIdentity('phone')}>
                更换
              </Button>
            </div>
          </div>
        </Card>

        <Card className={styles.section}>
          <header>
            <span>
              <KeyRound size={18} />
            </span>
            <div>
              <h2>密码与双重验证</h2>
              <p>增强账号安全，防止未经授权的登录。</p>
            </div>
          </header>
          <div className={styles.rows}>
            <div>
              <div>
                <strong>登录密码</strong>
                <span>上次修改于 62 天前</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setPassword(true)}>
                修改密码
              </Button>
            </div>
            <div>
              <div>
                <strong>双重验证</strong>
                <span>未开启 · 建议使用验证器应用</span>
              </div>
              <Button size="sm" onClick={() => setTwoFactor(true)}>
                立即开启
              </Button>
            </div>
            <div>
              <div>
                <strong>恢复代码</strong>
                <span>开启双重验证后可生成</span>
              </div>
              <Button size="sm" variant="secondary" disabled>
                查看
              </Button>
            </div>
          </div>
        </Card>

        <Card className={styles.section} id="devices">
          <header>
            <span>
              <Laptop size={18} />
            </span>
            <div>
              <h2>登录设备</h2>
              <p>你可以退出不认识或不再使用的设备。</p>
            </div>
            <BadgeLike>3 台设备</BadgeLike>
          </header>
          <div className={styles.devices}>
            <article>
              <span>
                <Laptop size={20} />
              </span>
              <div>
                <strong>Windows · Chrome 150</strong>
                <p>台北 · 当前设备 · IP 203.0.113.12</p>
                <small>活跃于刚刚</small>
              </div>
              <i>当前</i>
            </article>
            <article>
              <span>
                <Smartphone size={20} />
              </span>
              <div>
                <strong>iPhone · {APP_BRAND.name} App</strong>
                <p>上海 · IP 203.0.113.28</p>
                <small>活跃于 2 小时前</small>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => showToast({ tone: 'success', title: 'iPhone 设备已退出' })}
              >
                退出
              </Button>
            </article>
            <article>
              <span>
                <Laptop size={20} />
              </span>
              <div>
                <strong>macOS · Safari</strong>
                <p>杭州 · IP 203.0.113.91</p>
                <small>活跃于 4 天前</small>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => showToast({ tone: 'success', title: 'macOS 设备已退出' })}
              >
                退出
              </Button>
            </article>
          </div>
        </Card>

        <Card className={cn(styles.section, styles.danger)}>
          <header>
            <span>
              <Trash2 size={18} />
            </span>
            <div>
              <h2>危险操作</h2>
              <p>停用或删除账号会影响所有内容与关系。</p>
            </div>
          </header>
          <div className={styles.rows}>
            <div>
              <div>
                <strong>停用账号</strong>
                <span>暂时隐藏资料和内容，可在 30 天内恢复</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setDeactivate(true)}>
                停用
              </Button>
            </div>
            <div>
              <div>
                <strong>永久删除账号</strong>
                <span>删除后无法恢复，请先导出需要保留的数据</span>
              </div>
              <Button size="sm" variant="danger" onClick={() => setDanger(true)}>
                删除账号
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={password}
        title="修改登录密码"
        description="修改后，其他设备上的旧会话将需要重新登录。"
        onClose={() => setPassword(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPassword(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setPassword(false);
                showToast({ tone: 'success', title: '密码已更新' });
              }}
            >
              <LockKeyhole size={15} /> 确认修改
            </Button>
          </>
        }
      >
        <div className={styles.modalFields}>
          <TextField label="当前密码" type="password" name="current" />
          <TextField label="新密码" type="password" name="next" />
          <TextField label="确认新密码" type="password" name="confirm" />
        </div>
      </Modal>

      <Modal
        open={Boolean(identityField)}
        title={identityField ? identityMeta[identityField].title : '更新账号身份'}
        description="为保护账号安全，保存后需要通过验证码确认。"
        onClose={() => setIdentityField(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIdentityField(null)}>
              取消
            </Button>
            <Button
              disabled={!identityValue.trim()}
              onClick={() => {
                setIdentityField(null);
                showToast({
                  tone: 'success',
                  title: '验证信息已发送',
                  description: '完成验证后更改生效。',
                });
              }}
            >
              保存并验证
            </Button>
          </>
        }
      >
        <TextField
          label={identityField ? identityMeta[identityField].label : '新值'}
          name="identityValue"
          value={identityValue}
          onChange={(event) => setIdentityValue(event.target.value)}
        />
      </Modal>

      <Modal
        open={twoFactor}
        title="开启双重验证"
        description="使用验证器应用扫描密钥，并输入生成的 6 位验证码。"
        onClose={() => setTwoFactor(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTwoFactor(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setTwoFactor(false);
                showToast({ tone: 'success', title: '双重验证已开启' });
              }}
            >
              验证并开启
            </Button>
          </>
        }
      >
        <div className={styles.dangerConfirm}>
          <ShieldCheck size={20} />
          <p>
            设置密钥：<strong>NXRA-2FA7-ZQIU-2026</strong>
          </p>
          <TextField label="6 位验证码" name="twoFactorCode" inputMode="numeric" maxLength={6} />
        </div>
      </Modal>

      <Modal
        open={deactivate}
        title="停用账号？"
        description="资料与内容会暂时隐藏。30 天内重新登录可恢复账号。"
        onClose={() => setDeactivate(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivate(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeactivate(false);
                showToast({ tone: 'success', title: '账号停用申请已提交' });
              }}
            >
              确认停用
            </Button>
          </>
        }
      />

      <Modal
        open={danger}
        title="永久删除账号？"
        description="此操作不可撤销。你发布的内容、关系和设置将进入清理流程。"
        onClose={() => {
          setDanger(false);
          setDeleteConfirm('');
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDanger(false);
                setDeleteConfirm('');
              }}
            >
              取消
            </Button>
            <Button
              variant="danger"
              disabled={deleteConfirm !== 'DELETE @zhiqiu'}
              onClick={() => {
                setDanger(false);
                setDeleteConfirm('');
                showToast({ tone: 'success', title: '账号删除申请已提交' });
              }}
            >
              我已理解，继续
            </Button>
          </>
        }
      >
        <div className={styles.dangerConfirm}>
          <ShieldCheck size={20} />
          <p>
            请输入 <strong>DELETE @zhiqiu</strong> 以确认操作。
          </p>
          <TextField
            label="确认文本"
            name="confirmDelete"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
          />
        </div>
      </Modal>
    </SettingsPage>
  );
}

function BadgeLike({ children }: { children: string }) {
  return <span className={styles.headerBadge}>{children}</span>;
}
