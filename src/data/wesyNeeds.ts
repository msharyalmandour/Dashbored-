import type { LessonId } from "./academy";
import { tr } from "../lib/i18n";

/* «ويسي يحتاجكم» — نفس دروس الأكاديمية، بس بصوت ويسي: هو اللي يطلب مساعدة، مو درس.
   كل درس يخلص يضيف قطعة لمكتبه (بعض الدروس بس لها قطعة). الطالب يتعلم الموقع وهو يساعده. */

export type OfficeItemId = "photo" | "bell" | "cup" | "key" | "books" | "stamp" | "papers" | "cap";

export interface WesyNeed {
  /** طلب ويسي — سطر واحد بصوته */
  ask: string;
  /** شكره أول ما يخلصونها */
  thanks: string;
  /** القطعة اللي تنضاف لمكتبه */
  item?: OfficeItemId;
}

export const wesyNeeds: Record<LessonId, WesyNeed> = {
  avatar: { ask: tr("ما أعرف شكلكم 😅 اختاروا شخصيتكم"), thanks: tr("حطيت صورتكم على مكتبي 🖼️"), item: "photo" },
  push: { ask: tr("أبي أنبّهكم لو صار شي مهم"), thanks: tr("ركّبت جرس على مكتبي 🔔"), item: "bell" },
  chatMsg: { ask: tr("القروب هادي… سلّموا على الفريق"), thanks: tr("وصلت رسالتكم 👋") },
  teamJoined: { ask: tr("عندي فنجان زيادة ☕ ادعوا زميلكم"), thanks: tr("صبّيت فنجان ثاني ☕ حيّاه"), item: "cup" },
  topic: { ask: tr("وش موضوعكم؟ أعطيكم مفتاح البحث"), thanks: tr("هذا مفتاح بحثكم 🔑"), item: "key" },
  agent: { ask: tr("جربوا اسألوني أي شي عن بحثكم"), thanks: tr("أي وقت، أنا هنا 😄") },
  paper: { ask: tr("رفّي فاضي… حطوا أول دراسة"), thanks: tr("أول كتاب على المكتب 📚"), item: "books" },
  litRow: { ask: tr("عبّوا سطر واحد في جدول الأدبيات"), thanks: tr("الجدول بدأ يتعبّى 👌") },
  taskDone: { ask: tr("خلّصوا مهمة وأختمها لكم"), thanks: tr("ختمتها ✅ أول إنجاز"), item: "stamp" },
  chatTask: { ask: tr("حوّلوا رسالة بالمحادثة لمهمة"), thanks: tr("ولا كلمة تضيع بعد اليوم 👌") },
  section: { ask: tr("اكتبوا ولو سطر في المقترح"), thanks: tr("أوراقكم صارت على مكتبي ✍️"), item: "papers" },
  poll: { ask: tr("سوّوا تصويت سريع بالفريق"), thanks: tr("الفريق قرّر بثواني 🗳️") },
  supInvited: { ask: tr("عرّفوني على دكتورتكم"), thanks: tr("الدكتورة معنا 🎓"), item: "cap" },
  askOrBook: { ask: tr("اطلبوا قرار أو موعد من الدكتورة"), thanks: tr("طلبكم وصلها 📩") },
  minutes: { ask: tr("اكتبوا محضر أول اجتماع"), thanks: tr("المحضر محفوظ 📝") },
  report: { ask: tr("شوفوا بحثكم بعين الدكتورة"), thanks: tr("الحين تعرفون وش يهمها 👀") },
};

export const officeItemIds: OfficeItemId[] = ["photo", "bell", "cup", "key", "books", "stamp", "papers", "cap"];

export const itemLesson = (item: OfficeItemId) =>
  (Object.keys(wesyNeeds) as LessonId[]).find((k) => wesyNeeds[k].item === item)!;
