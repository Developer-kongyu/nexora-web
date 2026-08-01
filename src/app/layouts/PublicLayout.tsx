import { Compass, LockKeyhole, Sparkles, UsersRound } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import styles from './PublicLayout.module.css';

export function PublicLayout() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.brand}>
          <div className={styles.brandTop}>
            <span className={styles.logo}>L</span>
            <span>
              <strong>LCT Circle</strong>
              <small>发现同频的人</small>
            </span>
          </div>

          <div className={styles.hero}>
            <span className={styles.eyebrow}>
              <Sparkles size={14} />
              现代兴趣社交网络
            </span>
            <h1>
              分享热爱，
              <br />
              遇见真实连接。
            </h1>
            <p>围绕兴趣发现内容、创作者与社群，让每一次表达都有回应。</p>
          </div>

          <div className={styles.features}>
            <article>
              <span>
                <Compass size={19} />
              </span>
              <div>
                <strong>个性化发现</strong>
                <p>用兴趣构建真正属于你的内容流。</p>
              </div>
            </article>
            <article>
              <span>
                <UsersRound size={19} />
              </span>
              <div>
                <strong>深度社群</strong>
                <p>与同频伙伴共同讨论和持续创作。</p>
              </div>
            </article>
            <article>
              <span>
                <LockKeyhole size={19} />
              </span>
              <div>
                <strong>隐私可控</strong>
                <p>清晰的权限设置与安全保护。</p>
              </div>
            </article>
          </div>

          <p className={styles.copyright}>© 2026 LCT Circle · 尊重表达与真实关系</p>
        </section>

        <section className={styles.panel}>
          <Outlet />
        </section>
      </div>
    </main>
  );
}
