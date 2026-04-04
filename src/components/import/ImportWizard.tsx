import { useState, useCallback } from "react";
import { parseLcrJson } from "@/data/import-parsers/lcr-json-parser";
import { parseCsvCallings } from "@/data/import-parsers/csv-parser";
import { importCallings, importMembers } from "@/data/import-service";
import type { ParsedCalling, ParsedMember } from "@/types/models";

type Tab = "lcr-json" | "csv";
type Step = "input" | "preview" | "result";

interface ImportResult {
  imported: number;
  errors: string[];
}

export function ImportWizard({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("lcr-json");
  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  const [parsedCallings, setParsedCallings] = useState<ParsedCalling[]>([]);
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleParse = useCallback(() => {
    if (!inputText.trim()) return;

    if (activeTab === "lcr-json") {
      const { callings, errors } = parseLcrJson(inputText);
      setParsedCallings(callings);
      setParsedMembers([]);
      setParseErrors(errors);
    } else {
      const { callings, members, errors } = parseCsvCallings(inputText);
      setParsedCallings(callings);
      setParsedMembers(members);
      setParseErrors(errors);
    }
    setStep("preview");
  }, [inputText, activeTab]);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    try {
      const callingResult = await importCallings(parsedCallings);
      let memberResult: ImportResult = { imported: 0, errors: [] };
      if (parsedMembers.length > 0) {
        memberResult = await importMembers(parsedMembers);
      }
      setResult({
        imported: callingResult.imported + memberResult.imported,
        errors: [...callingResult.errors, ...memberResult.errors],
      });
      setStep("result");
    } catch (e) {
      setResult({
        imported: 0,
        errors: [e instanceof Error ? e.message : "Import failed"],
      });
      setStep("result");
    } finally {
      setIsImporting(false);
    }
  }, [parsedCallings, parsedMembers]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputText(event.target?.result as string);
      };
      reader.readAsText(file);
    },
    []
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Import Data</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        {step === "input" && (
          <div className="flex border-b px-6">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "lcr-json"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("lcr-json")}
            >
              LCR JSON Paste
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "csv"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("csv")}
            >
              CSV Upload
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === "input" && (
            <div className="space-y-4">
              {activeTab === "lcr-json" && (
                <>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">
                      How to get your callings data from LCR:
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Log in to LCR in your browser</li>
                      <li>
                        Open a new tab and go to the callings API endpoint
                      </li>
                      <li>Select all the JSON text (Ctrl+A) and copy it (Ctrl+C)</li>
                      <li>Paste it in the box below</li>
                    </ol>
                  </div>
                  <textarea
                    className="w-full h-64 border rounded-md p-3 font-mono text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder='Paste LCR JSON here... (starts with [ or {)'
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </>
              )}

              {activeTab === "csv" && (
                <>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">
                      Upload a CSV file or paste CSV data:
                    </p>
                    <p>
                      Expected columns: Organization, Position, First Name,
                      Last Name, Active Date
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <textarea
                    className="w-full h-48 border rounded-md p-3 font-mono text-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Or paste CSV data here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </>
              )}
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {parseErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Warnings:
                  </p>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive/80">
                      {err}
                    </p>
                  ))}
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Found <strong className="text-foreground">{parsedCallings.length}</strong> callings
                {parsedMembers.length > 0 && (
                  <>
                    {" "}and <strong className="text-foreground">{parsedMembers.length}</strong> members
                  </>
                )}
              </div>

              {parsedCallings.length > 0 && (
                <div className="border rounded-md overflow-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Organization</th>
                        <th className="text-left px-3 py-2 font-medium">Position</th>
                        <th className="text-left px-3 py-2 font-medium">Member</th>
                        <th className="text-left px-3 py-2 font-medium">Active Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCallings.map((c, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5">
                            {c.organizationName}
                            {c.subOrganizationName && (
                              <span className="text-muted-foreground">
                                {" "}/ {c.subOrganizationName}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5">{c.positionName}</td>
                          <td className="px-3 py-1.5">
                            {c.memberFullName || (
                              <span className="text-vacant italic">Vacant</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {c.activeDate || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              <div
                className={`rounded-md p-4 ${
                  result.errors.length > 0
                    ? "bg-warning/10 border border-warning/30"
                    : "bg-success/10 border border-success/30"
                }`}
              >
                <p className="font-medium">
                  Successfully imported {result.imported} records.
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Errors ({result.errors.length}):
                  </p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          {step === "input" && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={!inputText.trim()}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Preview
              </button>
            </>
          )}
          {step === "preview" && (
            <>
              <button
                onClick={() => setStep("input")}
                className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={parsedCallings.length === 0 || isImporting}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? "Importing..." : `Import ${parsedCallings.length} Records`}
              </button>
            </>
          )}
          {step === "result" && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
