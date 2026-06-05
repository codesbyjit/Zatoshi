import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Lock as LockIcon } from "@hugeicons/core-free-icons";
import { UserPlus as UserPlusIcon } from "@hugeicons/core-free-icons";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Zatoshi</h1>
          <p className="text-lg text-muted-foreground">
            A Bitcoin-first marketplace for digital goods and services
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 space-y-4 sm:space-y-0">
          <Button asChild className="flex-1 px-8 py-3">
            <a
              href="/login"
              className="flex w-full items-center justify-center gap-2"
            >
              <HugeiconsIcon icon={LockIcon} className="h-4 w-4" />
              Login
            </a>
          </Button>

          <Button variant="outline" asChild className="flex-1 px-8 py-3 border">
            <a
              href="/signup"
              className="flex w-full items-center justify-center gap-2"
            >
              <HugeiconsIcon icon={UserPlusIcon} className="h-4 w-4" />
              Sign Up
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
