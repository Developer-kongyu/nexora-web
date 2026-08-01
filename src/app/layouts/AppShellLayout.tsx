import { Outlet } from 'react-router-dom';
import { MobileNavigation, Sidebar } from '@/widgets/app-shell/Sidebar';
import { Topbar } from '@/widgets/app-shell/Topbar';
import styles from './AppShellLayout.module.css';

export function AppShellLayout() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.workspace}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
      <MobileNavigation />
    </div>
  );
}
