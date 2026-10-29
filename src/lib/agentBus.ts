/** يفتح الوكيل الجانبي (من أي صفحة) ومعه نص جاهز بخانة الكتابة — ما يرسل شي لحاله */
export const OPEN_AGENT_EVENT = "wesync:open-agent";

export function openAgent(text?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_AGENT_EVENT, { detail: { text } }));
}

/** الصفحة تقول للوكيل وين المستخدم بالضبط (مثل القسم المفتوح بالمقترح) — يطلع جنب الكرة «الكوتش · …» */
export const AGENT_CONTEXT_EVENT = "wesync:agent-context";

export function setAgentContext(label: string | null) {
  window.dispatchEvent(new CustomEvent(AGENT_CONTEXT_EVENT, { detail: { label } }));
}
