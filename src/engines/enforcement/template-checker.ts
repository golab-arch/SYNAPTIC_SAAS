/**
 * TemplateChecker — validates response against configurable template sections.
 * Each section is checked via regex; subsections provide more granular validation.
 */

import type { TemplateSectionDefinition, TemplateCheckResult, TemplateSectionResult } from './types.js';

/**
 * Check a response against a list of template section definitions.
 */
export function checkTemplate(
  response: string,
  sections: TemplateSectionDefinition[],
): TemplateCheckResult {
  const details: TemplateSectionResult[] = [];
  let sectionsFound = 0;
  let sectionsRequired = 0;

  for (const section of sections) {
    if (section.required) sectionsRequired++;

    const result = checkSection(response, section);
    details.push(result);

    if (result.found) sectionsFound++;
  }

  // Score: percentage of required sections found
  const requiredFound = details.filter((d) => d.required && d.found).length;
  const score = sectionsRequired > 0
    ? Math.round((requiredFound / sectionsRequired) * 100)
    : 100;

  return { sectionsFound, sectionsRequired, score, details };
}

/**
 * Check a single section against the response.
 */
export function checkSection(
  response: string,
  section: TemplateSectionDefinition,
): TemplateSectionResult {
  // Reset regex state
  section.pattern.lastIndex = 0;
  const found = section.pattern.test(response);

  let subsectionsFound = 0;
  let subsectionsRequired = 0;

  if (found && section.subsections) {
    for (const sub of section.subsections) {
      if (sub.required) subsectionsRequired++;
      sub.pattern.lastIndex = 0;
      if (sub.pattern.test(response)) {
        subsectionsFound++;
      }
    }
  }

  return {
    sectionId: section.id,
    name: section.name,
    found,
    required: section.required,
    severity: section.severity,
    subsectionsFound,
    subsectionsRequired: section.subsections?.filter((s) => s.required).length ?? 0,
  };
}
