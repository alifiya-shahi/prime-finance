import { Navigate, Route, Routes } from "react-router-dom";
import AppShellLayout from "./components/AppShellLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import DashboardTwoPage from "./pages/DashboardTwoPage";
import DashboardThreePage from "./pages/DashboardThreePage";
import DashboardFourPage from "./pages/DashboardFourPage";
import CardsPage from "./pages/CardsPage";
import TransactionsPage from "./pages/TransactionsPage";
import GoalsPage from "./pages/GoalsPage";
import SavingsPage from "./pages/SavingsPage";
import DepositPage from "./pages/DepositPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import StylePreviewPage from "./pages/StylePreviewPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/style-preview" element={<StylePreviewPage />} />

      <Route element={<AppShellLayout />}>
        <Route path="/dashboard" element={<Navigate to="/dashboard-1" replace />} />
        <Route path="/dashboard-1" element={<DashboardPage />} />
        <Route path="/dashboard-2" element={<DashboardTwoPage />} />
        <Route path="/dashboard-3" element={<DashboardThreePage />} />
        <Route path="/dashboard-4" element={<DashboardFourPage />} />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/savings" element={<SavingsPage />} />
        <Route path="/deposit" element={<DepositPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
