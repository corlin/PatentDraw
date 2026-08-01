import { createHash } from 'node:crypto';

import type { OfficialRuleSource, RuleProfileReference } from '@patentdraw/contracts';

export interface ReviewedRuleDefinition {
  id: string;
  title: string;
  kind: 'svg-safety' | 'sheet' | 'margin' | 'monochrome' | 'drawing-text';
  reviewMode: 'deterministic' | 'manual';
  officialSource: OfficialRuleSource;
  predicateOrReviewPolicy: string;
  remediation: string;
}

export interface ReviewedRuleProfile {
  ref: RuleProfileReference;
  jurisdiction: 'CNIPA';
  effectiveFrom: string;
  reviewedAt: string;
  limitations: readonly string[];
  rules: readonly ReviewedRuleDefinition[];
}

const cnipaGuidelines: OfficialRuleSource = {
  title: 'CNIPA Patent Examination Guidelines, Part I, Chapter 2, section 7.3',
  url: 'https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=5753f257e6a04b6f8e305eb6d34ba452.pdf&showname=%E4%B8%93%E5%88%A9%E5%AE%A1%E6%9F%A5%E6%8C%87%E5%8D%97.pdf',
  section: 'Part I, Chapter 2, section 7.3',
  snapshotHash: hash('CNIPA-guidelines-order-78-part-I-chapter-2-7.3'),
  effectiveFrom: '2024-01-20',
};

const pctRule11: OfficialRuleSource = {
  title: 'PCT Regulations, Rule 11 — Physical Requirements of the International Application',
  url: 'https://www.wipo.int/en/web/pct-system/texts/rules/r11',
  section: 'Rule 11.6 and Rule 11.13',
  snapshotHash: hash('PCT-Rule-11-baseline-reviewed-2026-08-01'),
  effectiveFrom: '2026-01-01',
};

const rules: readonly ReviewedRuleDefinition[] = [
  {
    id: 'SVG-SAFE-001',
    title: 'Secure-static canonical SVG',
    kind: 'svg-safety',
    reviewMode: 'deterministic',
    officialSource: pctRule11,
    predicateOrReviewPolicy:
      'The evaluated bytes must be the canonical output of the reviewed secure-static sanitizer.',
    remediation: 'Import the source again and resolve every rejected sanitization issue.',
  },
  {
    id: 'CNIPA-FIG-001',
    title: 'Explicit sheet and view box',
    kind: 'sheet',
    reviewMode: 'deterministic',
    officialSource: cnipaGuidelines,
    predicateOrReviewPolicy:
      'The revision must retain positive millimetre sheet dimensions and a positive four-number viewBox.',
    remediation: 'Set the physical sheet in millimetres and a matching positive viewBox.',
  },
  {
    id: 'PCT-FIG-011',
    title: 'Drawing content inside pilot margin',
    kind: 'margin',
    reviewMode: 'deterministic',
    officialSource: pctRule11,
    predicateOrReviewPolicy:
      'Simple positioned geometry must remain at least 10 viewBox units from each sheet edge in the pilot fixture.',
    remediation: 'Move the identified geometry inside the reviewed drawing margin.',
  },
  {
    id: 'CNIPA-FIG-004',
    title: 'Monochrome and transparency review',
    kind: 'monochrome',
    reviewMode: 'deterministic',
    officialSource: cnipaGuidelines,
    predicateOrReviewPolicy:
      'Non-black colour or partial opacity is disclosed as a warning; it is not silently normalized.',
    remediation: 'Confirm colour is necessary or replace it with reproducible black line work.',
  },
  {
    id: 'CNIPA-FIG-006',
    title: 'Indispensability of drawing text',
    kind: 'drawing-text',
    reviewMode: 'manual',
    officialSource: cnipaGuidelines,
    predicateOrReviewPolicy:
      'A named reviewer must determine whether live drawing text is indispensable and corresponds to the disclosure.',
    remediation: 'Record a reasoned technical disposition for every live-text region.',
  },
];

const profileMetadata = JSON.stringify({
  id: 'CNIPA-2026.1',
  version: '1',
  effectiveFrom: '2026-01-01',
  rules: rules.map((rule) => ({ id: rule.id, source: rule.officialSource.snapshotHash })),
});

export const CNIPA_2026_PROFILE: ReviewedRuleProfile = {
  ref: {
    id: 'CNIPA-2026.1',
    version: '1',
    profileHash: hash(profileMetadata),
  },
  jurisdiction: 'CNIPA',
  effectiveFrom: '2026-01-01',
  reviewedAt: '2026-08-01',
  limitations: [
    'Deterministic findings cover SVG safety and selected formal properties only.',
    'Technical correctness, disclosure correspondence and filing acceptability require human review.',
    'SVG is not a CNIPA XML package and is not labelled submission-ready.',
  ],
  rules,
};

export function resolveRuleProfile(reference: RuleProfileReference): ReviewedRuleProfile | null {
  return reference.id === CNIPA_2026_PROFILE.ref.id &&
    reference.version === CNIPA_2026_PROFILE.ref.version &&
    reference.profileHash === CNIPA_2026_PROFILE.ref.profileHash
    ? CNIPA_2026_PROFILE
    : null;
}

function hash(value: string): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
