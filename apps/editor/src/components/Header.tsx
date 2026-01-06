import { auth } from "@/auth"
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
    session = await auth();
  } catch (error) {
    console.error('[Header] Auth error (DB might be unavailable):', error instanceof Error ? error.message : error);
    // Continue with null session - user will see sign-in button
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
