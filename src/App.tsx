import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import { isFemaleUser } from "./lib/gender";
import Overview from "./pages/Overview";
import Proposal from "./pages/Proposal";
import LiteratureReview from "./pages/LiteratureReview";
import Methodology from "./pages/Methodology";
import Tasks from "./pages/Tasks";
import EvidenceLibrary from "./pages/EvidenceLibrary";
import Team from "./pages/Team";
import Timeline from "./pages/Timeline";
import Fieldwork from "./pages/Fieldwork";
import Files from "./pages/Files";
import CalendarPage from "./pages/CalendarPage";
import Guide from "./pages/Guide";
import Story from "./pages/Story";
import Celebration from "./pages/Celebration";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  const { currentUser, passwordRecovery } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-gender",
      isFemaleUser(currentUser) ? "female" : "male",
    );
  }, [currentUser]);

  // رابط استعادة كلمة المرور يجي بـ token داخل الـ hash، وده يتعارض مع HashRouter —
  // فبدل ما نعتمد على مسار مخصص، نلتقط حالة "استعادة" من AuthContext ونعرض
  // شاشة تعيين كلمة المرور فوق أي مسار كان المستخدم واقف عليه
  if (passwordRecovery) {
    return <ResetPassword />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/celebration" element={<Celebration />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/proposal" element={<Proposal />} />
        <Route path="/literature-review" element={<LiteratureReview />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/evidence" element={<EvidenceLibrary />} />
        <Route path="/team" element={<Team />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/fieldwork" element={<Fieldwork />} />
        <Route path="/files" element={<Files />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/story" element={<Story />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
      </Route>
    </Routes>
  );
}
