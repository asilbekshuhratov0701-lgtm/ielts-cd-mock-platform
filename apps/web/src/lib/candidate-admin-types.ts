export interface ImportResult {
  ok: boolean;
  created: number;
  updated: number;
  failed: number;
  groupsCreated: number;
  errors: string[];
  generated: { email: string; password: string }[];
  message?: string;
}

export const EMPTY_IMPORT_RESULT: ImportResult = {
  ok: true,
  created: 0,
  updated: 0,
  failed: 0,
  groupsCreated: 0,
  errors: [],
  generated: []
};
