/**
 * Quick script to show what's actually in Firestore
 */

import { getDocuments } from '../lib/firebase/restClient';

async function showData() {
  console.log('Fetching analyst report from Firestore...\n');

  const reports = await getDocuments('analyst_reports', [
    { field: 'season', operator: '==', value: 2025 }
  ]);

  if (reports.length === 0) {
    console.log('No reports found');
    return;
  }

  const report = reports[0];
  console.log('Report ID:', report.reportId);
  console.log('Season:', report.season);
  console.log('Week:', report.week);
  console.log('Generated:', report.generatedAt);
  console.log('\nExecutive Summary:');
  console.log(report.executiveSummary);
  console.log('\nData Snapshot:');
  console.log(JSON.stringify(report.dataSnapshot, null, 2));
  console.log('\nSections:', report.sections?.length || 0);

  if (report.sections && report.sections.length > 0) {
    report.sections.forEach((section: any, idx: number) => {
      console.log(`\n--- Section ${idx + 1}: ${section.title} ---`);
      console.log('Content length:', section.content?.length || 0);
      console.log('First 200 chars:', section.content?.substring(0, 200) || 'NO CONTENT');
      if (section.keyMetrics) {
        console.log('Key Metrics:', Object.keys(section.keyMetrics));
      }
      if (section.insights) {
        console.log('Insights:', section.insights.length);
      }
      if (section.recommendations) {
        console.log('Recommendations:', section.recommendations.length);
      }
    });
  } else {
    console.log('\n⚠️  NO SECTIONS FOUND');
  }
}

showData();
