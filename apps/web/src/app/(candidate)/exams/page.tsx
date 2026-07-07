import { redirect } from "next/navigation";

export default function LegacyExamsRedirect() {
  redirect("/play");
}
