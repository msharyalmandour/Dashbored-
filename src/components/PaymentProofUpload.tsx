import { useEffect, useState } from "react";
import { Check, UploadCloud } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { formatDateLong } from "../lib/date";

export default function PaymentProofUpload() {
  const { team, currentUser } = useAuth();
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!team) return;
    supabase!
      .from("payment_proofs")
      .select("created_at")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setLastSentAt(data[0].created_at);
      });
  }, [team]);

  if (!team || !currentUser) return null;

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    const path = `${team.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase!.storage
      .from("payment-proofs")
      .upload(path, file);

    if (uploadError) {
      setError("تعذّر رفع الملف — حاول مرة ثانية");
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase!.from("payment_proofs").insert({
      team_id: team.id,
      uploaded_by: currentUser.id,
      file_path: path,
    });

    setUploading(false);
    if (insertError) {
      setError("تعذّر تسجيل الإثبات — حاول مرة ثانية");
      return;
    }
    setLastSentAt(new Date().toISOString());
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2.5">
      <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-accent-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-accent-600">
        {uploading ? (
          <UploadCloud size={14} className="animate-pulse" />
        ) : (
          <UploadCloud size={14} />
        )}
        {uploading ? "جاري الرفع..." : "رفع إثبات التحويل"}
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={onInputChange}
          disabled={uploading}
        />
      </label>
      {lastSentAt && (
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-accent-700/80">
          <Check size={12} />
          آخر إثبات أُرسل بتاريخ {formatDateLong(lastSentAt.slice(0, 10))} — بانتظار المراجعة
        </span>
      )}
      {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
    </div>
  );
}
