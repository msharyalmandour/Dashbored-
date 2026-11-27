import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/** الزميل المدعو على مهمة محددة (رابط الدعوة فيه ?task=) يدخل عليها مباشرة بعد التسجيل، مو على الرئيسية */
export default function PendingTaskRedirect() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!currentUser) return;
    let pending: string | null = null;
    try {
      pending = localStorage.getItem("wesync.pendingTask");
      if (pending) localStorage.removeItem("wesync.pendingTask");
    } catch {
      /* تخزين غير متاح */
    }
    if (pending) navigate(`/tasks?task=${encodeURIComponent(pending)}`, { replace: true });
  }, [currentUser, navigate]);
  return null;
}
