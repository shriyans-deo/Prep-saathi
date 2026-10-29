import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomTabs from './BottomTabs';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-5xl">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}
