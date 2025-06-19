export function exportCompetitorAnalysisToJson(
  competitorAnalysisData: any,
  effectiveDomain: string
) {
  if (!competitorAnalysisData) return;

  const jsonString = JSON.stringify(competitorAnalysisData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${effectiveDomain}_competitor_analysis.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
