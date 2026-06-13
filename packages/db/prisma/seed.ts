import { hash } from "@node-rs/argon2";
import { prisma } from "../src/index";

const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 } as const;
const DEMO_EXAM_TITLE = "IELTS Academic Mock 1";

async function main(): Promise<void> {
  const org = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "Default Center", slug: "default" }
  });

  const adminHash = await hash("Admin12345!", ARGON_OPTS);
  await prisma.user.upsert({
    where: { email: "admin@demo.test" },
    update: {},
    create: {
      email: "admin@demo.test",
      name: "Demo Admin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: adminHash,
      orgId: org.id,
      staffProfile: { create: { title: "Administrator" } }
    }
  });

  const candidateHash = await hash("Candidate12345!", ARGON_OPTS);
  const candidate = await prisma.user.upsert({
    where: { email: "candidate@demo.test" },
    update: {},
    create: {
      email: "candidate@demo.test",
      name: "Demo Candidate",
      role: "CANDIDATE",
      status: "ACTIVE",
      passwordHash: candidateHash,
      orgId: org.id,
      candidateProfile: { create: { targetBand: 7 } }
    }
  });

  const existingExam = await prisma.exam.findFirst({
    where: { orgId: org.id, title: DEMO_EXAM_TITLE }
  });

  if (!existingExam) {
    const exam = await prisma.exam.create({
      data: {
        orgId: org.id,
        title: DEMO_EXAM_TITLE,
        moduleType: "ACADEMIC",
        status: "PUBLISHED",
        source: "MANUAL",
        versionLabel: "v1",
        publishedAt: new Date(),
        sections: {
          create: [
            {
              kind: "LISTENING",
              order: 0,
              durationSec: 1800,
              questionGroups: {
                create: [
                  {
                    type: "SHORT_ANSWER",
                    order: 0,
                    instructionsRichtext:
                      "Questions 1-3: Write NO MORE THAN THREE WORDS for each answer.",
                    questions: {
                      create: [
                        {
                          number: 1,
                          prompt: "The library opens at ___ a.m. on weekdays.",
                          answerType: "TEXT",
                          answerKey: {
                            create: { acceptedJson: ["9", "nine", "9am"], matchMode: "CONTAINS" }
                          }
                        },
                        {
                          number: 2,
                          prompt: "Students must bring their ___ to borrow books.",
                          answerType: "TEXT",
                          answerKey: {
                            create: {
                              acceptedJson: ["id card", "student card", "id"],
                              matchMode: "CONTAINS"
                            }
                          }
                        },
                        {
                          number: 3,
                          prompt: "The maximum loan period is ___ weeks.",
                          answerType: "TEXT",
                          answerKey: {
                            create: { acceptedJson: ["2", "two"], matchMode: "CONTAINS" }
                          }
                        }
                      ]
                    }
                  },
                  {
                    type: "MULTIPLE_CHOICE",
                    order: 1,
                    instructionsRichtext: "Question 4: Choose the correct letter.",
                    questions: {
                      create: [
                        {
                          number: 4,
                          prompt: "What does the speaker mainly discuss?",
                          answerType: "SINGLE",
                          options: {
                            create: [
                              { label: "Library opening hours", value: "A", order: 0 },
                              { label: "Borrowing rules", value: "B", order: 1 },
                              { label: "Study spaces", value: "C", order: 2 }
                            ]
                          },
                          answerKey: { create: { acceptedJson: ["B"], matchMode: "EXACT" } }
                        }
                      ]
                    }
                  }
                ]
              }
            },
            {
              kind: "READING",
              order: 1,
              durationSec: 3600,
              passages: {
                create: [
                  {
                    order: 0,
                    title: "Passage 1: The History of Tea",
                    bodyRichtext:
                      "Tea is one of the most widely consumed beverages in the world. " +
                      "Its origins trace back thousands of years to ancient China, where it was " +
                      "first used as a medicinal drink before becoming a daily staple."
                  }
                ]
              },
              questionGroups: {
                create: [
                  {
                    type: "TRUE_FALSE_NOT_GIVEN",
                    order: 0,
                    instructionsRichtext:
                      "Questions 5-7: Do the statements agree with the information? Choose TRUE, FALSE or NOT GIVEN.",
                    questions: {
                      create: [
                        {
                          number: 5,
                          prompt: "Tea originated in ancient China.",
                          answerType: "SINGLE",
                          options: {
                            create: [
                              { label: "TRUE", value: "TRUE", order: 0 },
                              { label: "FALSE", value: "FALSE", order: 1 },
                              { label: "NOT GIVEN", value: "NOT_GIVEN", order: 2 }
                            ]
                          },
                          answerKey: { create: { acceptedJson: ["TRUE"], matchMode: "EXACT" } }
                        },
                        {
                          number: 6,
                          prompt: "Tea was first used as a flavouring for food.",
                          answerType: "SINGLE",
                          options: {
                            create: [
                              { label: "TRUE", value: "TRUE", order: 0 },
                              { label: "FALSE", value: "FALSE", order: 1 },
                              { label: "NOT GIVEN", value: "NOT_GIVEN", order: 2 }
                            ]
                          },
                          answerKey: { create: { acceptedJson: ["FALSE"], matchMode: "EXACT" } }
                        },
                        {
                          number: 7,
                          prompt: "Tea is the most expensive beverage in the world.",
                          answerType: "SINGLE",
                          options: {
                            create: [
                              { label: "TRUE", value: "TRUE", order: 0 },
                              { label: "FALSE", value: "FALSE", order: 1 },
                              { label: "NOT GIVEN", value: "NOT_GIVEN", order: 2 }
                            ]
                          },
                          answerKey: { create: { acceptedJson: ["NOT_GIVEN"], matchMode: "EXACT" } }
                        }
                      ]
                    }
                  }
                ]
              }
            },
            {
              kind: "WRITING",
              order: 2,
              durationSec: 3600,
              writingTasks: {
                create: [
                  {
                    taskNo: 1,
                    minWords: 150,
                    promptRichtext:
                      "The chart below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features."
                  },
                  {
                    taskNo: 2,
                    minWords: 250,
                    promptRichtext:
                      "Some people believe that technology has made our lives more complex. To what extent do you agree or disagree? Give reasons and examples."
                  }
                ]
              }
            }
          ]
        }
      }
    });

    await prisma.examAssignment.create({
      data: {
        examId: exam.id,
        targetType: "CANDIDATE",
        candidateId: candidate.id,
        status: "ACTIVE",
        maxAttempts: 5
      }
    });
  }

  console.info("[seed] default org + demo users + demo exam ready:");
  console.info("[seed]   admin@demo.test / Admin12345!");
  console.info("[seed]   candidate@demo.test / Candidate12345!");
  console.info(`[seed]   exam: ${DEMO_EXAM_TITLE} (published, assigned to candidate)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
