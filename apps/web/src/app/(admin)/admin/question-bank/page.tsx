import { PageShell, StubNotice } from "@/components/Shell";

export const metadata = { title: "Question Bank" };

export default function AdminQuestionBankPage() {
  return (
    <PageShell
      title="Question Bank"
      subtitle="Reusable passages, audio, question groups, writing tasks — search, filter, randomize."
    >
      <StubNotice feature="Content library (E2) + randomized mock generator" />
    </PageShell>
  );
}
