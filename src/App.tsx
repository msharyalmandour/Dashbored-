import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
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

export default function App() {
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
