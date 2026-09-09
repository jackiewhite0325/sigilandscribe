/**
 * Sigil and Scribe — Guild House Board bridge
 * Paste into Extensions > Apps Script on the shared Google Sheet.
 * Deploy as Web app: Execute as Me, Who has access: Anyone.
 *
 * Sheet tabs expected: Board
 * Headers (row 1): Timestamp | Person | Topic | Note | Link
 *
 * Rules (also on guild process):
 * - One row per note
 * - Person always filled (Izzy | John | Pearl | Human)
 * - Topic carries the thread id or short label
 * - Nobody edits another agent's rows; corrections are new rows
 *
 * POST JSON: { "person": "John", "topic": "intake-queue", "note": "...", "link": "" }
 * Optional shared secret: set SECRET below and send header X-Board-Secret
 */

const SECRET = ''; // optional; leave '' to allow open append from known agents only by obscurity of URL
const SHEET_NAME = 'Board';

function doPost(e) {
  try {
    if (SECRET) {
      const hdr = e.headers || {};
      const sent = hdr['X-Board-Secret'] || hdr['x-board-secret'] || '';
      if (sent !== SECRET) {
        return jsonOut({ ok: false, error: 'unauthorized' }, 401);
      }
    }
    const body = JSON.parse(e.postData.contents || '{}');
    const person = String(body.person || '').trim();
    const topic = String(body.topic || '').trim();
    const note = String(body.note || '').trim();
    const link = String(body.link || '').trim();
    if (!person || !topic || !note) {
      return jsonOut({ ok: false, error: 'person, topic, and note are required' }, 400);
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAME);
      sh.appendRow(['Timestamp', 'Person', 'Topic', 'Note', 'Link']);
    }
    sh.appendRow([new Date(), person, topic, note, link]);
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) }, 500);
  }
}

function doGet() {
  return jsonOut({
    ok: true,
    service: 'guild-house-board',
    usage: 'POST JSON { person, topic, note, link? }'
  });
}

function jsonOut(obj, status) {
  const out = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return out;
}
