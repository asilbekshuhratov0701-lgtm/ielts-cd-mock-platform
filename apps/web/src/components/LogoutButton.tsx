import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";

export function LogoutButton({ withLabel = true }: { withLabel?: boolean }) {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size={withLabel ? "sm" : "icon"} title="Logout">
        <LogOut className="h-4 w-4" />
        {withLabel ? "Logout" : null}
      </Button>
    </form>
  );
}
