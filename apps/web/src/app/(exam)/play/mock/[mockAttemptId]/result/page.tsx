import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ExitFullscreen } from "@/components/exam/ExitFullscreen";
import { MockResultView, type MockPartView } from "@/components/exam/MockResultView";
import { skillBand, overallBandFrom } from "@/lib/mock-band";

interface WritingResult {
  kind: "writing";
  tasks: {
    taskNumber: number;
    taskBand: number;
    criteria: {
      taskResponse: number;
      coherenceCohesion: number;
      lexicalResource: number;
      grammaticalRange: number;
    };
  }[];
  writingBand: number;
  feedback?: string | null;
}

export default async function MockResultPage({
  params
}: {
  params: Promise<{ mockAttemptId: string }>;
}) {
  const { mockAttemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.mockAttempt.findUnique({
    where: { id: mockAttemptId },
    include: {
      mockExam: true,
      partAttempts: {
        include: { blueprint: { select: { module: true, title: true } } },
        orderBy: { partOrder: "asc" }
      }
    }
  });
  if (!attempt || attempt.candidateId !== session.user.id) notFound();
  if (attempt.status !== "submitted") redirect(`/play/mock/${mockAttemptId}`);

  if (!attempt.resultsReleased) {
    return (
      <div className="relative flex min-h-[82vh] items-center justify-center overflow-hidden px-6 py-16">
        <ExitFullscreen />
        <style
          dangerouslySetInnerHTML={{
            __html: `
@keyframes zm-thanks-grad{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes zm-thanks-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes zm-thanks-rise{0%{opacity:0;transform:translateY(18px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}
.zm-thanks-bg{background:linear-gradient(120deg,#eaf1ff,#f0eaff,#e6f6ff,#efe8ff,#eaf1ff);background-size:300% 300%;animation:zm-thanks-grad 16s ease infinite;}
.zm-thanks-emoji{animation:zm-thanks-float 3.5s ease-in-out infinite;}
.zm-thanks-title{background:linear-gradient(135deg,#2563EB,#7C5CFC);-webkit-background-clip:text;background-clip:text;color:transparent;}
.zm-thanks-card{animation:zm-thanks-rise .7s cubic-bezier(.16,1,.3,1) both;}
@media (prefers-reduced-motion: reduce){.zm-thanks-bg,.zm-thanks-emoji,.zm-thanks-card{animation:none!important;}}
            `
          }}
        />
        <div className="zm-thanks-bg absolute inset-0 -z-10" />
        <div className="absolute -left-24 top-6 -z-10 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl" />
        <div className="absolute -right-24 bottom-6 -z-10 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />

        <div className="zm-thanks-card w-full max-w-xl rounded-3xl border border-white/60 bg-white/70 p-10 text-center shadow-[0_24px_60px_rgba(37,99,235,0.16)] backdrop-blur-xl sm:p-14">
          <div
            className="zm-thanks-emoji mx-auto mb-6 text-7xl sm:text-8xl"
            role="img"
            aria-label="smiling face"
          >
            😊
          </div>
          <h1 className="zm-thanks-title text-3xl font-extrabold italic leading-tight tracking-tight sm:text-4xl">
            Thank you for completing the mock exam.
          </h1>
          <p className="mt-4 text-lg italic text-slate-600 sm:text-xl">
            Your results will be available soon!
          </p>
          <p className="mt-6 text-sm text-muted">{attempt.mockExam.title}</p>
          <div className="mt-8 flex justify-center">
            <Link href="/play">
              <Button
                className="h-11 px-7 text-white"
                style={{ background: "linear-gradient(135deg,#2563EB,#7C5CFC)" }}
              >
                Back to exams
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const parts: MockPartView[] = attempt.partAttempts.map((p) => {
    const module = p.blueprint.module;
    const title = p.blueprint.title;
    if (module === "writing") {
      const rj = p.resultJson as unknown as WritingResult | null;
      const band = typeof rj?.writingBand === "number" ? rj.writingBand : null;
      const writing =
        rj && Array.isArray(rj.tasks)
          ? {
              tasks: rj.tasks.map((t) => ({
                taskNumber: t.taskNumber,
                taskBand: t.taskBand,
                criteria: t.criteria
              })),
              feedback: rj.feedback ?? null
            }
          : null;
      return { module, title, band, writing };
    }
    const raw = p.rawScore ?? 0;
    const total = p.totalScore ?? 0;
    return { module, title, band: skillBand(module, raw, total), raw, total };
  });
  const overall = overallBandFrom(parts.map((p) => p.band));

  return (
    <>
      <ExitFullscreen />
      <MockResultView examTitle={attempt.mockExam.title} overall={overall} parts={parts} />
    </>
  );
}
