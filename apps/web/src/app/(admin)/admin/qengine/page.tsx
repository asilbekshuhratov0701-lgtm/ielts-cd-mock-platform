import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { PrimitivesDemo } from "@/components/question-engine/demo/PrimitivesDemo";
import { FixturesDemo } from "@/components/question-engine/demo/FixturesDemo";

export default function QEngineDemoPage() {
  return (
    <PageShell
      title="Question engine"
      subtitle="Data-driven IELTS question types: every group renders through one inputKind dispatch into a shared answers store."
    >
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Listening &amp; Reading question types
        </h2>
        <FixturesDemo />
      </section>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-semibold text-foreground">The 4 primitives in isolation</h2>
        <p className="mb-4 text-sm text-muted">
          radio · checkbox · gap · select — every question type above is configuration on top of
          these.
        </p>
        <PrimitivesDemo />
      </Card>
    </PageShell>
  );
}
