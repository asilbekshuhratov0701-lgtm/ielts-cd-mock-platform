import { PageShell } from "@/components/Shell";
import { ExamImporter } from "@/components/exam-import/ExamImporter";

export default function ExamImportPage() {
  return (
    <PageShell
      title="Exam builder — JSON import"
      subtitle="Upload a per-skill exam JSON (plus a Listening audio file), validate it, and preview it in the CD interface."
    >
      <ExamImporter />
    </PageShell>
  );
}
