/**
 * supabase-api.js — replaces the old PHP backend.
 * Keeps the same apiGet / apiPostJson / apiPostForm functions the pages
 * already use, but answers them from Supabase (database, storage, auth).
 */
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const IMAGE_BUCKET = 'item-images';

const fail = (msg) => { throw new Error(msg); };
const must = ({ data, error }) => { if (error) fail(error.message); return data; };

function toUser(u) {
  return u ? { id: u.id, email: u.email, display_name: u.user_metadata?.display_name || 'Student' } : null;
}
async function currentUser() {
  const { data } = await sb.auth.getSession();
  return toUser(data.session?.user);
}
async function needUser() { return (await currentUser()) || fail('Not signed in.'); }

function imagePath(url) {
  if (!url) return null;
  return /^https?:/.test(url) ? url : '../uploads/' + url.replace(/^\/+/, '');
}
function fmtItem(r) {
  return {
    id: String(r.id), seller_id: r.seller_id, seller_name: r.seller_name, title: r.title,
    description: r.description, category: r.category, listing_type: r.listing_type,
    price: Number(r.price), condition: r.condition_label, image_url: r.image_url,
    image: imagePath(r.image_url), campus_location: r.campus_location, status: r.status,
    has_contact: true, created_at: r.created_at,
  };
}

/* Shrinks big phone photos in the browser so uploads are fast and small. */
async function shrinkImage(file) {
  if (file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
    return blob || file;
  } catch { return file; }
}

async function apiGet(path) {
  const [file, qs] = path.split('?');
  const p = new URLSearchParams(qs || '');
  const action = p.get('action');

  if (file === 'auth.php') return { user: await currentUser() };

  const user = await needUser();

  if (file === 'get_items.php') {
    return must(await sb.from('items').select('*').order('created_at', { ascending: false })).map(fmtItem);
  }
  if (file === 'get_item.php') {
    const row = must(await sb.from('items').select('*').eq('id', p.get('id')).maybeSingle());
    return { item: row ? fmtItem(row) : null };
  }
  if (file === 'get_contact.php') {
    const rows = must(await sb.rpc('get_contact', { p_item_id: Number(p.get('id')) }));
    return rows[0] || fail('Contact not found.');
  }
  if (file === 'wishlist.php' && action === 'ids') {
    return must(await sb.from('wishlists').select('item_id')).map((r) => String(r.item_id));
  }
  if (file === 'wishlist.php' && action === 'items') {
    const rows = must(await sb.from('wishlists').select('created_at, items(*)').order('created_at', { ascending: false }));
    return rows.filter((r) => r.items).map((r) => fmtItem(r.items));
  }
  if (file === 'messages.php' && action === 'conversations') {
    const rows = must(await sb.from('conversations').select('*, items(title, seller_name)').order('created_at', { ascending: false }));
    return rows.map((r) => ({
      id: String(r.id), item_id: String(r.item_id), buyer_id: r.buyer_id, seller_id: r.seller_id,
      buyer_name: r.buyer_name, created_at: r.created_at,
      item_title: r.items?.title ?? 'Listing removed', item_seller_name: r.items?.seller_name ?? 'Seller',
    }));
  }
  if (file === 'messages.php' && action === 'messages') {
    const rows = must(await sb.from('messages').select('*').eq('conversation_id', p.get('conversation_id')).order('created_at'));
    return rows.map((r) => ({ ...r, id: String(r.id), conversation_id: String(r.conversation_id) }));
  }
  fail('Unknown request.');
}

async function apiPostJson(path, body) {
  const [file, qs] = path.split('?');
  const action = new URLSearchParams(qs || '').get('action');

  if (file === 'auth.php' && action === 'register') {
    const { data, error } = await sb.auth.signUp({
      email: body.email, password: body.password,
      options: { data: { display_name: body.display_name }, emailRedirectTo: new URL('login.html', location.href).href },
    });
    if (error) fail(error.message);
    return { user: toUser(data.session?.user), needs_confirmation: !data.session };
  }
  if (file === 'auth.php' && action === 'login') {
    const { data, error } = await sb.auth.signInWithPassword({ email: body.email, password: body.password });
    if (error) fail(/confirm/i.test(error.message) ? 'Please confirm your email first — check your inbox for the link.' : 'Invalid email or password.');
    return { user: toUser(data.user) };
  }
  if (file === 'auth.php' && action === 'logout') { await sb.auth.signOut(); return { ok: true }; }

  const user = await needUser();

  if (file === 'wishlist.php' && action === 'add') {
    must(await sb.from('wishlists').upsert({ user_id: user.id, item_id: Number(body.item_id) }, { ignoreDuplicates: true }));
    return { ok: true };
  }
  if (file === 'wishlist.php' && action === 'remove') {
    must(await sb.from('wishlists').delete().eq('item_id', Number(body.item_id)));
    return { ok: true };
  }
  if (file === 'update_status.php') {
    const item = must(await sb.from('items').select('*').eq('id', body.item_id).maybeSingle()) || fail('Listing not found.');
    if (item.seller_id !== user.id) fail('Only the seller can update this listing.');
    if (body.status === 'sold' && item.listing_type !== 'sell') fail('This item is listed for rent. Mark it as rented instead.');
    if (body.status === 'rented' && item.listing_type !== 'rent') fail('This item is listed for sale. Mark it as sold instead.');
    must(await sb.from('items').update({ status: body.status }).eq('id', item.id));
    return { ok: true, status: body.status };
  }
  if (file === 'messages.php' && action === 'start') {
    const item = must(await sb.from('items').select('id, seller_id').eq('id', body.item_id).maybeSingle()) || fail('Listing not found.');
    if (!item.seller_id) fail('This is a showcase listing. Post your own item to start real chats with students.');
    if (item.seller_id === user.id) fail('This is your own listing.');
    const found = must(await sb.from('conversations').select('id').eq('item_id', item.id).eq('buyer_id', user.id).maybeSingle());
    if (found) return { id: String(found.id) };
    const made = must(await sb.from('conversations').insert({
      item_id: item.id, buyer_id: user.id, seller_id: item.seller_id, buyer_name: user.display_name,
    }).select('id').single());
    return { id: String(made.id) };
  }
  if (file === 'messages.php' && action === 'send') {
    const text = (body.body || '').trim();
    if (!text) fail('Message cannot be empty.');
    must(await sb.from('messages').insert({ conversation_id: Number(body.conversation_id), sender_id: user.id, body: text }));
    return { ok: true };
  }
  fail('Unknown request.');
}

async function apiPostForm(path, fd) {
  const user = await needUser();
  const title = (fd.get('title') || '').trim();
  const price = Number(fd.get('price'));
  const category = fd.get('category');
  const listingType = fd.get('listing_type');
  const phone = (fd.get('contact_phone') || '').trim();

  if (title.length < 3) fail('Give your listing a clear title (at least 3 characters).');
  if (!(price > 0)) fail('Price must be greater than ₹0.');
  if (price > 100000) fail('That price looks too high for a campus listing.');
  if (!['books', 'notes', 'electronics', 'stationary'].includes(category)) fail('Pick a valid category.');
  if (!['sell', 'rent'].includes(listingType)) fail('Choose whether the item is for sale or for rent.');
  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) fail('Enter a valid phone number (digits, spaces, + and - only).');

  let imageUrl = null;
  const picked = fd.get('image');
  if (picked && picked.size) {
    const blob = await shrinkImage(picked);
    const name = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const up = await sb.storage.from(IMAGE_BUCKET).upload(name, blob, { contentType: blob.type || 'image/jpeg' });
    if (up.error) fail('Could not upload the photo: ' + up.error.message);
    imageUrl = sb.storage.from(IMAGE_BUCKET).getPublicUrl(name).data.publicUrl;
  }

  const item = must(await sb.from('items').insert({
    seller_id: user.id, seller_name: user.display_name, title,
    description: (fd.get('description') || '').trim(), category, listing_type: listingType,
    price, condition_label: fd.get('condition') || 'good', image_url: imageUrl,
  }).select('id').single());
  must(await sb.from('item_private').insert({ item_id: item.id, contact_email: user.email, contact_phone: phone }));
  return { id: String(item.id) };
}

/* Session cache used by the navbar and pages */
let cmSessionCache = null;
async function getSession() {
  if (!cmSessionCache) cmSessionCache = { user: await currentUser() };
  return cmSessionCache;
}
function invalidateSession() { cmSessionCache = null; }
