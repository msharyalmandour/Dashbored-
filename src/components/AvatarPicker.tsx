import { useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import Dialog from "./ui/Dialog";
import { CharacterSvg } from "./ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { AVATAR_BGS, AVATAR_PIECES, AVATAR_SKINS, parseCharacter, serializeCharacter, type AvatarCharacter, type AvatarPiece } from "../lib/avatarCharacter";
import { tr } from "../lib/i18n";

const PIECE_LABEL = (p: AvatarPiece) =>
  ({ hair: tr("شعر قصير"), glasses: tr("نظارة"), cap: tr("كاب"), shemagh: tr("شماغ"), curly: tr("كيرلي وسماعات") })[p];

/** «شخصيتك»: كل عضو يختار شكله، ويشوفه الفريق بالمحادثة والمهام والرئيسية */
export default function AvatarPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser, setMyAvatar } = useAuth();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<AvatarCharacter | null>(null);
  const [busy, setBusy] = useState(false);
  if (!currentUser) return null;
  const c = draft ?? parseCharacter(currentUser.avatar, currentUser.name);
  const set = (patch: Partial<AvatarCharacter>) => setDraft({ ...c, ...patch });

  const save = async () => {
    setBusy(true);
    const { error } = await setMyAvatar(serializeCharacter(c));
    setBusy(false);
    if (error) {
      showToast({ title: tr("ما انحفظت شخصيتك — حاولوا مرة ثانية."), icon: CircleAlert });
      return;
    }
    setDraft(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={tr("شخصيتك")}>
      <div className="flex flex-col items-center gap-4">
        <CharacterSvg character={c} size={96} />
        <fieldset className="w-full">
          <legend className="mb-2 text-[13px] font-bold text-[#ABA095]">{tr("القطعة")}</legend>
          <div className="grid grid-cols-5 gap-2">
            {AVATAR_PIECES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={c.piece === p}
                aria-label={PIECE_LABEL(p)}
                title={PIECE_LABEL(p)}
                onClick={() => set({ piece: p })}
                className={`grid min-h-[56px] place-items-center rounded-2xl ${c.piece === p ? "shadow-[inset_0_0_0_2px_#FFC777]" : "shadow-[inset_0_0_0_1px_rgba(255,240,225,.12)]"}`}
              >
                <CharacterSvg character={{ ...c, piece: p }} size={44} />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="w-full">
          <legend className="mb-2 text-[13px] font-bold text-[#ABA095]">{tr("الخلفية")}</legend>
          <div className="flex gap-2">
            {AVATAR_BGS.map((bg, i) => (
              <button key={bg} type="button" aria-pressed={c.bg === i} aria-label={tr("خلفية {0}", i + 1)} onClick={() => set({ bg: i })} className="grid h-11 w-11 place-items-center rounded-full" style={{ background: bg, boxShadow: c.bg === i ? "0 0 0 2px #0A0807, 0 0 0 4px #FFC777" : "none" }}>
                {c.bg === i && <Check size={16} className="text-[#1A0B05]" />}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="w-full">
          <legend className="mb-2 text-[13px] font-bold text-[#ABA095]">{tr("لون البشرة")}</legend>
          <div className="flex gap-2">
            {AVATAR_SKINS.map((sk, i) => (
              <button key={sk} type="button" aria-pressed={c.skin === i} aria-label={tr("لون {0}", i + 1)} onClick={() => set({ skin: i })} className="grid h-11 w-11 place-items-center rounded-full" style={{ background: sk, boxShadow: c.skin === i ? "0 0 0 2px #0A0807, 0 0 0 4px #FFC777" : "none" }}>
                {c.skin === i && <Check size={16} className="text-[#1A0B05]" />}
              </button>
            ))}
          </div>
        </fieldset>
        <button type="button" onClick={save} disabled={busy} className="tc-primary w-full">
          {tr("احفظوا شخصيتي")}
        </button>
      </div>
    </Dialog>
  );
}
