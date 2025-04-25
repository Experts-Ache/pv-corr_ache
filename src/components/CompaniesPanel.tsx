import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Theme } from "../types/theme";
import { Company, COMPANY_FIELDS } from "../types/companies";
import { Building2, Plus, ChevronRight, Trash2, User } from "lucide-react";
import { generateHiddenId } from "../utils/generateHiddenId";
import { Person } from "../types/people";
import { fetchPeople } from "../services/people";
import { Language, useTranslation } from "../types/language";
import { useKeyAction } from "../hooks/useKeyAction";
import { fetchCompanies as fetchCompaniesService } from "../services/companies";
import { toCase } from "../utils/cases";
import { Input } from "./ui/input";
import { Label } from "@radix-ui/react-label";
import { Button } from "./ui/button";

interface CompaniesPanelProps {
  currentTheme: Theme;
  currentLanguage: Language;
  savedPeople: Person[];
  savedCompanies: Company[];
  onSaveCompanies: (companies: Company[]) => void;
  onCreateCustomer?: (companyId: string, name: string) => void;
}

const CompaniesPanel: React.FC<CompaniesPanelProps> = ({
  currentTheme,
  currentLanguage,
  savedPeople,
  savedCompanies,
  onSaveCompanies,
  onCreateCustomer,
}) => {
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCeoId, setSelectedCeoId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [savedCompaniesList, setSavedCompaniesList] = useState<Company[]>(savedCompanies || []);
  const [availablePeople, setAvailablePeople] = useState<Person[]>([]);
  const [sortedCompanies, setSortedCompanies] = useState<Company[]>([]);
  const [sortedPeople, setSortedPeople] = useState<Person[]>([]);
  const translation = useTranslation(currentLanguage);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [_, people] = await Promise.all([fetchCompanies(), fetchPeople()]);
        setAvailablePeople(people);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data");
      }
    };

    loadData();
  }, []);

  // Sort companies and people alphabetically
  useEffect(() => {
    if (savedCompanies && savedCompanies.length > 0) {
      const sorted = [...savedCompanies].sort((a, b) => a.name.localeCompare(b.name));
      setSortedCompanies(sorted);
    } else {
      setSortedCompanies([]);
    }

    if (availablePeople && availablePeople.length > 0) {
      const sorted = [...availablePeople].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      setSortedPeople(sorted);
    } else {
      setSortedPeople([]);
    }
  }, [savedCompanies, availablePeople]);

  const fetchCompanies = async () => {
    try {
      const companies = await fetchCompaniesService();
      onSaveCompanies(companies);
    } catch (err) {
      console.error("Error fetching companies:", err);
      setError("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedCompany = async () => {
    setError(null);

    try {
      const companyData = {
        ...toCase(formValues, "snakeCase"),
        ceo_id: selectedCeoId || null,
        contact_person_id: selectedContactId || null,
      };

      if (editingCompany) {
        const { error } = await supabase.from("companies").update(companyData).eq("id", editingCompany.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert({
          ...companyData,
          hidden_id: generateHiddenId(),
        });

        if (error) throw error;
      }

      await fetchCompanies();
      setShowNewCompanyForm(false);
      setEditingCompany(null);
      setFormValues({});
      setSelectedCeoId("");
      setSelectedContactId("");
    } catch (err) {
      console.error("Error saving company:", err);
      setError(err instanceof Error ? err.message : "Failed to save company");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateSelectedCompany();
  };

  const handleDelete = async (companyId: string) => {
    try {
      const { error } = await supabase.from("companies").delete().eq("id", companyId);

      if (error) throw error;
      await fetchCompanies();
    } catch (err) {
      console.error("Error deleting company:", err);
      setError("Failed to delete company");
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormValues({
      name: company.name,
      website: company.website || "",
      email: company.email || "",
      phone: company.phone || "",
      vatId: company.vatId || "",
      registrationNumber: company.registrationNumber || "",
    });
    setSelectedCeoId(company.ceoId || "");
    setSelectedContactId(company.contactPersonId || "");
    setShowNewCompanyForm(true);
  };

  useKeyAction(() => {
    updateSelectedCompany();
  }, showNewCompanyForm);

  return (
    <div className="p-6">
      {error && <div className="p-4 mb-4 rounded text-accent-primary border-accent-primary border border-solid">{error}</div>}

      {loading ? (
        <div className="text-center p-4 text-primary-foreground">{translation("company.loading")}</div>
      ) : (
        <>
          <Button onClick={() => setShowNewCompanyForm(true)} className="w-full px-4 py-3 duration-200 mb-6">
            <Plus size={16} />
            {translation("company.add")}
          </Button>

          {showNewCompanyForm ? (
            <div>
              <h3 className="text-lg mb-6 flex items-center gap-2 text-primary">
                <Building2 className="text-accent-primary" size={16} />
                {editingCompany ? translation("company.edit") : translation("company.add")}
              </h3>

              <form onSubmit={handleSubmit} className="text-card-foreground space-y-4">
                {COMPANY_FIELDS.map((field) => (
                  <div key={field.id}>
                    <Label className="block text-sm mb-1">
                      {translation(field.label as any)}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      type={field.type}
                      value={formValues[field.id] || ""}
                      onChange={(e) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }))
                      }
                      required={field.required}
                      className="w-full p-2 rounded text-sm "
                    />
                  </div>
                ))}
                <div>
                  <Label className="block text-sm mb-1">CEO</Label>
                  <div className="relative">
                    <select
                      value={selectedCeoId}
                      onChange={(e) => setSelectedCeoId(e.target.value)}
                      className="w-full p-2 rounded text-sm appearance-none text-primary border border-input shadow-sm bg-accent"
                    >
                      <option value="">Select CEO</option>
                      {sortedPeople.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.salutation} {person.title ? `${person.title} ` : ""}
                          {person.firstName} {person.lastName}
                        </option>
                      ))}
                    </select>
                    <ChevronRight
                      size={14}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-primary"
                    />
                  </div>
                </div>
                <div>
                  <Label className="block text-sm mb-1 text-secondary">{translation("company.contact_person")}</Label>
                  <div className="relative">
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full p-2 rounded text-sm appearance-none text-primary border border-input shadow-sm bg-accent"
                    >
                      <option value="">Select Contact Person</option>
                      {sortedPeople.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.salutation} {person.title ? `${person.title} ` : ""}
                          {person.firstName} {person.lastName}
                        </option>
                      ))}
                    </select>
                    <ChevronRight
                      size={14}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowNewCompanyForm(false);
                      setEditingCompany(null);
                      setFormValues({});
                      setSelectedCeoId("");
                      setSelectedContactId("");
                    }}
                    variant="destructive"
                  >
                    {translation("actions.cancel")}
                  </Button>
                  <Button type="submit" className="px-4 py-2 rounded">
                    {editingCompany ? translation("general.save_changes") : translation("general.create_company")}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCompanies.map((company) => (
                <div
                  key={company.id}
                  className="p-4 rounded-lg border transition-all hover:translate-x-1 border-accent text-card-foreground"
                  onClick={() => handleEdit(company)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="text-accent-primary" size={16} />
                      <span className="font-medium">{company.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {onCreateCustomer && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateCustomer(company.id, company.name);
                          }}
                          className="px-2 py-1 text-xs rounded hover:bg-opacity-80 text-white"
                        >
                          {translation("make_customer")}
                        </Button>
                      )}
                      <ChevronRight className="text-foreground" size={16} />
                    </div>
                  </div>
                  <div className="text-sm space-y-2 text-muted-foreground">
                    {company.ceoId && (
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        CEO:{" "}
                        {(() => {
                          const manager = availablePeople.find((p) => p.id === company.ceoId);
                          if (!manager) return "Unknown manager";
                          return `${manager.salutation} ${manager.title ? `${manager.title} ` : ""}${manager.firstName} ${manager.lastName}`;
                        })()}
                      </div>
                    )}
                    {company.contactPersonId && (
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        Contact:{" "}
                        {(() => {
                          const contact = availablePeople.find((p) => p.id === company.contactPersonId);
                          if (!contact) return "Unknown contact";
                          return `${contact.salutation} ${contact.title ? `${contact.title} ` : ""}${contact.firstName} ${contact.lastName}`;
                        })()}
                      </div>
                    )}
                    {company.website && (
                      <div>
                        <a href={company.website} target="_blank" rel="noopener noreferrer">
                          {company.website}
                        </a>
                      </div>
                    )}
                    {company.email && (
                      <div>
                        <a href={`mailto:${company.email}`}>{company.email}</a>
                      </div>
                    )}
                    {company.phone && (
                      <div>
                        <a href={`tel:${company.phone}`}>{company.phone}</a>
                      </div>
                    )}
                    {company.vatId && <div>VAT ID: {company.vatId}</div>}
                    {company.registrationNumber && <div>Reg. No.: {company.registrationNumber}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompaniesPanel;
