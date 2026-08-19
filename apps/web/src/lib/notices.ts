import type { ToastVariant } from "@/components/ui/toast";

export interface Notice {
  variant: ToastVariant;
  title: string;
  description?: string;
}

export const NOTICES: Record<string, Notice> = {
  exam_imported: {
    variant: "success",
    title: "Exam imported",
    description: "The file validated cleanly and landed as a draft."
  },
  exam_published: {
    variant: "success",
    title: "Exam published",
    description: "Candidates can be assigned to it now."
  },
  exam_unpublished: {
    variant: "info",
    title: "Exam unpublished",
    description: "It is back to draft and hidden from candidates."
  },
  exam_deleted: { variant: "success", title: "Exam deleted" },
  exam_renamed: { variant: "success", title: "Part renamed" },
  writing_created: { variant: "success", title: "Writing exam created" },

  audio_attached: {
    variant: "success",
    title: "Audio attached",
    description: "The listening track is bound to this exam."
  },
  image_attached: { variant: "success", title: "Image attached" },

  mock_created: { variant: "success", title: "Mock exam created" },
  mock_published: {
    variant: "success",
    title: "Mock published",
    description: "Assigned candidates can start it."
  },
  mock_unpublished: { variant: "info", title: "Mock unpublished" },
  mock_deleted: { variant: "success", title: "Mock deleted" },
  mock_renamed: { variant: "success", title: "Mock renamed" },
  notes_saved: {
    variant: "success",
    title: "Notes saved",
    description: "They show on this mock's detail page."
  },
  notes_cleared: { variant: "info", title: "Notes cleared" },
  assignments_saved: {
    variant: "success",
    title: "Assignments saved",
    description: "Candidate and group access has been updated."
  },

  results_released: {
    variant: "success",
    title: "Results released",
    description: "The candidate can see their bands."
  },
  results_held: { variant: "info", title: "Results held back" },
  speaking_saved: { variant: "success", title: "Speaking band saved" },
  speaking_cleared: { variant: "info", title: "Speaking band cleared" },
  writing_marked: { variant: "success", title: "Writing marked" },
  writing_deleted: {
    variant: "success",
    title: "Submissions deleted",
    description: "The selected writing submissions are gone for good."
  },

  candidate_created: { variant: "success", title: "Candidate created" },
  candidate_updated: { variant: "success", title: "Candidate updated" },
  candidate_deleted: { variant: "success", title: "Candidate deleted" },
  candidates_imported: { variant: "success", title: "Candidates imported" },
  password_reset: { variant: "success", title: "Password reset" },
  status_changed: { variant: "success", title: "Status updated" },
  group_created: { variant: "success", title: "Group created" },
  group_updated: { variant: "success", title: "Group updated" },
  group_deleted: { variant: "success", title: "Group deleted" },
  settings_saved: { variant: "success", title: "Settings saved" },

  attempt_paused: {
    variant: "info",
    title: "Clock frozen",
    description: "No more time is being used on this session."
  },
  attempt_resumed: {
    variant: "success",
    title: "Session resumed",
    description: "The candidate can continue from where they stopped."
  },
  time_granted: { variant: "success", title: "Extra time granted" },

  email: {
    variant: "error",
    title: "Email already in use",
    description: "A user with that email already exists."
  },
  empty: { variant: "error", title: "Nothing to import", description: "The file had no rows." },
  parse: {
    variant: "error",
    title: "Could not read that file",
    description: "Check the format and try again."
  },
  invalid: { variant: "error", title: "That did not validate", description: "Review the errors and retry." },
  too_large: { variant: "error", title: "File is too large" },
  role: { variant: "error", title: "Not allowed", description: "Your role cannot perform that action." },
  in_use: {
    variant: "error",
    title: "Still in use",
    description: "It belongs to a mock or has attempts, so it cannot be deleted."
  },
  has_attempts: {
    variant: "error",
    title: "Candidates have already sat this",
    description: "Delete the attempts first if you really need to remove it."
  },
  mock_incomplete: {
    variant: "error",
    title: "Mock is incomplete",
    description: "Add the missing parts before publishing."
  },
  writing_unmarked: {
    variant: "error",
    title: "Writing is not marked yet",
    description: "Mark the writing tasks before releasing results."
  },
  writing_incomplete: { variant: "error", title: "Writing marking is incomplete" },
  writing_invalid: { variant: "error", title: "Those criteria are not valid" },
  speaking_band: {
    variant: "error",
    title: "Invalid speaking band",
    description: "Enter a band between 0 and 9 in steps of 0.5."
  },
  upload_failed: { variant: "error", title: "Upload failed", description: "Please try again." },
  forbidden: { variant: "error", title: "Not permitted" },
  not_found: { variant: "error", title: "Not found" },
  title_invalid: {
    variant: "error",
    title: "That title will not do",
    description: "Give it between 1 and 200 characters."
  },
  notes_too_long: {
    variant: "error",
    title: "Notes are too long",
    description: "Keep them under 4000 characters."
  }
};

export function noticeFor(code: string | null | undefined): Notice | null {
  if (!code) return null;
  return NOTICES[code] ?? null;
}
