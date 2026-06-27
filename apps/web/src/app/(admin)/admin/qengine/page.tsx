import { PageShell } from "@/components/Shell";
import { PrimitivesDemo } from "@/components/question-engine/demo/PrimitivesDemo";

export default function QEngineDemoPage() {
  return (
    <PageShell
      title="Question engine — primitives"
      subtitle="The 4 input primitives (radio · checkbox · gap · select) in isolation, writing to a shared answers store."
    >
      <PrimitivesDemo />
    </PageShell>
  );
}
