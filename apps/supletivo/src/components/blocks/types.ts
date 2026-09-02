export interface BlockOut {
  external_id: string;
  source_type: "rg" | "address_proof" | "selfie" | "student_document" | "payment" | string;
  title: string;
  description: string;
  action_label: string;
  action_route: string;
  created_at: string;
}

export interface ExplainedBlock {
  original: BlockOut;
  title: string;
  friendlyReason: string;
  tip: string;
  actionLabel: string;
  actionRoute: string;
  severity: "warning" | "error" | "info";
}
