import { requireSession } from '@/lib/session';

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return children;
}
