// Domain core: shared types, scoring, band calculation, exam state machines & timing.
// Pure logic only — no I/O, no Prisma, no framework code (so it runs in web and worker).
export * from "./types";
export * from "./scoring/band";
export * from "./scoring/objective";
export * from "./scoring/tables";
export * from "./exam/state-machine";
export * from "./exam/timing";
