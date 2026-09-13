export interface DestinationLabelInfo {
  isFamily: boolean;
  beneficiaryName: string;
  badge: string;
  fullLabel: string;
}

/**
 * Distinguishes between the client's own home and an SOS for a family member.
 * e.g., "SOS for Papa · A-47, Sector 62, Noida" vs "Client Home · A-47, Sector 62, Noida"
 */
export function formatDestinationLabel(job: {
  location: string;
  requestedForRelation?: string;
  requestedForMemberId?: string;
  requesterName?: string;
  customerName?: string;
  description?: string;
}): DestinationLabelInfo {
  const isFamily = Boolean(
    job.requestedForRelation ||
    job.requestedForMemberId ||
    (job.requesterName && job.customerName && job.requesterName !== job.customerName)
  );

  const beneficiary = job.requestedForRelation || (isFamily ? job.customerName : null);

  if (isFamily && beneficiary) {
    return {
      isFamily: true,
      beneficiaryName: beneficiary,
      badge: `SOS for ${beneficiary}`,
      fullLabel: `SOS for ${beneficiary} · ${job.location}`,
    };
  }

  return {
    isFamily: false,
    beneficiaryName: 'Client Home',
    badge: 'Client Home',
    fullLabel: `Client Home · ${job.location}`,
  };
}

export interface DiagnosticAnswer {
  question: string;
  answer: string;
}

/**
 * Formats questionnaire and symptom selections into structured pairs.
 * e.g. "Water leaking" -> { question: "Water leaking", answer: "Yes" }
 * or "Strange noise: Yes" -> { question: "Strange noise", answer: "Yes" }
 */
export function formatDiagnosticAnswers(symptoms?: string[]): DiagnosticAnswer[] {
  if (!symptoms || symptoms.length === 0) return [];

  return symptoms.map((item) => {
    if (item.includes(':')) {
      const parts = item.split(':');
      return {
        question: parts[0].trim(),
        answer: parts.slice(1).join(':').trim() || 'Yes',
      };
    }
    return {
      question: item.trim(),
      answer: 'Yes',
    };
  });
}
