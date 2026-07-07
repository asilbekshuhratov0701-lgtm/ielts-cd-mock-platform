import { redirect } from "next/navigation";

export default function LegacyResultsRedirect() {
  redirect("/play");
}
