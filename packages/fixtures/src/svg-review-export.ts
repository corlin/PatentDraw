export const fixtureFigureId = 'figure-fixture-pump-01';

export const workflowActorIds = {
  drafter: 'drafter-fixture-01',
  technicalReviewer: 'technical-reviewer-fixture-01',
  attorneyAgent: 'attorney-fixture-01',
} as const;

export const pumpV1Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><g id="pump-section" fill="none" stroke="#000"><rect x="5" y="28" width="48" height="202"/><circle cx="105" cy="126" r="42" fill="#d69e2e"/><text x="70" y="70" fill="#000">100</text></g></svg>`;

export const pumpV2Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><g id="pump-section" fill="none" stroke="#000"><rect x="15" y="28" width="38" height="202"/><circle cx="105" cy="126" r="42" fill="#777"/><text x="70" y="70" fill="#000">100</text></g></svg>`;

export const pumpReviewCorrectedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><g id="pump-section" fill="none" stroke="#000"><rect x="15" y="28" width="38" height="202"/><circle cx="105" cy="126" r="42" fill="#777"/><polyline id="sign-110-leader" points="126,108 136,98 147,98"/><text x="70" y="70" fill="#000">100</text><text x="149" y="100" fill="#000">110</text></g></svg>`;

export const unsafePumpSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297" onload="alert(1)"><script>alert(1)</script></svg>`;
