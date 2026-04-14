import { NavLink } from "react-router-dom";

const dashboardTabs = [
  { to: "/dashboard-1", label: "Dashboard 1" },
  { to: "/dashboard-2", label: "Dashboard 2" },
  { to: "/dashboard-3", label: "Dashboard 3" },
  { to: "/dashboard-4", label: "Dashboard 4" }
];

export default function DashboardVariantTabs() {
  return (
    <div className="dashboard-variant-tabs" role="navigation" aria-label="Dashboard variants">
      {dashboardTabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `dashboard-variant-tab${isActive ? " active" : ""}`}>
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
