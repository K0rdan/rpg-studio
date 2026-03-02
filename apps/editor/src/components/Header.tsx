import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { UserMenu } from "@/components/auth/UserMenu"
import { SignInButton } from "@/components/auth/SignInButton"
import Link from 'next/link';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

export default async function Header() {
  let session = null;
  
  try {
    const sessionRes = await auth.api.getSession({
      headers: await headers()
    });
    session = sessionRes?.session ? sessionRes : null;
  } catch (error) {
    // DB or auth service unavailable (e.g. IP-restricted network, cold start).
    // Degrade gracefully: show Sign-In button as if logged out.
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[Header] Auth service unavailable — showing signed-out state. Reason: ${reason}`);
  }
  
  return (
    <AppBar position="static">
      <Toolbar>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
          <Typography 
            variant="h6" 
            component="span"
            sx={{ 
              '&:hover': { opacity: 0.8 }
            }}
          >
            RPG Studio
          </Typography>
        </Link>
        
        {session?.user && (
          <Link href="/projects" style={{ textDecoration: 'none' }}>
            <Button 
              color="inherit"
              sx={{ mr: 2 }}
            >
              Projects
            </Button>
          </Link>
        )}
        
        <Box>
          {session?.user ? (
            <UserMenu user={session.user} />
          ) : (
            <SignInButton />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
