import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { RETURN_TO_PARAM, sanitizeReturnTo } from '@/lib/authRoutes';
import { getServerSession } from '@/lib/session';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = params[RETURN_TO_PARAM];
  const returnTo = sanitizeReturnTo(Array.isArray(requested) ? requested[0] : requested) ?? '/projects';

  const session = await getServerSession();
  if (session?.user?.id) {
    redirect(returnTo);
  }

  return <LoginForm callbackURL={returnTo} />;
}
