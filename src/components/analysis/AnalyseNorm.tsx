import React from "react";
import { Theme } from "../../types/theme";
import { Language, useTranslation } from "../../types/language";
import { Check } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../lib/toast";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface AnalyseNormProps {
  currentTheme: Theme;
  currentLanguage: Language;
  selectedNormId: string | null;
  onSelectNorm: (id: string) => void;
}

const AnalyseNorm: React.FC<AnalyseNormProps> = ({ currentTheme, currentLanguage, selectedNormId, onSelectNorm }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [norms, setNorms] = useState<any[]>([]);
  const [loadingNorm, setLoadingNorm] = useState(false);
  const t = useTranslation(currentLanguage);

  useEffect(() => {
    const loadNorms = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("norms")
          .select(
            `
            *,
            parameters:norm_parameters (
              parameter_id,
              parameter_code,
              rating_ranges
            )
          `,
          )
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading norms:", error);
          throw error;
        }

        setNorms(data || []);
      } catch (err) {
        console.error("Error loading norms:", err);
        setError("Failed to load norms");
        showToast("Failed to load norms", "error");
      } finally {
        setLoading(false);
      }
    };

    loadNorms();
  }, []);

  const handleSelectNorm = useCallback(
    async (normId: string) => {
      try {
        setLoadingNorm(true);

        // If clicking the already selected norm, deselect it
        if (selectedNormId === normId) {
          onSelectNorm("");
          return;
        }

        // Fetch the complete norm data to ensure we have all parameters
        const { data, error } = await supabase
          .from("norms")
          .select(
            `
          *,
          parameters:norm_parameters (
            parameter_id,
            parameter_code,
            rating_ranges
          )
        `,
          )
          .eq("id", normId)
          .single();

        if (error) {
          console.error("Error fetching norm details:", error);
          throw error;
        }

        // Now that we have the data, update the selection
        onSelectNorm(normId);
      } catch (err) {
        console.error("Error selecting norm:", err);
        showToast(`Error selecting norm: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      } finally {
        setLoadingNorm(false);
      }
    },
    [selectedNormId, onSelectNorm],
  );

  if (loading) {
    return <div className="text-center p-4 text-secondary">{t("analysis.loading")}</div>;
  }

  if (error) {
    return <div className="p-4 rounded text-accent-primary border-accent-primary border-solid bg-surface">{error}</div>;
  }

  return (
    <div>
      <h3 className="text-lg font-medium  mb-4">{t("analysis.select_norm")}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {norms.map((norm) => (
          <Button
            key={norm.id}
            onClick={() => handleSelectNorm(norm.id)}
            disabled={loadingNorm}
            variant="outline"
            className={cn("border-primary hover:bg-primary", {
              "bg-primary hover:bg-primary": selectedNormId === norm.id,
            })}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm ">{norm.name}</div>
              </div>
              {selectedNormId === norm.id && <Check size={12} className="text-accent-primary" />}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default AnalyseNorm;
