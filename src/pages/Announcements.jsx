import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, limit, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const Announcements = () => {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState({}); // id -> boolean
  const [showComposer, setShowComposer] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createData, setCreateData] = useState({ title: '', body: '', link: '', tags: [], tagColors: {}, hidden: false });
  const timeAgo = (date) => {
    try {
      const d = date?.toDate?.() || new Date(date || 0);
      const diff = Math.max(0, Date.now() - d.getTime());
      const m = Math.floor(diff / 60000);
      if (m < 60) return `${m} dk önce`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} sa önce`;
      const days = Math.floor(h / 24);
      return `${days} g önce`;
    } catch {
      return '';
    }
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editData, setEditData] = useState({ id: '', title: '', body: '', link: '', tags: [], tagColors: {}, hidden: false });
  const [newTagInput, setNewTagInput] = useState('');
  const [editTagInput, setEditTagInput] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(null); // { mode: 'create'|'edit', tag: 'xyz' }

  const tagPalette = useMemo(() => ['Önemli', 'Güncelleme', 'Bakım', 'Etkinlik', 'Kılavuz'], []);
  const colorPalette = useMemo(() => [
    { hex: '#2563eb', name: 'Mavi' },
    { hex: '#16a34a', name: 'Yeşil' },
    { hex: '#dc2626', name: 'Kırmızı' },
    { hex: '#9333ea', name: 'Mor' },
    { hex: '#ea580c', name: 'Turuncu' },
    { hex: '#0891b2', name: 'Cyan' },
    { hex: '#047857', name: 'Koyu Yeşil' },
    { hex: '#b45309', name: 'Kahverengi' }
  ], []);

  const getTagColor = (tag, tagColors) => {
    return tagColors[tag] || colorPalette[0].hex;
  };

  // Convert hex color to rgba with opacity
  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const addTagToCreate = (tagName) => {
    const trimmed = (tagName || '').trim();
    if (!trimmed || createData.tags.includes(trimmed)) return;
    setCreateData(v => ({
      ...v,
      tags: [...v.tags, trimmed],
      tagColors: { ...v.tagColors, [trimmed]: v.tagColors[trimmed] || colorPalette[0].hex }
    }));
    setNewTagInput('');
  };

  const removeTagFromCreate = (tagName) => {
    setCreateData(v => {
      const next = v.tags.filter(t => t !== tagName);
      const nextColors = { ...v.tagColors };
      delete nextColors[tagName];
      return { ...v, tags: next, tagColors: nextColors };
    });
  };

  const addTagToEdit = (tagName) => {
    const trimmed = (tagName || '').trim();
    if (!trimmed || editData.tags.includes(trimmed)) return;
    setEditData(v => ({
      ...v,
      tags: [...v.tags, trimmed],
      tagColors: { ...v.tagColors, [trimmed]: v.tagColors[trimmed] || colorPalette[0].hex }
    }));
    setEditTagInput('');
  };

  const removeTagFromEdit = (tagName) => {
    setEditData(v => {
      const next = v.tags.filter(t => t !== tagName);
      const nextColors = { ...v.tagColors };
      delete nextColors[tagName];
      return { ...v, tags: next, tagColors: nextColors };
    });
  };

  // Close color picker when clicking outside
  useEffect(() => {
    const handler = () => setColorPickerOpen(null);
    if (colorPickerOpen) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [colorPickerOpen]);

  useEffect(() => {
    (async () => {
      try {
        // Check admin flag via adminUsers/{uid}
        if (currentUser?.uid) {
          try {
            const aRef = doc(db, 'adminUsers', currentUser.uid);
            const aSnap = await getDoc(aRef);
            setIsAdmin(aSnap.exists());
          } catch (err) {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }

        const ref = collection(db, 'announcements');
        try {
          const q = query(ref, orderBy('createdAt', 'desc'), limit(20));
          const snap = await getDocs(q);
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setRows(rows);
        } catch (e) {
          try {
            const s2 = await getDocs(ref);
            const docs = s2.docs.sort((a, b) => (b.data()?.createdAt?.toMillis?.() || 0) - (a.data()?.createdAt?.toMillis?.() || 0));
            const rows = docs.map(d => ({ id: d.id, ...d.data() }));
            setRows(rows);
          } catch (ee) {
            setLoadError(ee?.code || 'load-failed');
            setRows([]);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.uid]);

  const createAnnouncement = async () => {
    if (!isAdmin || !currentUser) return;
    const t = (createData.title || '').trim();
    const b = (createData.body || '').trim();
    if (!t && !b) return;
    setCreating(true);
    setCreateError('');
    try {
      const ref = collection(db, 'announcements');
      const payload = {
        title: t,
        body: b,
        tags: createData.tags || [],
        link: (createData.link || '').trim(),
        hidden: !!createData.hidden,
        tagColors: createData.tagColors || {},
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email || ''
      };
      await addDoc(ref, payload);
      // refresh
        const q = query(ref, orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(q);
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRows(rows);
      setShowComposer(false);
      setCreateData({ title: '', body: '', link: '', tags: [], tagColors: {}, hidden: false });
      setNewTagInput('');
      } catch (e) {
      setCreateError(e?.code || 'write-failed');
    } finally {
      setCreating(false);
    }
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const markRead = async (id) => {
    try {
      if (!currentUser?.uid) return;
      const rr = doc(db, 'announcementReads', `${currentUser.uid}_${id}`);
      await setDoc(rr, { uid: currentUser.uid, announcementId: id, readAt: serverTimestamp() }, { merge: true });
    } catch {}
  };

  const onSaveEdit = async (id, data) => {
    try {
      if (!isAdmin) return false;
      await updateDoc(doc(db, 'announcements', id), data);
      setRows(prev => prev.map(x => x.id === id ? { ...x, ...data } : x));
      return true;
    } catch {
      return false;
    }
  };

  const onDelete = async (id) => {
    try {
      if (!isAdmin) return;
      await deleteDoc(doc(db, 'announcements', id));
      setRows(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      alert(`Silme başarısız: ${err.message || 'Bilinmeyen hata'}`);
    }
  };

  const toggleHidden = async (id, nextHidden) => {
    try {
      if (!isAdmin) return;
      await updateDoc(doc(db, 'announcements', id), { hidden: !!nextHidden });
      setRows(prev => prev.map(x => x.id === id ? { ...x, hidden: !!nextHidden } : x));
    } catch {}
  };

  const visibleRows = useMemo(() => {
    const list = rows || [];
    const filtered = filter ? list.filter(a => (
      (a.title || '').toLowerCase().includes(filter.toLowerCase()) ||
      (a.body || '').toLowerCase().includes(filter.toLowerCase()) ||
      (a.tags || []).some(t => (t || '').toLowerCase().includes(filter.toLowerCase()))
    )) : list;
    if (isAdmin) return filtered;
    return filtered.filter(a => !a.hidden);
  }, [rows, filter, isAdmin]);

  return (
    <div className="info-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Duyurular</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Ara "
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ border: '1px solid #ced4da', borderRadius: 12, padding: '8px 10px', fontWeight: 600, width: 240 }}
          />
          {isAdmin && (
            <button
              type="button"
              className="btn-chip primary"
              onClick={() => { setShowComposer(true); setCreateError(''); }}
            >Yeni Duyuru</button>
          )}
        </div>
      </div>
      {loading ? <p style={{ color: '#6c757d' }}>Yükleniyor…</p> : (
        visibleRows.length ? visibleRows.map(a => {
          const isOpen = !!expanded[a.id];
          const preview = (a.body || '').slice(0, 180);
          return (
            <div key={a.id} className="info-item" style={{ alignItems: 'start', opacity: a.hidden ? 0.6 : 1 }}>
              <div style={{ flex: 1 }}>
                {/* Title */}
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                  {a.title || 'Başlıksız'}
                  {a.hidden && <span className="chip-pill" style={{ background: '#fff7ed', color: '#b45309', fontSize: 11, marginLeft: 8 }}>Gizli</span>}
                </div>
                
                {/* Tags - right after title */}
                {(a.tags || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    {(a.tags || []).map((t, idx) => {
                      const tagColors = a.tagColors || {};
                      const color = tagColors[t] || colorPalette[0].hex;
                      const bgColor = hexToRgba(color, 0.15);
                      return (
                        <span 
                          key={idx} 
                          className="chip-pill" 
                          style={{ 
                            background: bgColor, 
                            color: color, 
                            fontSize: 11,
                            fontWeight: 700,
                            border: `1px solid ${hexToRgba(color, 0.3)}`
                          }}
                        >
                          {t}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div style={{ color: '#4b5563', marginTop: 6, lineHeight: 1.5 }}>
                  {isOpen ? (a.body || '') : preview}
                  {(a.body || '').length > preview.length && (
                    <button onClick={() => { toggleExpand(a.id); markRead(a.id); }} className="btn-chip ghost" style={{ padding: '4px 8px', marginLeft: 6 }}>
                      {isOpen ? 'Gizle' : 'Devamını Oku'}
                    </button>
                  )}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 7, marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>{a.createdByEmail || a.createdBy || ''}</span>
                  <span>·</span>
                  <span>{a.createdAt?.toDate?.()?.toLocaleString?.('tr-TR') || timeAgo(a.createdAt)}</span>
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noopener noreferrer" className="btn-chip" style={{ padding: '4px 8px', fontSize: 12 }}>Bağlantı</a>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginRight: 8 }}>
                  <button
                    className="btn-chip"
                    style={{ padding: '4px 8px', fontSize: 12 }}
                    onClick={() => {
                      setEditError('');
                      setEditData({
                        id: a.id,
                        title: a.title || '',
                        body: a.body || '',
                        link: a.link || '',
                        tags: a.tags || [],
                        tagColors: a.tagColors || {},
                        hidden: !!a.hidden,
                      });
                      setEditTagInput('');
                      setEditOpen(true);
                    }}
                  >Düzenle</button>
                  <button className="btn-chip" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => {
                    if (confirm(a.hidden ? 'Duyuruyu herkese gösterilsin mi?' : 'Duyuru gizlensin mi?')) toggleHidden(a.id, !a.hidden);
                  }}>{a.hidden ? 'Göster' : 'Gizle'}</button>
                  <button className="btn-chip ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => {
                    if (confirm('Duyuruyu silmek istediğinize emin misiniz?')) onDelete(a.id);
                  }}>Sil</button>
                </div>
              )}
            </div>
          );
        }) : (
          loadError ? <p style={{ color: '#dc2626' }}>Duyurular yüklenemedi: {loadError}</p> : <p style={{ color: '#6c757d' }}>Henüz duyuru yok.</p>
        )
      )}
      {isAdmin && showComposer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '92%', maxWidth: 560, background: '#fff', borderRadius: 16, border: '1px solid #e9ecef', boxShadow: '0 20px 60px rgba(0,0,0,.2)', padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Yeni Duyuru</div>
              <button className="btn-chip ghost" style={{ padding: '6px 10px' }} onClick={() => setShowComposer(false)}>Kapat</button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                type="text"
                placeholder="Başlık"
                value={createData.title}
                onChange={(e) => setCreateData(v => ({ ...v, title: e.target.value }))}
                style={{ border: '1px solid #ced4da', borderRadius: 12, padding: '10px 12px', fontWeight: 700 }}
              />
              <textarea
                placeholder="Duyuru metni"
                value={createData.body}
                onChange={(e) => setCreateData(v => ({ ...v, body: e.target.value }))}
                rows={6}
                style={{ border: '1px solid #ced4da', borderRadius: 12, padding: '10px 12px', fontWeight: 600, minHeight: 120 }}
              />
              <input
                type="url"
                placeholder="Bağlantı (isteğe bağlı)"
                value={createData.link}
                onChange={(e) => setCreateData(v => ({ ...v, link: e.target.value }))}
                style={{ border: '1px solid #ced4da', borderRadius: 12, padding: '10px 12px', fontWeight: 600 }}
              />
              {/* Tag Management Section */}
              <div style={{ display: 'grid', gap: 10, background: '#f9fafb', borderRadius: 12, padding: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Etiketler</div>
                
                {/* Preview: Selected Tags */}
                {createData.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {createData.tags.map(tag => {
                      const color = getTagColor(tag, createData.tagColors);
                      return (
                        <div
                          key={`preview_${tag}`}
                          style={{
                            background: color,
                            color: '#fff',
                            borderRadius: 999,
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: 700,
                            fontSize: 12,
                            position: 'relative'
                          }}
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTagFromCreate(tag)}
                            style={{
                              background: 'rgba(255,255,255,0.3)',
                              border: 'none',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#fff',
                              fontSize: 14,
                              fontWeight: 700,
                              lineHeight: 1,
                              padding: 0
                            }}
                            title="Kaldır"
                          >×</button>
                          {/* Color Picker Dropdown */}
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setColorPickerOpen(colorPickerOpen?.tag === tag && colorPickerOpen?.mode === 'create' ? null : { mode: 'create', tag });
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.3)',
                                border: 'none',
                                borderRadius: 4,
                                width: 18,
                                height: 18,
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="Renk değiştir"
                            >🎨</button>
                            {colorPickerOpen?.mode === 'create' && colorPickerOpen?.tag === tag && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  marginTop: 4,
                                  background: '#fff',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 8,
                                  padding: 8,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  zIndex: 100,
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(4, 1fr)',
                                  gap: 6,
                                  minWidth: 140
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {colorPalette.map(c => (
                                  <button
                                    key={c.hex}
                                    type="button"
                                    onClick={() => {
                                      setCreateData(v => ({ ...v, tagColors: { ...v.tagColors, [tag]: c.hex } }));
                                      setColorPickerOpen(null);
                                    }}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      background: c.hex,
                                      border: getTagColor(tag, createData.tagColors) === c.hex ? '2px solid #1e293b' : '1px solid #e5e7eb',
                                      cursor: 'pointer',
                                      padding: 0
                                    }}
                                    title={c.name}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Tag Input */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Etiket ekle..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTagToCreate(newTagInput);
                      }
                    }}
                    style={{
                      flex: 1,
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addTagToCreate(newTagInput)}
                    className="btn-chip primary"
                    style={{ padding: '8px 14px', fontSize: 13 }}
                  >Ekle</button>
                </div>

                {/* Suggested Tags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Önerilen:</span>
                  {tagPalette.map(t => (
                    <button
                      key={`suggest_${t}`}
                      type="button"
                      className="btn-chip"
                      onClick={() => addTagToCreate(t)}
                      disabled={createData.tags.includes(t)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        opacity: createData.tags.includes(t) ? 0.4 : 1,
                        cursor: createData.tags.includes(t) ? 'not-allowed' : 'pointer'
                      }}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                <input type="checkbox" checked={!!createData.hidden} onChange={e => setCreateData(v => ({ ...v, hidden: e.target.checked }))} /> Gizli başlat
              </label>
              {createError && <div style={{ color: '#dc2626', fontSize: 13 }}>{createError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button className="btn-chip ghost" style={{ padding: '8px 12px' }} onClick={() => setShowComposer(false)} disabled={creating}>Vazgeç</button>
                <button className="btn-chip primary" style={{ padding: '8px 12px' }} disabled={creating} onClick={createAnnouncement}>{creating ? 'Yayınlanıyor…' : 'Yayınla'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isAdmin && editOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '92%', maxWidth: 560, background: '#fff', borderRadius: 16, border: '1px solid #e9ecef', boxShadow: '0 20px 60px rgba(0,0,0,.2)', padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Duyuru Düzenle</div>
              <button className="btn-chip ghost" style={{ padding: '6px 10px' }} onClick={() => setEditOpen(false)}>Kapat</button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                type="text"
                placeholder="Başlık"
                value={editData.title}
                onChange={(e) => setEditData(v => ({ ...v, title: e.target.value }))}
                style={{ border: '1px solid #ced4da', borderRadius: 12, padding: '10px 12px', fontWeight: 700 }}
              />
              <textarea
                placeholder="Duyuru metni"
                value={editData.body}
                onChange={(e) => setEditData(v => ({ ...v, body: e.target.value }))}
                rows={6}
                style={{ border: '1px solid #ced4da', borderRadius: 12, padding: '10px 12px', fontWeight: 600, minHeight: 120 }}
              />
              <input
                type="url"
                placeholder="Bağlantı (isteğe bağlı)"
                value={editData.link}
                onChange={(e) => setEditData(v => ({ ...v, link: e.target.value }))}
                style={{ border: '1px solid #ced4da', borderRadius: 12, padding: '10px 12px', fontWeight: 600 }}
              />
              {/* Tag Management Section - Edit */}
              <div style={{ display: 'grid', gap: 10, background: '#f9fafb', borderRadius: 12, padding: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>Etiketler</div>
                
                {/* Preview: Selected Tags */}
                {editData.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {editData.tags.map(tag => {
                      const color = getTagColor(tag, editData.tagColors);
                      return (
                        <div
                          key={`edit_preview_${tag}`}
                          style={{
                            background: color,
                            color: '#fff',
                            borderRadius: 999,
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: 700,
                            fontSize: 12,
                            position: 'relative'
                          }}
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTagFromEdit(tag)}
                            style={{
                              background: 'rgba(255,255,255,0.3)',
                              border: 'none',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#fff',
                              fontSize: 14,
                              fontWeight: 700,
                              lineHeight: 1,
                              padding: 0
                            }}
                            title="Kaldır"
                          >×</button>
                          {/* Color Picker Dropdown */}
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setColorPickerOpen(colorPickerOpen?.tag === tag && colorPickerOpen?.mode === 'edit' ? null : { mode: 'edit', tag });
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.3)',
                                border: 'none',
                                borderRadius: 4,
                                width: 18,
                                height: 18,
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="Renk değiştir"
                            >🎨</button>
                            {colorPickerOpen?.mode === 'edit' && colorPickerOpen?.tag === tag && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  marginTop: 4,
                                  background: '#fff',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 8,
                                  padding: 8,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  zIndex: 100,
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(4, 1fr)',
                                  gap: 6,
                                  minWidth: 140
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {colorPalette.map(c => (
                                  <button
                                    key={c.hex}
                                    type="button"
                                    onClick={() => {
                                      setEditData(v => ({ ...v, tagColors: { ...v.tagColors, [tag]: c.hex } }));
                                      setColorPickerOpen(null);
                                    }}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      background: c.hex,
                                      border: getTagColor(tag, editData.tagColors) === c.hex ? '2px solid #1e293b' : '1px solid #e5e7eb',
                                      cursor: 'pointer',
                                      padding: 0
                                    }}
                                    title={c.name}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Tag Input */}
                <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                    placeholder="Etiket ekle..."
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTagToEdit(editTagInput);
                      }
                    }}
                    style={{
                      flex: 1,
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addTagToEdit(editTagInput)}
                    className="btn-chip primary"
                    style={{ padding: '8px 14px', fontSize: 13 }}
                  >Ekle</button>
                </div>

                {/* Suggested Tags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Önerilen:</span>
                  {tagPalette.map(t => (
                    <button
                      key={`edit_suggest_${t}`}
                      type="button"
                      className="btn-chip"
                      onClick={() => addTagToEdit(t)}
                      disabled={editData.tags.includes(t)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        opacity: editData.tags.includes(t) ? 0.4 : 1,
                        cursor: editData.tags.includes(t) ? 'not-allowed' : 'pointer'
                      }}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                <input type="checkbox" checked={!!editData.hidden} onChange={e => setEditData(v => ({ ...v, hidden: e.target.checked }))} /> Gizli
              </label>
              {editError && <div style={{ color: '#dc2626', fontSize: 13 }}>{editError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button className="btn-chip ghost" style={{ padding: '8px 12px' }} onClick={() => setEditOpen(false)} disabled={editSaving}>Vazgeç</button>
                <button
                  className="btn-chip primary"
                  style={{ padding: '8px 12px' }}
                  disabled={editSaving}
                  onClick={async () => {
                    setEditSaving(true); setEditError('');
                    const payload = {
                      title: (editData.title || '').trim(),
                      body: (editData.body || '').trim(),
                      link: (editData.link || '').trim(),
                      tags: editData.tags || [],
                      hidden: !!editData.hidden,
                      tagColors: editData.tagColors || {},
                    };
                    try {
                      const ok = await onSaveEdit(editData.id, payload);
                      if (ok) {
                        setEditOpen(false);
                        setEditTagInput('');
                      }
                    } catch (e) {
                      setEditError('Kaydedilemedi');
                    } finally {
                      setEditSaving(false);
                    }
                  }}
                >{editSaving ? 'Kaydediliyor…' : 'Kaydet'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;


