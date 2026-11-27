import { Suspense, useEffect } from "react";
import { lazyPage } from "./lib/lazyPage";
import { Route, Routes, useLocation } from "react-router-dom";
const Layout = lazyPage(() => import("./components/Layout"));
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
// كل الصفحات تتحمّل وقت الحاجة (2026-11-26): صفحة الهبوط كانت تنزّل التطبيق كامل (~650KB) قبل ما تطلع
const BrandBoard = lazyPage(() => import("./pages/BrandBoard"));
const Stickers = lazyPage(() => import("./pages/Stickers"));
const LandingV3 = lazyPage(() => import("./pages/LandingV3"));
const LuxLanding = lazyPage(() => import("./pages/LuxLanding"));
const MinutesNew = lazyPage(() => import("./pages/MinutesNew"));
const MinutesLive = lazyPage(() => import("./pages/MinutesLive"));
const MinutesDoc = lazyPage(() => import("./pages/MinutesDoc"));
import TopProgress from "./components/ui/TopProgress";
import AppSplash from "./components/ui/AppSplash";
import { useAuth } from "./context/AuthContext";
import { isFemaleUser } from "./lib/gender";
const Overview = lazyPage(() => import("./pages/Overview"));
const Proposal = lazyPage(() => import("./pages/Proposal"));
const FullDocumentExport = lazyPage(() => import("./pages/FullDocumentExport"));
const LiteratureReview = lazyPage(() => import("./pages/LiteratureReview"));
const Methodology = lazyPage(() => import("./pages/Methodology"));
const EthicalApprovalPage = lazyPage(() => import("./pages/EthicalApproval"));
const ResearchSearch = lazyPage(() => import("./pages/ResearchSearch"));
const StatsStudio = lazyPage(() => import("./pages/StatsStudio"));
const SupervisorFeedback = lazyPage(() => import("./pages/SupervisorFeedback"));
const StudyKit = lazyPage(() => import("./pages/StudyKit"));
const ToolsLibrary = lazyPage(() => import("./pages/ToolsLibrary"));
const Planner = lazyPage(() => import("./pages/Planner"));
const Viva = lazyPage(() => import("./pages/Viva"));
const Glossary = lazyPage(() => import("./pages/Glossary"));
const Tasks = lazyPage(() => import("./pages/Tasks"));
const EvidenceLibrary = lazyPage(() => import("./pages/EvidenceLibrary"));
const Team = lazyPage(() => import("./pages/Team"));
const TeamChat = lazyPage(() => import("./pages/TeamChat"));
const DocGroup = lazyPage(() => import("./pages/DocGroup"));
const Receipts = lazyPage(() => import("./pages/Receipts"));
const Ambassador = lazyPage(() => import("./pages/Ambassador"));
const AdminGrowth = lazyPage(() => import("./pages/AdminGrowth"));
import { useSearchParams as useSP } from "react-router-dom";

/** /chat = «الفريق بس» · /chat?g=doc = «مع الدكتورة» */
function ChatRoute() {
  const [sp] = useSP();
  return sp.get("g") === "doc" ? <DocGroup /> : <TeamChat />;
}
const Timeline = lazyPage(() => import("./pages/Timeline"));
const Fieldwork = lazyPage(() => import("./pages/Fieldwork"));
const Collect = lazyPage(() => import("./pages/Collect"));
const Files = lazyPage(() => import("./pages/Files"));
const MeetingMinutes = lazyPage(() => import("./pages/MeetingMinutes"));
const CalendarPage = lazyPage(() => import("./pages/CalendarPage"));
const Guide = lazyPage(() => import("./pages/Guide"));
const Learn = lazyPage(() => import("./pages/Learn"));
const Drop = lazyPage(() => import("./pages/Drop"));
const Start = lazyPage(() => import("./pages/Start"));
const Explain = lazyPage(() => import("./pages/Explain"));
const Drive = lazyPage(() => import("./pages/Drive"));
const DriveJoin = lazyPage(() => import("./pages/DriveJoin"));
const DropShare = lazyPage(() => import("./pages/DropShare"));
const Story = lazyPage(() => import("./pages/Story"));
const Celebration = lazyPage(() => import("./pages/Celebration"));
const AdminSubscriptions = lazyPage(() => import("./pages/AdminSubscriptions"));
const Pricing = lazyPage(() => import("./pages/Pricing"));
import ResetPassword from "./pages/ResetPassword";
const SupervisorLink = lazyPage(() => import("./pages/SupervisorLink"));
const SupervisorReport = lazyPage(() => import("./pages/SupervisorReport"));
const SupervisorDash = lazyPage(() => import("./pages/SupervisorDash"));
const Meet = lazyPage(() => import("./pages/Meet"));
const SupervisorMeet = lazyPage(() => import("./pages/SupervisorMeet"));
const SupervisorEmailAction = lazyPage(() => import("./pages/SupervisorEmailAction"));
const Legal = lazyPage(() => import("./pages/Legal"));
const Survey = lazyPage(() => import("./pages/Survey"));
const SurveyPublic = lazyPage(() => import("./pages/SurveyPublic"));
const Surveys = lazyPage(() => import("./pages/Surveys"));
const SurveyBuilder = lazyPage(() => import("./pages/SurveyBuilder"));

export default function App() {
  const { currentUser, passwordRecovery, loading } = useAuth();
  const { pathname } = useLocation();

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

  // الزائر الجديد على «/» ياخذ صفحة الهبوط بس — بدون ما ينزّل التطبيق كامل (Layout وكل اللي فيه)
  if (pathname === "/" && (loading || !currentUser)) {
    return <Suspense fallback={<AppSplash />}>{loading ? <AppSplash /> : <LuxLanding />}</Suspense>;
  }

  return (
    <>
    <TopProgress />
    <Suspense fallback={<AppSplash />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/brand" element={<BrandBoard />} />
      <Route path="/legal/:doc" element={<Legal />} />
      {/* نفس صفحة الهبوط اللي على «/» — رابط قديم نخليه شغّال */}
      <Route path="/welcome" element={<Suspense fallback={<AppSplash />}><LuxLanding /></Suspense>} />
      <Route path="/welcome-v3" element={<Suspense fallback={<AppSplash />}><LandingV3 /></Suspense>} />
      <Route path="/survey" element={<Survey />} />
      <Route path="/s/:token" element={<SurveyPublic />} />
      <Route path="/celebration" element={<Celebration />} />
      <Route path="/supervisor" element={<SupervisorDash />} />
      <Route path="/supervisor-email/:action/:token" element={<SupervisorEmailAction />} />
      <Route path="/supervisor/:token" element={<SupervisorLink />} />
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
        <Route path="/chat" element={<ChatRoute />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/ambassador" element={<Ambassador />} />
        <Route path="/admin/growth" element={<AdminGrowth />} />
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
        <Route path="/explain" element={<Explain />} />
        <Route path="/drive" element={<Drive />} />
        <Route path="/stickers" element={<Stickers />} />
        <Route path="/drive/join" element={<DriveJoin />} />
        <Route path="/drop/share" element={<DropShare />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
    </>
  );
}
