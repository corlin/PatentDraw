import { readFile } from 'node:fs/promises';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  fixtureExportManifest,
  fixtureExportManifestWithCnipaEvidence,
  invalidReadyClaimManifest,
} from '@patentdraw/fixtures';
import { describe, expect, it } from 'vitest';

describe('SVG export manifest JSON Schema', () => {
  it('accepts absent and matching CNIPA evidence examples with mandatory limitations', async () => {
    const validate = await manifestValidator();
    expect(validate(fixtureExportManifest), validate.errors?.map(String).join('\n')).toBe(true);
    expect(fixtureExportManifest.limitations).toEqual(
      expect.arrayContaining([
        'reviewed-drawing-asset',
        'not-an-office-filing-event',
        'no-office-acceptance-assertion',
        'not-CNIPA-electronic-submission-ready',
      ]),
    );
    expect(
      validate(fixtureExportManifestWithCnipaEvidence),
      validate.errors?.map(String).join('\n'),
    ).toBe(true);
    expect(fixtureExportManifestWithCnipaEvidence.cnipa.label).toBe('CNIPA-XML-evidence-recorded');
  });

  it('rejects filing-readiness claims outside the limited schema vocabulary', async () => {
    const validate = await manifestValidator();
    expect(validate(invalidReadyClaimManifest)).toBe(false);
    expect(JSON.stringify(validate.errors)).toContain('enum');
  });
});

async function manifestValidator() {
  const schema = JSON.parse(
    await readFile(
      new URL(
        '../../specs/003-svg-review-export/contracts/export-manifest.schema.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}
