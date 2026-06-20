import { processMeetingNote } from '$lib/server/meeting-process-helper.js';

export async function POST({ request, params }) {
  const body = await request.json();
  const { transcript, title, meetingDate, deepReview, reprocess, meetingNoteId, alreadyFound } = body;

  if (!transcript || !transcript.trim()) {
    return Response.json({ error: 'Transcript is empty' }, { status: 400 });
  }

  try {
    const result = await processMeetingNote(transcript, title, meetingDate, {
      deepReview,
      reprocess,
      meetingNoteId,
      alreadyFound,
      projectId: params.id
    });

    return Response.json({
      success: true,
      result
    });
  } catch (err) {
    console.error(`[process] Project process error: ${err.message}`);
    return Response.json({ error: err.message || 'Processing failed' }, { status: 500 });
  }
}
