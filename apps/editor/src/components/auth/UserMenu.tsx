import { signOut } from "@/auth"
 
export function UserMenu({ user }: { user: { name?: string | null, image?: string | null, email?: string | null } }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      {user.image && <img src={user.image} alt={user.name || 'User'} style={{ width: 32, height: 32, borderRadius: '50%' }} />}
      <span>{user.name}</span>
      <form
        action={async () => {
          "use server"
          await signOut()
        }}
      >
        <button type="submit">Sign Out</button>
      </form>
    </div>
  )
}
