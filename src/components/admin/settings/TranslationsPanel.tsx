import React, { useState, useEffect } from "react";
import { Theme } from "../../../types/theme";
import { Language, LANGUAGES } from "../../../types/language";
import { Plus, Save, X, Edit2, Search, ArrowLeft } from "lucide-react";
import { fetchAllTranslations, fetchLanguages, updateTranslation, deleteTranslation } from "../../../services/translations";
import { FormHandler } from "../../shared/FormHandler";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";

interface TranslationsPanelProps {
  currentTheme: Theme;
  currentLanguage: Language;
  onBack: () => void;
}

const TranslationsPanel: React.FC<TranslationsPanelProps> = ({ currentTheme, currentLanguage, onBack }) => {
  const [translations, setTranslations] = useState<Record<string, Record<Language, string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newValues, setNewValues] = useState<{
    key: string;
    translations: Record<Language, string>;
  }>({
    key: "",
    translations: {},
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const translationsData = await fetchAllTranslations();
      setTranslations(translationsData);
    } catch (err) {
      console.error("Error loading translations:", err);
      setError("Failed to load translations");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    try {
      setError(null);
      const promises = Object.entries(editValues).map(([langId, value]) => updateTranslation(key, langId, value));
      await Promise.all(promises);
      await loadData();
      setEditingKey(null);
      setEditValues({});
    } catch (err) {
      console.error("Error saving translations:", err);
      setError("Failed to save translations");
    }
  };

  const handleAddNew = async () => {
    try {
      setError(null);
      if (!newValues.key.trim()) {
        setError("Translation key is required");
        return;
      }

      const promises = Object.entries(newValues.translations).map(([langId, value]) =>
        updateTranslation(newValues.key.trim(), langId, value),
      );
      await Promise.all(promises);
      await loadData();
      setIsAdding(false);
      setNewValues({
        key: "",
        translations: {},
      });
    } catch (err) {
      console.error("Error adding translation:", err);
      setError("Failed to add translation");
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await deleteTranslation(key);
      await loadData();
    } catch (err) {
      console.error("Error deleting translation:", err);
      setError("Failed to delete translation");
    }
  };

  const filteredTranslations = Object.entries(translations)
    .filter(([key]) => key.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Translations</h2>
      </div>

      <div className="flex items-center justify-between mb-6">
        <Label className="w-full flex items-center gap-x-4 relative">
          <Search className="text-primary absolute left-4" size={20} />
          <Input
            className="h-12 indent-10 bg-card"
            type="text"
            placeholder="Search translations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Label>
      </div>
      <Button onClick={() => setIsAdding(true)} className="px-4 py-2 mb-10">
        <Plus size={16} />
        Add Translation
      </Button>

      {error && <div className="p-4 mb-4 rounded text-destructive-foreground border border-destructive bg-destructive">{error}</div>}

      <section className="border border-input rounded-md bg-card">
        <div className="w-full relative overflow-auto">
          <Table>
            <TableCaption>Translations</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                {LANGUAGES.map((lang) => (
                  <TableHead key={lang.id}>{lang.name}</TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow>
                  <TableCell className="p-2">
                    <FormHandler
                      isEditing={true}
                      onSave={handleAddNew}
                      onCancel={() => {
                        setIsAdding(false);
                        setNewValues({
                          key: "",
                          translations: {},
                        });
                      }}
                    >
                      <Input
                        type="text"
                        value={newValues.key}
                        onChange={(e) =>
                          setNewValues((prev) => ({
                            ...prev,
                            key: e.target.value,
                          }))
                        }
                        className="w-full p-1"
                        placeholder="Enter translation key"
                      />
                    </FormHandler>
                  </TableCell>
                  {LANGUAGES.map((lang) => (
                    <TableCell key={lang.id} className="p-2">
                      <Input
                        type="text"
                        value={newValues.translations[lang.id] || ""}
                        onChange={(e) =>
                          setNewValues((prev) => ({
                            ...prev,
                            translations: {
                              ...prev.translations,
                              [lang.id]: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-1"
                        dir={lang.direction}
                        placeholder={`Enter ${lang.name} translation`}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button onClick={handleAddNew} variant="ghost">
                        <Save size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsAdding(false);
                          setNewValues({
                            key: "",
                            translations: {},
                          });
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filteredTranslations.map(([key, values]) => (
                <TableRow key={key}>
                  <TableCell className="p-2">
                    <code className="font-mono text-sm">{key}</code>
                  </TableCell>
                  {LANGUAGES.map((lang) => (
                    <TableCell key={lang.id} className="p-2 text-muted-foreground">
                      {editingKey === key ? (
                        <Input
                          type="text"
                          value={editValues[lang.id] || values[lang.id] || ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [lang.id]: e.target.value,
                            }))
                          }
                          className="w-full p-1"
                          dir={lang.direction}
                        />
                      ) : (
                        <div dir={lang.direction}>{values[lang.id] || "-"}</div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => {
                          if (editingKey === key) {
                            handleSave(key);
                          } else {
                            setEditingKey(key);
                            setEditValues(values);
                          }
                        }}
                        variant="ghost"
                      >
                        {editingKey === key ? <Save size={14} /> : <Edit2 size={14} />}
                      </Button>
                      {editingKey === key ? (
                        <Button
                          onClick={() => {
                            setEditingKey(null);
                            setEditValues({});
                          }}
                          variant="ghost"
                        >
                          <X size={14} />
                        </Button>
                      ) : (
                        <Button onClick={() => handleDelete(key)} variant="ghost">
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
};

export default TranslationsPanel;
