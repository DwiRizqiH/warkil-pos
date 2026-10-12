// Satu bentuk balasan untuk seluruh API (spec §6): sukses `{ success: true, data }`,
// gagal `{ success: false, error: { code, message } }` — yang terakhir dirakit error handler.
export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
