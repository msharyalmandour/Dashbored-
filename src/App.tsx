import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import MinutesNew from "./pages/MinutesNew";
import MinutesLive from "./pages/MinutesLive";
import MinutesDoc from "./pages/MinutesDoc";
import TopProgress from "./components/ui/TopProgress";
import { useAuth } from "./context/AuthContext";
import { isFemaleUser } from "./lib/gender";
import Overview from "./pages/Overview";
import Proposal from "./pages/Proposal";
import FullDocumentExport from "./pages/FullDocumentExport";
import LiteratureReview from "./pages/LiteratureReview";
import Methodology from "./pages/Methodology";
import EthicalApprovalPage from "./pages/EthicalApproval";
import ResearchSearch from "./pages/ResearchSearch";
import StatsStudio from "./pages/StatsStudio";
import SupervisorFeedback from "./pages/SupervisorFeedback";
import StudyKit from "./pages/StudyKit";
import ToolsLibrary from "./pages/ToolsLibrary";
import Planner from "./pages/Planner";
import Viva from "./pages/Viva";
import Glossary from "./pages/Glossary";
import Tasks from "./pages/Tasks";
import EvidenceLibrary from "./pages/EvidenceLibrary";
import Team from "./pages/Team";
import TeamChat from "./pages/TeamChat";
import Timeline from "./pages/Timeline";
import Fieldwork from "./pages/Fieldwork";
import Collect from "./pages/Collect";
import Files from "./pages/Files";
import MeetingMinutes from "./pages/MeetingMinutes";
import CalendarPage from "./pages/CalendarPage";
import Guide from "./pages/Guide";
import Learn from "./pages/Learn";
import Drop from "./pages/Drop";
import Start from "./pages/Start";
import DropShare from "./pages/DropShare";
import Story from "./pages/Story";
import Celebration from "./pages/Celebration";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import Pricing from "./pages/Pricing";
import ResetPassword from "./pages/ResetPassword";
import SupervisorView from "./pages/SupervisorView";
import SupervisorReport from "./pages/SupervisorReport";
import SupervisorDash from "./pages/SupervisorDash";
import Meet from "./pages/Meet";
import SupervisorMeet from "./pages/SupervisorMeet";
import SupervisorEmailAction from "./pages/SupervisorEmailAction";
import Legal from "./pages/Legal";
import Survey from "./pages/Survey";
import SurveyPublic from "./pages/SurveyPublic";
import Surveys from "./pages/Surveys";
import SurveyBuilder from "./pages/SurveyBuilder";

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
    <>
    <TopProgress />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/legal/:doc" element={<Legal />} />
      <Route path="/survey" element={<Survey />} />
      <Route path="/s/:token" element={<SurveyPublic />} />
      <Route path="/celebration" element={<Celebration />} />
      <Route path="/supervisor" element={<SupervisorDash />} />
      <Route path="/supervisor-email/:action/:token" element={<SupervisorEmailAction />} />
      <Route path="/supervisor/:token" element={<SupervisorView />} />
      <Route path="/supervisor/:token/report" element={<SupervisorReport />} />
      <Route path="/supervisor/:token/meet" element={<SupervisorMeet />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/proposal" element={<Proposal />} />
        <Route path="/proposal/export" element={<FullDocumentExport />} />
        <Route path="/literature-review" element={<LiteratureReview />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/ethical-approval" element={<EthicalApprovalPage />} />
        <Route path="/research-search" element={<ResearchSearch />} />
        <Route path="/stats" element={<StatsStudio />} />
        <Route path="/feedback" element={<SupervisorFeedback />} />
        <Route path="/study-kit" element={<StudyKit />} />
        <Route path="/surveys" element={<Surveys />} />
        <Route path="/surveys/:id" element={<SurveyBuilder />} />
        <Route path="/tools-library" element={<ToolsLibrary />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/viva" element={<Viva />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/evidence" element={<EvidenceLibrary />} />
        <Route path="/team" element={<Team />} />
        <Route path="/chat" element={<TeamChat />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/fieldwork" element={<Fieldwork />} />
        <Route path="/collect" element={<Collect />} />
        <Route path="/files" element={<Files />} />
        <Route path="/meet" element={<Meet />} />
        <Route path="/meeting-minutes" element={<MeetingMinutes />} />
        <Route path="/meeting-minutes/new" element={<MinutesNew />} />
        <Route path="/meeting-minutes/live" element={<MinutesLive />} />
        <Route path="/meeting-minutes/:id" element={<MinutesDoc />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/story" element={<Story />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/drop" element={<Drop />} />
        <Route path="/start" element={<Start />} />
        <Route path="/drop/share" element={<DropShare />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  );
}
