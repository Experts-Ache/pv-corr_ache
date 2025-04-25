import React, { useState } from "react";
import { Language, LANGUAGES, useTranslation, setTranslations } from "../../../../types/language";
import { fetchTranslations } from "../../../../services/translations";
import { updateUserSettings } from "../../../../services/userSettings";
import { showToast } from "../../../../lib/toast";
import LogoUpload from "./LogoUpload";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";

interface GeneralSettingsProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  decimalSeparator: "," | ".";
  onDecimalSeparatorChange: (separator: "," | ".") => void;
  showHiddenIds: boolean;
  onShowHiddenIdsChange: (show: boolean) => void;
  currentTheme: any;
  onThemeChange: (theme: string) => void;
  logoUrl?: string | null;
  onLogoChange: (logoUrl: string | null) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  currentLanguage,
  onLanguageChange,
  decimalSeparator,
  onDecimalSeparatorChange,
  showHiddenIds,
  onShowHiddenIdsChange,
  currentTheme,
  onThemeChange,
  logoUrl,
  onLogoChange,
}) => {
  const t = useTranslation(currentLanguage);
  const [updating, setUpdating] = useState(false);

  const handleLanguageChange = async (language: Language) => {
    if (updating) return;
    setUpdating(true);

    try {
      // First load the translations for the new language
      const translations = await fetchTranslations(language);
      setTranslations(translations);

      // Then update the user settings
      await updateUserSettings({ language });

      showToast(`Language changed to ${LANGUAGES.find((l) => l.id === language)?.name}`, "success");

      // Update the UI
      onLanguageChange(language);
    } catch (err) {
      console.error("Error changing language:", err);
      showToast(`Failed to change language: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleSettingChange = async (key: string, value: any, isLanguage = false) => {
    if (updating) return;
    setUpdating(true);

    try {
      // Special handling for language changes
      if (key === "language" && isLanguage) {
        await handleLanguageChange(value as Language);
        return;
      }

      // Update settings through service
      const success = await updateUserSettings({
        [key === "language"
          ? "language"
          : key === "decimal_separator"
            ? "decimalSeparator"
            : key === "show_hidden_ids"
              ? "showHiddenIds"
              : key]: value,
      });

      if (!success) {
        throw new Error("Failed to update settings");
      }

      // Local state will be updated via userSettingsLoaded event
    } catch (err) {
      console.error("Error updating user setting:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeTheme = (value: string) => {
    onThemeChange(value);
    handleSettingChange("theme_id", value);
  };

  return (
    <div className="text-card-foreground space-y-4">
      <div className="flex items-center justify-between p-3 rounded">
        <div>
          <span className="text-3xl font-semibold leading-none">{t("settings.language")}</span>
          <div className="text-muted-foreground">{t("settings.language.description")}</div>
        </div>
        <Select onValueChange={(value) => handleSettingChange("language", value as Language, true)} disabled={updating}>
          <SelectTrigger className="w-48">{currentLanguage}</SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 rounded">
        <div>
          <span className="text-3xl font-semibold leading-none">{t("settings.decimal_separator")}</span>
          <div className="text-muted-foreground">{t("settings.decimal_separator.description")}</div>
        </div>
        <Select onValueChange={(value) => handleSettingChange("language", value as Language, true)} disabled={updating}>
          <SelectTrigger className="w-96">
            {t("settings.decimal_separator")}: {decimalSeparator}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value=",">{t("settings.decimal_separator.comma")}</SelectItem>
              <SelectItem value=".">{t("settings.decimal_separator.point")}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 rounded">
        <div>
          <span className="text-3xl font-semibold leading-none">{t("settings.hidden_ids")}</span>
          <div className="text-muted-foreground">{t("settings.hidden_ids.description")}</div>
        </div>
        <Button
          onClick={() => handleSettingChange("show_hidden_ids", !showHiddenIds)}
          disabled={updating}
          className="px-3 py-1 rounded text-sm text-primary-foreground hover:cursor-pointer data-[hidden='true']:text-accent-foreground data-[hidden='true']:bg-secondary data-[updating='true']:opacity-50 data-[updating='true']:hover:cursor-not-allowed"
          data-hidden={showHiddenIds}
          data-updating={updating}
        >
          {showHiddenIds ? t("settings.enabled") : t("settings.not_enabled")}
        </Button>
      </div>
      <div className="p-3 flex items-center justify-between rounded">
        <div>
          <span className="text-3xl font-semibold leading-none">{t("settings.theme")}</span>
          <span className="block text-muted-foreground">{t("settings.select_thme")}</span>
        </div>
        <Select onValueChange={(value) => handleChangeTheme(value)} disabled={updating}>
          <SelectTrigger className="w-48">{currentTheme}</SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="zinc">Zinc</SelectItem>
              <SelectItem value="zinc.dark">Zinc Dark</SelectItem>
              <SelectItem value="green">Green Light</SelectItem>
              <SelectItem value="green.dark">Green Dark</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 flex flex-col gap-4 rounded">
        <div>
          <span className="text-3xl font-semibold leading-none">{t("settings.company_logo") || "Company Logo"}</span>
          <span className="block text-muted-foreground">{t("settings.company_logo.description") || "Upload your company logo"}</span>
        </div>
        <LogoUpload currentLogo={logoUrl} onLogoChange={onLogoChange} />
      </div>
    </div>
  );
};

export default GeneralSettings;
