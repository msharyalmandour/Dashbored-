/** رقم ويسي على واتساب (WhatsApp Business — رقم مخصص، مو رقم الدعم).
    فاضي = الميزة مخفية لين يجهّز المالك الرقم عند Meta (docs/WHATSAPP-SETUP.md). الرقم عام وما فيه سر. */
export const WESY_WHATSAPP = "";

export const waLinkUrl = (code: string) =>
  `https://wa.me/${WESY_WHATSAPP}?text=${encodeURIComponent(`ربط ${code}`)}`;

/** «9665…1234» ← «•••• 1234» */
export const maskPhone = (phone: string | null | undefined) => (phone ? `•••• ${phone.slice(-4)}` : "");
