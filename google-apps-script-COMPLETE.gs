/**
 * Share Your Moments — Drive receiver + album listing  (COMPLETE SCRIPT)
 * ---------------------------------------------------------------
 * HOW TO USE THIS:
 *   1. Open your project at script.google.com.
 *   2. Select EVERYTHING in Code.gs and delete it.
 *   3. Paste this whole file in its place.
 *   4. Save.
 *   5. Deploy ▸ Manage deployments ▸ edit (pencil) ▸ Version: NEW VERSION ▸ Deploy.
 *      (You MUST pick "New version". Just saving does NOT update the /exec URL.)
 *   6. In Drive, share the photos folder: right-click ▸ Share ▸ General access
 *      ▸ "Anyone with the link" ▸ Viewer.  (So the images can display.)
 *
 * doPost = saves each uploaded photo to your Drive folder (unchanged).
 * doGet  = returns every photo in that folder as JSON, so anyone who opens
 *          the link sees all guests' photos.  There is only ONE doGet now.
 */

const FOLDER_ID = '1_ER1kWIlMWiQoZAAvEM_f889PPk7Ucf2';
const SECRET    = 'mondaine-youssef-2026-x7k9';

/* ---------- upload (unchanged) --------------------------------------- */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return reply({ ok: false, error: 'empty request' });

    const body = JSON.parse(e.postData.contents);

    if (body.secret !== SECRET)             return reply({ ok: false, error: 'unauthorized' });
    if (!/^image\//.test(body.mimeType))    return reply({ ok: false, error: 'not an image' });
    if (!body.data)                         return reply({ ok: false, error: 'no file data' });

    const bytes = Utilities.base64Decode(body.data);
    if (bytes.length > 30 * 1024 * 1024)    return reply({ ok: false, error: 'over 30 MB' });

    const blob = Utilities.newBlob(bytes, body.mimeType, cleanName(body.name));
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);

    return reply({ ok: true, id: file.getId(), name: file.getName() });

  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

/* ---------- album listing (the part that makes the gallery work) ------ */
function doGet() {
  const photos = [];
  try {
    collectImages_(DriveApp.getFolderById(FOLDER_ID), photos);
    photos.sort(function (a, b) { return a.time - b.time; });   // oldest first
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
  return reply({ ok: true, count: photos.length, photos: photos });
}

/* walks the folder AND any subfolders, keeping anything that looks like a photo */
function collectImages_(folder, acc) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    const mime = f.getMimeType() || '';
    const name = f.getName() || '';
    if (mime.indexOf('image/') !== 0 && !/\.(jpe?g|png|webp|heic|gif)$/i.test(name)) continue;
    acc.push({
      name: name,
      time: f.getDateCreated().getTime(),
      url:  'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1920'
    });
  }
  const subs = folder.getFolders();
  while (subs.hasNext()) collectImages_(subs.next(), acc);
}

/* ---------- helpers (unchanged) -------------------------------------- */
function cleanName(name) {
  const safe = String(name || 'photo.jpg').replace(/[\\/:*?"<>|]/g, '_').slice(-80);
  const stamp = Utilities.formatDate(new Date(), 'Africa/Cairo', 'MMdd-HHmmss');
  return stamp + '-' + safe;                 /* keeps duplicates from colliding */
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
