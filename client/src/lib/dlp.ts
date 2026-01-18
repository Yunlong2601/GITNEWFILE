// DLP Patterns for sensitive data detection
export const DLP_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/g,
  PHONE: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
};

export type DlpFinding = {
  type: keyof typeof DLP_PATTERNS;
  count: number;
};

export async function scanFileContent(file: File): Promise<DlpFinding[]> {
  // Only scan text-based files
  if (!file.type.startsWith('text/') && !file.name.endsWith('.txt') && !file.name.endsWith('.md') && !file.name.endsWith('.json')) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const findings: DlpFinding[] = [];

      for (const [type, regex] of Object.entries(DLP_PATTERNS)) {
        const matches = content.match(regex);
        if (matches && matches.length > 0) {
          findings.push({
            type: type as keyof typeof DLP_PATTERNS,
            count: matches.length
          });
        }
      }
      resolve(findings);
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
