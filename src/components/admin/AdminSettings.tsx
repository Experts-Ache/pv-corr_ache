import React from "react";
import { Theme } from "../../types/theme";
import { Tag, Globe, Settings as SettingsIcon } from "lucide-react";
import TranslationsPanel from "./settings/TranslationsPanel";
import VersionManagement from "./VersionManagement";
import { Button } from "../ui/button";
import { Language } from "../../types/language";

interface AdminSettingsProps {
  currentTheme: Theme;
  currentLanguage: Language;
  onBack: () => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ currentTheme, currentLanguage, onBack }) => {
  const [activeView, setActiveView] = React.useState<"overview" | "versions" | "translations" | "general">("overview");

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-8 text-card-foreground">System Configuration</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button onClick={() => setActiveView("general")} className="p-6 rounded-lg border border-accent text-card-foreground bg-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <SettingsIcon size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-medium">General Settings</h3>
              <p className="text-sm text-muted-foreground">Basic system settings</p>
            </div>
          </div>
        </button>

        <button onClick={() => setActiveView("translations")} className="p-6 rounded-lg border border-accent text-card-foreground bg-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <Globe size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Translations</h3>
              <p className="text-sm text-muted-foreground">Manage system translations</p>
            </div>
          </div>
        </button>

        <button onClick={() => setActiveView("versions")} className="p-6 rounded-lg border border-accent text-card-foreground bg-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              <Tag size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Version Management</h3>
              <p className="text-sm text-muted-foreground">Manage application versions</p>
            </div>
          </div>
        </button>
      </div>

      <div className="rounded-lg text-card-foreground border border-accent bg-card">
        {activeView === "versions" ? (
          <VersionManagement currentTheme={currentTheme} onBack={() => setActiveView("overview")} />
        ) : activeView === "translations" ? (
          <TranslationsPanel currentTheme={currentTheme} currentLanguage={currentLanguage} onBack={() => setActiveView("overview")} />
        ) : activeView === "general" ? (
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">General Settings</h3>
            <p className="text-muted-foreground">Configure basic system settings here.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <SettingsIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">System Configuration</h3>
                <p className="text-muted-foreground">Select a category from the options above to manage system settings.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
