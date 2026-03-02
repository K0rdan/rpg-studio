"use client";

import { useState } from "react";
import { authClient, signIn } from "@/lib/auth-client";
import { Button, Box, Typography, TextField, Paper, Divider } from "@mui/material";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async () => {
    setLoading(true);
    await signIn.magicLink({ email });
    setLoading(false);
    alert("Magic link sent!");
  };

  const handleDevLogin = async () => {
    setLoading(true);
    try {
      const result = await signIn.email({ email, password, callbackURL: "/" });
      if (result?.error) {
        // User doesn't exist yet — register them first, then sign in
        const signUpResult = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0],
        });
        if (signUpResult?.error) {
          alert(`Sign-up failed: ${signUpResult.error.message}`);
          return;
        }
        // Now sign in with the newly created account
        await signIn.email({ email, password, callbackURL: "/" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Sign in to RPG Studio
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => signIn.social({ provider: "github" })}
            disabled={loading}
          >
            Sign in with GitHub
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => signIn.social({ provider: "google" })}
            disabled={loading}
          >
            Sign in with Google
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => signIn.social({ provider: "microsoft-entra-id" })}
            disabled={loading}
          >
            Sign in with Microsoft
          </Button>
        </Box>

        <Divider sx={{ my: 3 }}>OR</Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email address"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button 
            variant="contained" 
            onClick={handleMagicLink}
            disabled={loading || !email}
          >
            Send Magic Link
          </Button>

          {process.env.NODE_ENV === "development" && (
            <>
              <TextField
                label="Password (Dev only)"
                type="password"
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button 
                variant="contained" 
                color="secondary"
                onClick={handleDevLogin}
                disabled={loading || !email || !password}
              >
                Dev Login with Password
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
