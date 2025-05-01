import React from "react";
import { Theme } from "../../types/theme";
import { Database, Settings, LogOut, LayoutDashboard, Tag, Users, ArrowLeftRight } from "lucide-react";
import DatabaseManagement from "./DatabaseManagement";
import UserManagement from "./UserManagement";
import AdminSettings from "./AdminSettings";
import { Language } from "../../types/language";
import { supabase } from "../../lib/supabase";
import { getCurrentVersion } from "../../services/versions";
import { Button } from "../ui/button";
import { ButtonSection } from "../ui/ButtonSection";

interface AdminDashboardProps {
  currentTheme: Theme;
  currentLanguage: Language;
  onSwitchToUserView?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentTheme, currentLanguage, onSwitchToUserView }) => {
  const [activeView, setActiveView] = React.useState<"database" | "settings">("database");
  const [showUserManagement, setShowUserManagement] = React.useState(false);
  const [currentVersion, setCurrentVersion] = React.useState<string>("1.0.0");
  const [versionType, setVersionType] = React.useState<string>("stable");
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const loadVersion = async () => {
      const version = await getCurrentVersion();
      if (version) {
        setCurrentVersion(version.version);
        setVersionType(version.type || "stable");
      }
    };

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
      }
    };

    loadVersion();
    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Force page reload to clear any cached state
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b flex items-center px-4 border-input bg-card">
        <div className="flex-1 flex items-center gap-6">
          <ButtonSection view={activeView} match="database" onClick={() => setActiveView("database")}>
            <Database size={18} />
            <span>Database</span>
          </ButtonSection>
          <ButtonSection view={activeView} match="settings" onClick={() => setActiveView("settings")}>
            <Settings size={18} />
            <span>Settings</span>
          </ButtonSection>
        </div>
        <div className="flex items-center gap-4">
          {onSwitchToUserView && (
            <ButtonSection view={activeView} match="user" onClick={onSwitchToUserView}>
              <ArrowLeftRight size={18} />
              <span>Switch to User View</span>
            </ButtonSection>
          )}
          <ButtonSection view={activeView} match="signout" onClick={handleSignOut}>
            <LogOut size={16} />
            <span> Sign Out</span>
          </ButtonSection>
        </div>
      </div>

      {/* Admin Dashboard Title Bar */}
      <div className="h-10 border-b border-input bg-card/50 flex items-center justify-between px-4">
        <div className="text-sm text-muted-foreground">Admin Dashboard</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {user && (
            <div className="flex items-center gap-2">
              <Users size={12} className="text-muted-foreground" />
              <span>{user.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-muted-foreground" />
            <span className="font-medium">
              <a
                href="https://github.com/cavort-konzepte-gmbh/pv-corr/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {currentVersion}
              </a>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                {versionType === "beta" ? "Beta" : "Stable"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {showUserManagement ? (
        <UserManagement currentTheme={currentTheme} onBack={() => setShowUserManagement(false)} />
      ) : activeView === "settings" ? (
        <AdminSettings currentTheme={currentTheme} currentLanguage={currentLanguage} onBack={() => setActiveView("database")} />
      ) : (
        <DatabaseManagement currentTheme={currentTheme} currentLanguage={currentLanguage} onBack={() => setActiveView("dashboard")} />
      )}
    </div>
  );
};

export default AdminDashboard;
