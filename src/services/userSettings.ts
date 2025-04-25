import { supabase } from "../lib/supabase";
import { Language } from "../types/language";
import { ThemeId } from "../types/theme";
export interface UserSettings {
  language: Language;
  decimalSeparator: "," | ".";
  showHiddenIds: boolean;
  theme_id: ThemeId;
  logo_url?: string | null;
}

export const fetchUserSettings = async (): Promise<UserSettings | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const metadata = session.user.user_metadata || {};

    // Return settings from metadata with defaults
    return {
      language: metadata.language || "en",
      decimalSeparator: metadata.decimal_separator || ",",
      showHiddenIds: metadata.show_hidden_ids || false,
      theme_id: metadata.theme_id || "ferra",
      logo_url: metadata.logo_url || null,
    };
  } catch (err) {
    console.error("Error in fetchUserSettings:", err);
    return null;
  }
};

export const updateUserSettings = async (settings: Partial<UserSettings>): Promise<boolean> => {
  try {
    // Update user metadata
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(settings.language && { language: settings.language }),
        ...(settings.decimalSeparator && { decimal_separator: settings.decimalSeparator }),
        ...(settings.showHiddenIds !== undefined && { show_hidden_ids: settings.showHiddenIds }),
        ...(settings.theme_id && { theme_id: settings.theme_id }),
        ...(settings.logo_url !== undefined && { logo_url: settings.logo_url }),
      },
    });

    if (error) {
      console.error("Error updating user settings:", error);
      return false;
    }

    if (!data.user) {
      throw new Error("No user returned after update");
    }

    // Dispatch event with updated settings
    window.dispatchEvent(
      new CustomEvent("userSettingsLoaded", {
        detail: data.user.user_metadata,
      }),
    );

    return true;
  } catch (error) {
    console.error("Error in updateUserSettings:", error);
    return false;
  }
};
