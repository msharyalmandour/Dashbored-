import { useCallback, useEffect, useState } from "react";
import type { EthicalApproval, EthicalAttachments, EthicalPrinciples } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface RowDb {
  research_project_id: string;
  application_date: string | null;
  pi_name: string;
  pi_affiliation: string;
  pi_email: string;
  pi_type: EthicalApproval["piType"];
  other_researchers: string;
  supervisor_names: string;
  registration_no: string;
  expected_start_date: string | null;
  expected_end_date: string | null;
  persons_involved: string;
  data_management_confidentiality: string;
  funding_details: string;
  principle_written_explanation: EthicalPrinciples["writtenExplanation"];
  principle_oral_explanation: EthicalPrinciples["oralExplanation"];
  principle_written_consent: EthicalPrinciples["writtenConsent"];
  principle_oral_consent: EthicalPrinciples["oralConsent"];
  principle_voluntary_informed: EthicalPrinciples["voluntaryInformed"];
  principle_withdraw_option: EthicalPrinciples["withdrawOption"];
  principle_harm_informed: EthicalPrinciples["harmInformed"];
  principle_confidentiality_guaranteed: EthicalPrinciples["confidentialityGuaranteed"];
  principle_anonymity_guaranteed: EthicalPrinciples["anonymityGuaranteed"];
  principle_vulnerable_groups_informed: EthicalPrinciples["vulnerableGroupsInformed"];
  principle_interview_no_explanation_needed: EthicalPrinciples["interviewNoExplanationNeeded"];
  principle_safe_data_storage: EthicalPrinciples["safeDataStorage"];
  principle_will_publish: EthicalPrinciples["willPublish"];
  attach_protocol_or_proposal: boolean;
  attach_participant_info_sheet: boolean;
  attach_consent_form: boolean;
  attach_study_tools: boolean;
  attach_other_supportive_docs: boolean;
  outcome: EthicalApproval["outcome"];
  ref_number: string | null;
  meeting_date: string | null;
  approval_letter_file_id: string | null;
  updated_at: string;
}

function mapRow(row: RowDb): EthicalApproval {
  return {
    researchProjectId: row.research_project_id,
    applicationDate: row.application_date,
    piName: row.pi_name,
    piAffiliation: row.pi_affiliation,
    piEmail: row.pi_email,
    piType: row.pi_type,
    otherResearchers: row.other_researchers,
    supervisorNames: row.supervisor_names,
    registrationNo: row.registration_no,
    expectedStartDate: row.expected_start_date,
    expectedEndDate: row.expected_end_date,
    personsInvolved: row.persons_involved,
    dataManagementConfidentiality: row.data_management_confidentiality,
    fundingDetails: row.funding_details,
    principles: {
      writtenExplanation: row.principle_written_explanation,
      oralExplanation: row.principle_oral_explanation,
      writtenConsent: row.principle_written_consent,
      oralConsent: row.principle_oral_consent,
      voluntaryInformed: row.principle_voluntary_informed,
      withdrawOption: row.principle_withdraw_option,
      harmInformed: row.principle_harm_informed,
      confidentialityGuaranteed: row.principle_confidentiality_guaranteed,
      anonymityGuaranteed: row.principle_anonymity_guaranteed,
      vulnerableGroupsInformed: row.principle_vulnerable_groups_informed,
      interviewNoExplanationNeeded: row.principle_interview_no_explanation_needed,
      safeDataStorage: row.principle_safe_data_storage,
      willPublish: row.principle_will_publish,
    },
    attachments: {
      protocolOrProposal: row.attach_protocol_or_proposal,
      participantInfoSheet: row.attach_participant_info_sheet,
      consentForm: row.attach_consent_form,
      studyTools: row.attach_study_tools,
      otherSupportiveDocs: row.attach_other_supportive_docs,
    },
    outcome: row.outcome,
    refNumber: row.ref_number,
    meetingDate: row.meeting_date,
    approvalLetterFileId: row.approval_letter_file_id,
    updatedAt: row.updated_at,
  };
}

const emptyPrinciples: EthicalPrinciples = {
  writtenExplanation: null,
  oralExplanation: null,
  writtenConsent: null,
  oralConsent: null,
  voluntaryInformed: null,
  withdrawOption: null,
  harmInformed: null,
  confidentialityGuaranteed: null,
  anonymityGuaranteed: null,
  vulnerableGroupsInformed: null,
  interviewNoExplanationNeeded: null,
  safeDataStorage: null,
  willPublish: null,
};

const emptyAttachments: EthicalAttachments = {
  protocolOrProposal: false,
  participantInfoSheet: false,
  consentForm: false,
  studyTools: false,
  otherSupportiveDocs: false,
};

const mockEthicalApproval: EthicalApproval = {
  researchProjectId: "mock-project",
  applicationDate: null,
  piName: "",
  piAffiliation: "",
  piEmail: "",
  piType: "undergraduate",
  otherResearchers: "",
  supervisorNames: "",
  registrationNo: "",
  expectedStartDate: null,
  expectedEndDate: null,
  personsInvolved: "",
  dataManagementConfidentiality: "",
  fundingDetails: "",
  principles: emptyPrinciples,
  attachments: emptyAttachments,
  outcome: "pending",
  refNumber: null,
  meetingDate: null,
  approvalLetterFileId: null,
  updatedAt: "2026-02-01",
};

const principleColumn: Record<keyof EthicalPrinciples, string> = {
  writtenExplanation: "principle_written_explanation",
  oralExplanation: "principle_oral_explanation",
  writtenConsent: "principle_written_consent",
  oralConsent: "principle_oral_consent",
  voluntaryInformed: "principle_voluntary_informed",
  withdrawOption: "principle_withdraw_option",
  harmInformed: "principle_harm_informed",
  confidentialityGuaranteed: "principle_confidentiality_guaranteed",
  anonymityGuaranteed: "principle_anonymity_guaranteed",
  vulnerableGroupsInformed: "principle_vulnerable_groups_informed",
  interviewNoExplanationNeeded: "principle_interview_no_explanation_needed",
  safeDataStorage: "principle_safe_data_storage",
  willPublish: "principle_will_publish",
};

const attachmentColumn: Record<keyof EthicalAttachments, string> = {
  protocolOrProposal: "attach_protocol_or_proposal",
  participantInfoSheet: "attach_participant_info_sheet",
  consentForm: "attach_consent_form",
  studyTools: "attach_study_tools",
  otherSupportiveDocs: "attach_other_supportive_docs",
};

type Updates = Partial<
  Omit<EthicalApproval, "researchProjectId" | "updatedAt" | "principles" | "attachments">
> & {
  principles?: Partial<EthicalPrinciples>;
  attachments?: Partial<EthicalAttachments>;
};

/** طلب الموافقة الأخلاقية الحقيقي — صف واحد لكل مشروع بحث، يُنشأ فارغًا تلقائيًا
    ويُملأ بالتدريج من الواجهة. وضع العرض التجريبي يرجع بيانات فارغة للعرض فقط. */
export function useEthicalApproval() {
  const [ethicalApproval, setEthicalApproval] = useState<EthicalApproval>(mockEthicalApproval);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!.from("ethical_approval").select("*").single();
    if (data) setEthicalApproval(mapRow(data as RowDb));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateEthicalApproval = async (updates: Updates) => {
    const merged: EthicalApproval = {
      ...ethicalApproval,
      ...updates,
      principles: { ...ethicalApproval.principles, ...updates.principles },
      attachments: { ...ethicalApproval.attachments, ...updates.attachments },
    };

    if (!isSupabaseConfigured) {
      setEthicalApproval(merged);
      return { error: undefined as string | undefined };
    }
    setEthicalApproval(merged);

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.applicationDate !== undefined) dbUpdates.application_date = updates.applicationDate;
    if (updates.piName !== undefined) dbUpdates.pi_name = updates.piName;
    if (updates.piAffiliation !== undefined) dbUpdates.pi_affiliation = updates.piAffiliation;
    if (updates.piEmail !== undefined) dbUpdates.pi_email = updates.piEmail;
    if (updates.piType !== undefined) dbUpdates.pi_type = updates.piType;
    if (updates.otherResearchers !== undefined) dbUpdates.other_researchers = updates.otherResearchers;
    if (updates.supervisorNames !== undefined) dbUpdates.supervisor_names = updates.supervisorNames;
    if (updates.registrationNo !== undefined) dbUpdates.registration_no = updates.registrationNo;
    if (updates.expectedStartDate !== undefined) dbUpdates.expected_start_date = updates.expectedStartDate;
    if (updates.expectedEndDate !== undefined) dbUpdates.expected_end_date = updates.expectedEndDate;
    if (updates.personsInvolved !== undefined) dbUpdates.persons_involved = updates.personsInvolved;
    if (updates.dataManagementConfidentiality !== undefined)
      dbUpdates.data_management_confidentiality = updates.dataManagementConfidentiality;
    if (updates.fundingDetails !== undefined) dbUpdates.funding_details = updates.fundingDetails;
    if (updates.outcome !== undefined) dbUpdates.outcome = updates.outcome;
    if (updates.refNumber !== undefined) dbUpdates.ref_number = updates.refNumber;
    if (updates.meetingDate !== undefined) dbUpdates.meeting_date = updates.meetingDate;
    if (updates.approvalLetterFileId !== undefined) dbUpdates.approval_letter_file_id = updates.approvalLetterFileId;
    if (updates.principles) {
      for (const [key, value] of Object.entries(updates.principles)) {
        dbUpdates[principleColumn[key as keyof EthicalPrinciples]] = value;
      }
    }
    if (updates.attachments) {
      for (const [key, value] of Object.entries(updates.attachments)) {
        dbUpdates[attachmentColumn[key as keyof EthicalAttachments]] = value;
      }
    }

    const { data: projectId } = await supabase!.rpc("my_research_project_id");
    const { error } = await supabase!
      .from("ethical_approval")
      .update(dbUpdates)
      .eq("research_project_id", projectId);
    if (error) load();
    return { error: error?.message };
  };

  return { ethicalApproval, loading, updateEthicalApproval };
}
