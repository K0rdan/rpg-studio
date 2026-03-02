"use client";

import { Button } from "@mui/material";
import { useRouter } from "next/navigation";

export function SignInButton() {
  const router = useRouter();

  return (
    <Button color="inherit" onClick={() => router.push("/login")}>
      Sign In
    </Button>
  );
}
