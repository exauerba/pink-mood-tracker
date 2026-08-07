/* bloom — Supabase sync layer.
 * Pushes/pulls trackers and entries to Supabase, keeping localStorage as a
 * fast local cache. All methods no-op gracefully when the client is missing
 * or there is no logged-in session.
 */

async function currentUser() {
  if (!window.bloomClient) return null;
  const { data } = await window.bloomClient.auth.getSession();
  return data.session ? data.session.user : null;
}

async function pull() {
  const user = await currentUser();
  if (!user) return;

  try {
    const { data: rows, error } = await window.bloomClient
      .from('trackers')
      .select('*')
      .eq('user_id', user.id);
    if (error) return { error };
    let trackerRows = rows;

    const { data: entryRows, error: entryError } = await window.bloomClient
      .from('entries')
      .select('*')
      .eq('user_id', user.id);
    if (entryError) return { error: entryError };

    // Brand-new user: no cloud data yet. Push the local data up instead of
    // overwriting it, so existing local data survives first login.
    if ((!trackerRows || trackerRows.length === 0) && (!entryRows || entryRows.length === 0)) {
      const localTrackers = JSON.parse(localStorage.getItem('bloom.trackers')) || [];
      const localEntries = JSON.parse(localStorage.getItem('bloom.entries')) || {};
      await pushTrackers(localTrackers);
      await pushEntries(localEntries);
      return { ok: true };
    }

    const cloudTrackers = (trackerRows || []).map((t) => ({
      id: t.id,
      name: t.name,
      group: t.group,
      direction: t.direction || 'good',
    }));

    const cloudEntries = {};
    (entryRows || []).forEach((e) => {
      if (!cloudEntries[e.date]) cloudEntries[e.date] = [];
      cloudEntries[e.date].push({ id: e.checkin_id, time: e.time, ratings: e.ratings, note: e.note });
    });

    window.bloomApp.loadLocalData(cloudTrackers, cloudEntries);
    return { ok: true };
  } catch (e) {
    return { error: 'Could not load your data.' };
  }
}

async function pushTrackers(trackers) {
  const user = await currentUser();
  if (!user) return;
  const rows = trackers.map((t) => ({ user_id: user.id, id: t.id, name: t.name, group: t.group, direction: t.direction || 'good' }));
  const { error } = await window.bloomClient.from('trackers').upsert(rows, { onConflict: 'user_id,id' });
  if (error) return { error };

  // Remove cloud trackers that no longer exist locally (renamed or deleted).
  const localIds = trackers.map((t) => t.id);
  const { data: existing, error: listError } = await window.bloomClient
    .from('trackers')
    .select('id')
    .eq('user_id', user.id);
  if (listError) return { error: listError };
  const stale = (existing || []).filter((r) => !localIds.includes(r.id)).map((r) => r.id);
  if (stale.length > 0) {
    const { error: delError } = await window.bloomClient
      .from('trackers')
      .delete()
      .eq('user_id', user.id)
      .in('id', stale);
    if (delError) return { error: delError };
  }
  return { ok: true };
}

async function pushEntries(entries) {
  const user = await currentUser();
  if (!user) return;
  const rows = [];
  Object.keys(entries).forEach((date) => {
    (entries[date] || []).forEach((checkin) => {
      rows.push({
        user_id: user.id,
        checkin_id: checkin.id,
        date,
        time: checkin.time,
        ratings: checkin.ratings,
        note: checkin.note || '',
      });
    });
  });
  const { error } = await window.bloomClient.from('entries').upsert(rows, { onConflict: 'user_id,checkin_id' });
  return error ? { error } : { ok: true };
}

window.bloomSync = { pull, pushTrackers, pushEntries };