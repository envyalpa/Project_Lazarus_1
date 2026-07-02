import { json } from '@sveltejs/kit';
import { createRun } from '$lib/server/testing-suite.js';
import { parseCSV, mapCSVToCriteria } from '$lib/server/csv-parser.js';
import { parseFile } from '$lib/server/file-parser.js';
import { callLlmServer } from '$lib/server/llm-runner.js';

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const runName = formData.get('run_name');
    const platformName = formData.get('platform_name');
    const clientId = formData.get('client_id') ? Number(formData.get('client_id')) : null;
    const projectId = formData.get('project_id') ? Number(formData.get('project_id')) : null;
    const url = formData.get('url') || '';
    const username = formData.get('username') || '';
    const password = formData.get('password') || '';
    const importMethod = formData.get('import_method'); // 'default' | 'csv' | 'pdf'
    const criteriaFile = formData.get('criteria_file') || formData.get('csv_file');

    if (!runName || !platformName) {
      return json({ error: 'Evaluation Name and Platform Name are required.' }, { status: 400 });
    }

    let customCriteria = null;

    if (importMethod === 'csv' && criteriaFile && criteriaFile instanceof File && criteriaFile.size > 0) {
      const csvText = await criteriaFile.text();
      const parsedRows = parseCSV(csvText);
      customCriteria = mapCSVToCriteria(parsedRows);
      if (customCriteria.length === 0) {
        return json({ error: 'Could not parse any valid test criteria from the CSV file. Verify that it contains at least the columns: Stage, What to Test, and Expected Outcome.' }, { status: 400 });
      }
    } else if (importMethod === 'pdf' && criteriaFile && criteriaFile instanceof File && criteriaFile.size > 0) {
      const arrayBuffer = await criteriaFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const docText = await parseFile(buffer, criteriaFile.name);
      
      if (!docText || !docText.trim()) {
        return json({ error: 'Failed to extract text from the PDF file.' }, { status: 400 });
      }

      const systemPrompt = `You are a professional software QA engineer. Extract all verification test cases/checklist criteria from the following document text.
Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "stage": "Process stage, section, or screen name",
    "pain_point": "Optional pain point details",
    "what_to_test": "Action details on what to test/verify",
    "expected_outcome": "Expected outcome or validation check",
    "test_role": "Optional role required (e.g. admin, user)",
    "severity": "Critical" | "Important" | "Good to Have"
  }
]
Constraints:
- Respond with a valid JSON array ONLY.
- Do not output any markdown formatting, backticks, or explanation.
- Make test cases clear and actionable.`;

      const responseText = await callLlmServer(systemPrompt, docText);
      try {
        const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText.trim();
        const extracted = JSON.parse(jsonStr);

        if (!Array.isArray(extracted) || extracted.length === 0) {
          throw new Error('Invalid JSON structure returned by model.');
        }

        customCriteria = extracted.map((item, index) => {
          let severity = item.severity || 'Important';
          if (/crit/i.test(severity)) severity = 'Critical';
          else if (/good|have/i.test(severity)) severity = 'Good to Have';
          else severity = 'Important';

          return {
            criteria_id: index + 1,
            stage: item.stage || `Stage ${index + 1}`,
            pain_point: item.pain_point || '',
            what_to_test: item.what_to_test || '',
            expected_outcome: item.expected_outcome || '',
            test_role: item.test_role || '',
            severity
          };
        }).filter(c => c.what_to_test && c.expected_outcome);

        if (customCriteria.length === 0) {
          return json({ error: 'AI failed to parse any criteria with both "what_to_test" and "expected_outcome".' }, { status: 400 });
        }
      } catch (err) {
        console.error('[TestingSuite] AI criteria extraction failed:', responseText, err);
        return json({ error: `AI criteria extraction failed: ${err.message}. Please verify the document format or try a clean CSV upload.` }, { status: 400 });
      }
    }

    const runId = createRun({
      client_id: clientId,
      project_id: projectId,
      platform_name: platformName,
      run_name: runName,
      url,
      username,
      password,
      customCriteria
    });

    return json({ success: true, runId });
  } catch (e) {
    console.error('[TestingSuite] Create API error:', e);
    return json({ error: e.message }, { status: 500 });
  }
}
