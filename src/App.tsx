import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import ResearchPlan from "./pages/ResearchPlan";
import Tasks from "./pages/Tasks";
import Team from "./pages/Team";
import Timeline from "./pages/Timeline";
import Fieldwork from "./pages/Fieldwork";
import References from "./pages/References";
import Files from "./pages/Files";
import CalendarPage from "./pages/CalendarPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/plan" element={<ResearchPlan />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/team" element={<Team />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/fieldwork" element={<Fieldwork />} />
        <Route path="/references" element={<References />} />
        <Route path="/files" element={<Files />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Route>
    </Routes>
  );
}
