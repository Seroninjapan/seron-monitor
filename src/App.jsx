import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

const C = {
  bg: '#0A0A0A', card: '#151515', card2: '#1A1A1A',
  green: '#1A9E6F', greenDark: '#0E6B4A', greenSoft: 'rgba(26,158,111,0.1)',
  text: '#FFFFFF', text2: '#999999', text3: '#555555',
  accent: '#00E08E', border: 'rgba(255,255,255,0.06)',
  orange: '#FF8C42',
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [screen, setScreen] = useState('home')
  const [missions, setMissions] = useState([])
  const [myApps, setMyApps] = useState([])
  const [selMission, setSelMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      loadMissions()
      loadMyApplications()
    }
  }, [session])

  const loadProfile = async (user) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
    } else {
      const { data: newProfile } = await supabase.from('profiles').insert({
        id: user.id,
        role: 'monitor',
        display_name: user.user_metadata.full_name || user.email,
        email: user.email,
        avatar_url: user.user_metadata.avatar_url,
      }).select().single()
      setProfile(newProfile)
    }
  }

  const loadMissions = async () => {
    const { data } = await supabase
      .from('missions')
      .select('*, clients(venue_name, area, venue_type)')
      .eq('status', '公開中')
      .order('created_at', { ascending: false })
    setMissions(data || [])
  }

  const loadMyApplications = async () => {
    const { data: monitorData } = await supabase
      .from('monitors')
      .select('id')
      .eq('profile_id', session?.user?.id)
      .single()
    if (!monitorData) return
    const { data } = await supabase
      .from('applications')
      .select('*, missions(title, perk, clients(venue_name, area))')
      .eq('monitor_id', monitorData.id)
      .order('applied_at', { ascending: false })
    setMyApps(data || [])
  }

  const applyToMission = async (mission) => {
    const { data: monitorData } = await supabase
      .from('monitors')
      .select('id')
      .eq('profile_id', session.user.id)
      .single()

    let monitorId = monitorData?.id
    if (!monitorId) {
      const { data: newMonitor } = await supabase.from('monitors').insert({
        profile_id: session.user.id,
        languages: [],
      }).select().single()
      monitorId = newMonitor.id
    }

    const { error } = await supabase.from('applications').insert({
      mission_id: mission.id,
      monitor_id: monitorId,
      status: 'pending',
    })

    if (error) {
      showToast('すでに応募済みです')
    } else {
      showToast('Application submitted! 🎉')
      loadMyApplications()
      nav('my')
    }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setScreen('home')
  }

  const nav = (s) => { setScreen(s); setSelMission(null) }

  const getEmoji = (type) => ({ 'Restaurant': '🍽', 'Hotel': '🏨', 'Street Food': '🍢', 'Ryokan': '♨️', '飲食': '🍽', '宿泊': '🏨', '観光施設': '🗼' }[type] || '🏢')

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.accent, fontSize: 24, fontWeight: 700 }}>Seron</div>
    </div>
  )

  if (!session) return <LoginScreen onLogin={signInWithGoogle} />

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, system-ui, sans-serif', color: C.text, position: 'relative' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: C.greenDark, color: 'white', padding: '12px 28px', borderRadius: 30, fontSize: 13, fontWeight: 600, zIndex: 300, boxShadow: '0 8px 32px rgba(0,224,142,0.3)' }}>
          {toast}
        </div>
      )}

      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${C.accent}, ${C.green})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A', fontSize: 16, fontWeight: 800 }}>S</div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.8 }}>Seron</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: 18 }}>🔔</span>
          </div>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} style={{ width: 34, height: 34, borderRadius: '50%', cursor: 'pointer' }} onClick={() => nav('profile')} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, ${C.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0A0A0A', cursor: 'pointer' }} onClick={() => nav('profile')}>
              {profile?.display_name?.[0] || 'U'}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 20px 100px' }}>

        {/* HOME */}
        {screen === 'home' && (
          <div>
            <div style={{ margin: '20px 0 24px' }}>
              <div style={{ fontSize: 14, color: C.text2, marginBottom: 6 }}>Hey {profile?.display_name?.split(' ')[0]} 👋</div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, letterSpacing: -1.2 }}>
                Eat free.<br />Stay free.<br /><span style={{ color: C.accent }}>Get discovered.</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
              {[
                { num: missions.length, label: 'Open missions', color: C.accent },
                { num: myApps.length, label: 'My applications', color: C.text },
                { num: myApps.filter(a => a.status === 'completed').length, label: 'Completed', color: C.orange },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: C.card, borderRadius: 14, padding: '14px 12px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.num}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {missions.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Featured</span>
                </div>
                <div onClick={() => { setSelMission(missions[0]); setScreen('detail') }} style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 24, cursor: 'pointer' }}>
                  <div style={{ height: 200, background: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 40%, #2d6da8 100%)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)' }}></div>
                    <div style={{ position: 'absolute', top: 14, left: 14 }}>
                      <span style={{ padding: '5px 12px', background: 'rgba(0,224,142,0.2)', border: '1px solid rgba(0,224,142,0.3)', borderRadius: 20, fontSize: 11, fontWeight: 600, color: C.accent }}>✦ Featured</span>
                    </div>
                    <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 36 }}>{getEmoji(missions[0].clients?.venue_type)}</div>
                    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{missions[0].clients?.venue_name}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>{missions[0].clients?.area}</div>
                      <div style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(0,224,142,0.15)', border: '1px solid rgba(0,224,142,0.25)', borderRadius: 8, fontSize: 14, fontWeight: 700, color: C.accent }}>{missions[0].perk}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>All missions</span>
              <button onClick={() => nav('browse')} style={{ fontSize: 13, color: C.accent, border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>See all →</button>
            </div>
            {missions.slice(0, 3).map(m => <MissionCard key={m.id} mission={m} onOpen={() => { setSelMission(m); setScreen('detail') }} getEmoji={getEmoji} C={C} />)}
          </div>
        )}

        {/* BROWSE */}
        {screen === 'browse' && (
          <div>
            <div style={{ margin: '16px 0 20px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.8 }}>Browse all</div>
              <div style={{ fontSize: 13, color: C.text2 }}>{missions.length} missions available</div>
            </div>
            {missions.length === 0 && <Empty text="No missions available yet" C={C} />}
            {missions.map(m => <MissionCard key={m.id} mission={m} onOpen={() => { setSelMission(m); setScreen('detail') }} getEmoji={getEmoji} C={C} />)}
          </div>
        )}

        {/* DETAIL */}
        {screen === 'detail' && selMission && (
          <div>
            <button onClick={() => nav('home')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: C.text2, border: 'none', background: 'none', cursor: 'pointer', padding: '12px 0' }}>← Back</button>
            <div style={{ height: 220, background: 'linear-gradient(135deg, #1a0a00 0%, #4a2010 40%, #8B4513 100%)', borderRadius: 20, position: 'relative', overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)' }}></div>
              <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 44 }}>{getEmoji(selMission.clients?.venue_type)}</div>
              <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>{selMission.clients?.venue_name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>📍 {selMission.clients?.area}, Osaka</div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,224,142,0.08)', border: '1px solid rgba(0,224,142,0.15)', borderRadius: 16, padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: C.text2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>What you get</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{selMission.perk}</div>
              </div>
              <div style={{ fontSize: 36 }}>🎁</div>
            </div>

            {selMission.images?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Photos</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {selMission.images.map((url, i) => (
                    <img key={i} src={url} style={{ width: 120, height: 90, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>About this mission</div>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: '#CCC' }}>{selMission.description}</p>
            </div>

            {selMission.questions?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Evaluation checklist</div>
                {selMission.questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: i === 0 ? C.accent : C.card, color: i === 0 ? '#0A0A0A' : C.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ fontSize: 14, color: '#CCC', lineHeight: 1.5, paddingTop: 2 }}>{q}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {selMission.required_languages?.map(l => <span key={l} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(0,224,142,0.1)', color: C.accent }}>{l}</span>)}
              {selMission.preferred_date && <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: C.card, color: C.text2 }}>{selMission.preferred_date}</span>}
              <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: C.card, color: C.text2 }}>{selMission.monitor_count} spot{selMission.monitor_count > 1 ? 's' : ''}</span>
            </div>

            <button onClick={() => applyToMission(selMission)} style={{ width: '100%', padding: 16, background: `linear-gradient(135deg, ${C.accent}, ${C.green})`, color: '#0A0A0A', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>Apply now</button>
            <div style={{ textAlign: 'center', fontSize: 12, color: C.text3, marginTop: 8 }}>Usually responds within 24h</div>
          </div>
        )}

        {/* MY MISSIONS */}
        {screen === 'my' && (
          <div>
            <div style={{ margin: '16px 0 20px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.8 }}>My applications</div>
              <div style={{ fontSize: 13, color: C.text2 }}>{myApps.length} tracked</div>
            </div>
            {myApps.length === 0 && <Empty text="No applications yet. Browse missions!" C={C} />}
            {myApps.map((a, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 16, padding: 18, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{a.missions?.clients?.venue_name}</div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>{a.missions?.clients?.area} · {new Date(a.applied_at).toLocaleDateString('ja-JP')}</div>
                  </div>
                  <span style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: a.status === 'matched' ? 'rgba(0,224,142,0.12)' : a.status === 'pending' ? 'rgba(255,183,77,0.12)' : 'rgba(255,255,255,0.06)', color: a.status === 'matched' ? C.accent : a.status === 'pending' ? '#FFB74D' : C.text3 }}>
                    {a.status === 'matched' ? 'Matched ✓' : a.status === 'pending' ? 'Under review' : 'Completed'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{a.missions?.perk}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
                  {['Applied', 'Matched', 'Completed'].map((s, si) => {
                    const step = a.status === 'pending' ? 0 : a.status === 'matched' ? 1 : 2
                    return (
                      <div key={si} style={{ flex: 1 }}>
                        <div style={{ height: 3, borderRadius: 2, background: si <= step ? C.accent : C.card2, marginBottom: 4 }}></div>
                        <div style={{ fontSize: 10, color: si <= step ? C.accent : C.text3 }}>{s}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROFILE */}
        {screen === 'profile' && (
          <div>
            <div style={{ textAlign: 'center', padding: '28px 0 20px' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 14px' }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, ${C.green})`, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, margin: '0 auto 14px' }}>
                  {profile?.display_name?.[0] || 'U'}
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 700 }}>{profile?.display_name}</div>
              <div style={{ fontSize: 13, color: C.text2, marginTop: 4 }}>{profile?.email}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {[
                { num: myApps.length, label: 'Applications' },
                { num: myApps.filter(a => a.status === 'completed').length, label: 'Completed' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: C.card, borderRadius: 14, padding: '16px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{s.num}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {['Help center', 'About Seron'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px', background: C.card, borderRadius: 12, marginBottom: 8, cursor: 'pointer' }}>
                <span style={{ fontSize: 14 }}>{item}</span>
                <span style={{ color: C.text3 }}>›</span>
              </div>
            ))}

            <button onClick={signOut} style={{ width: '100%', padding: 14, background: 'transparent', color: '#FF4757', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>Sign out</button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(10,10,10,0.95)', borderTop: `1px solid ${C.border}`, display: 'flex', height: 62, zIndex: 50 }}>
        {[
          { key: 'home', label: 'Home', icon: '⌂' },
          { key: 'browse', label: 'Browse', icon: '◎' },
          { key: 'my', label: 'Missions', icon: '☰' },
          { key: 'profile', label: 'Profile', icon: '○' },
        ].map((tab) => {
          const isActive = screen === tab.key || (screen === 'detail' && tab.key === 'home')
          return (
            <button key={tab.key} onClick={() => nav(tab.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', color: isActive ? C.accent : C.text3 }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LoginScreen({ onLogin }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#0A0A0A', minHeight: '100vh', fontFamily: '-apple-system, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
      <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #00E08E, #1A9E6F)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A', fontSize: 32, fontWeight: 800, marginBottom: 24 }}>S</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#FFF', letterSpacing: -1.2, textAlign: 'center', marginBottom: 12 }}>Seron Monitor</div>
      <div style={{ fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 1.6, marginBottom: 48 }}>
        Eat free. Stay free.<br />Share your experience.
      </div>
      <button onClick={onLogin} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', background: '#FFF', color: '#333', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
        <span style={{ fontSize: 20 }}>G</span>
        Continue with Google
      </button>
      <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
        By continuing, you agree to our<br />Terms of Service and Privacy Policy
      </div>
    </div>
  )
}

function MissionCard({ mission, onOpen, getEmoji, C }) {
  return (
    <div onClick={onOpen} style={{ display: 'flex', gap: 14, background: C.card, borderRadius: 16, padding: 14, marginBottom: 10, cursor: 'pointer', alignItems: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: 12, background: 'linear-gradient(135deg, #1a0a00, #8B4513)', position: 'relative', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
        {getEmoji(mission.clients?.venue_type)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{mission.clients?.venue_name}</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{mission.clients?.area}</div>
        <div style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(0,224,142,0.1)', border: '1px solid rgba(0,224,142,0.15)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: C.accent }}>{mission.perk}</div>
      </div>
      <span style={{ color: '#333', fontSize: 18 }}>›</span>
    </div>
  )
}

function Empty({ text, C }) {
  return <div style={{ textAlign: 'center', padding: '60px 20px', color: C.text3, fontSize: 14 }}>{text}</div>
}
