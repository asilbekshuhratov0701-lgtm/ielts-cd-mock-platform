import { ErrorState } from "@/components/ErrorState";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <ErrorState
      code="404"
      title="We couldn't find that page"
      description="The link may be out of date, or the exam, candidate or result you were looking for has been moved or deleted."
      primary={{ href: "/", label: "Back to home" }}
      secondary={{ href: "/dashboard", label: "My dashboard" }}
    />
  );
}
