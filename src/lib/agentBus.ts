/** يفتح الوكيل الجانبي (من أي صفحة) ومعه نص جاهز بخانة الكتابة — ما يرسل شي لحاله */
export const OPEN_AGENT_EVENT = "wesync:open-agent";

export function openAgent(text?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_AGENT_EVENT, { detail: { text } }));
}
