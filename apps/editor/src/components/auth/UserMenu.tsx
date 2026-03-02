"use client";

import { authClient } from "@/lib/auth-client";
 
export function UserMenu({ user }: { user: { name?: string | null, image?: string | null, email?: string | null } }) {
  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {user.image && <img src={user.image} alt={user.name || 'User'} style={{ width: 32, height: 32, borderRadius: '50%' }} />}
      <span>{user.name}</span>
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}
