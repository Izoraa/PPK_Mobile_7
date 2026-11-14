import AppTabs from '@/components/app-tabs';
import { useApp } from '@/state/AppContext';

export default function TabsLayout() {
  const { currentUser } = useApp();
  return <AppTabs key={currentUser ? `user:${currentUser.id}` : 'signed-out'} />;
}
