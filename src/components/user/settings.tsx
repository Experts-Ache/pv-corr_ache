import React, { useState } from "react";
import { Theme, THEMES } from "../../types/theme";
import { Language } from "../../types/language";
import { Company } from "../../types/companies";
import { setTranslations } from "../../types/language";
import { fetchTranslations } from "../../services/translations";
import { Standard } from "../../types/standards";
import GeneralSettings from "./elements/settings/GeneralSettings";
import CompaniesSettings from "./elements/settings/CompaniesSettings";
import PeopleSettings from "./elements/settings/PeopleSettings";
import DatapointsSettings from "./elements/settings/DatapointsSettings";
import { Person } from "../../types/people";
import { supabase } from "../../lib/supabase";

interface SettingsProps {
  view: "general" | "theme" | "people" | "companies" | "datapoints" | "translations";
  onViewChange: (view: "general" | "theme" | "people" | "companies" | "datapoints" | "translations") => void;
  showHiddenIds: boolean;
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  onShowHiddenIdsChange: (show: boolean) => void;
  decimalSeparator: "," | ".";
  onDecimalSeparatorChange: (separator: "," | ".") => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
  standards: Standard[];
  onStandardsChange: (standards: Standard[]) => void;
  savedCompanies: Company[];
  onSaveCompanies: (companies: Company[]) => void;
  savedPeople: Person[];
  onSavePeople: (people: Person[]) => void;
  onCreateCustomer: (...args: any) => void;
}

// Helper function to load translations when language changes
const loadLanguageTranslations = async (language: Language) => {
  try {
    const translations = await fetchTranslations(language);
    setTranslations(translations);
  } catch (err) {
    console.error("Error loading translations:", err);
  }
};

const Settings: React.FC<SettingsProps> = ({
  view,
  onViewChange,
  showHiddenIds,
  currentLanguage,
  onLanguageChange,
  onShowHiddenIdsChange,
  decimalSeparator,
  onDecimalSeparatorChange,
  currentTheme,
  onThemeChange,
  onClose,
  standards,
  onStandardsChange,
  savedCompanies,
  onSaveCompanies,
  savedPeople,
  onSavePeople,
  onCreateCustomer,
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Ensure translations are loaded when the settings component mounts
  React.useEffect(() => {
    loadLanguageTranslations(currentLanguage);
  }, [currentLanguage]);

  // Load user settings including logo URL
  React.useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.logo_url) {
          setLogoUrl(user.user_metadata.logo_url);
        }
      } catch (err) {
        console.error("Error loading user settings:", err);
      }
    };

    loadUserSettings();
  }, []);

  const handleLogoChange = (newLogoUrl: string | null) => {
    setLogoUrl(newLogoUrl);
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      {view === "general" && (
        <GeneralSettings
          currentLanguage={currentLanguage}
          onLanguageChange={onLanguageChange}
          decimalSeparator={decimalSeparator}
          onDecimalSeparatorChange={onDecimalSeparatorChange}
          showHiddenIds={showHiddenIds}
          onShowHiddenIdsChange={onShowHiddenIdsChange}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          logoUrl={logoUrl}
          onLogoChange={handleLogoChange}
        />
      )}

      {view === "companies" && (
        <CompaniesSettings
          currentTheme={currentTheme}
          currentLanguage={currentLanguage}
          savedCompanies={savedCompanies}
          onSaveCompanies={onSaveCompanies}
          onCreateCustomer={(companyId, name) => onCreateCustomer(companyId, name, "company")}
        />
      )}

      {view === "people" && (
        <PeopleSettings
          currentTheme={currentTheme}
          currentLanguage={currentLanguage}
          savedPeople={savedPeople}
          onSavePeople={onSavePeople}
          onCreateCustomer={(personId, name) => onCreateCustomer(personId, name, "person")}
        />
      )}

      {view === "datapoints" && (
        <DatapointsSettings
          currentTheme={currentTheme}
          currentLanguage={currentLanguage}
          standards={standards}
          onStandardsChange={onStandardsChange}
        />
      )}
    </div>
  );
};

export default Settings;
