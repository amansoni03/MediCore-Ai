import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { Phone, PhoneOff, Video, Copy, CheckCircle2, User, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './DoctorConsult.css';

export default function DoctorConsultPage() {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

  // Live doctors from Supabase
  const [doctors, setDoctors] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerInstance   = useRef(null);
  const localStreamRef = useRef(null);
  const currentCallRef = useRef(null);

  // ── Fetch live doctors from Supabase ──────────────────
  const fetchDoctors = async () => {
    setLoadingDocs(true);
    const { data } = await supabase
      .from('doctors')
      .select('user_id, full_name, specialty, avatar_url, is_online, peer_id, bio')
      .order('is_online', { ascending: false }); // online first

    setDoctors(data || []);
    setLoadingDocs(false);
  };

  useEffect(() => {
    fetchDoctors();

    // Real-time subscription — updates status instantly when doctor toggles
    const channel = supabase
      .channel('doctors-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctors' },
        () => fetchDoctors()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ── Create peer + request camera ──────────────────────
  useEffect(() => {
    const peer = new Peer();
    peer.on('open', (id) => setPeerId(id));
    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      setPeerId('Error: ' + err.type);
    });
    peer.on('disconnected', () => {
      setPeerId('Disconnected. Refresh the page.');
    });

    peer.on('call', (call) => {
      if (localStreamRef.current) {
        setIsCalling(true);
        call.answer(localStreamRef.current);
        currentCallRef.current = call;
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });
      }
    });
    peerInstance.current = peer;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        })
        .catch(() => alert('Camera & Microphone access required.'));
    } else {
      console.warn('getUserMedia is not supported on this browser or origin (requires HTTPS/localhost).');
      // Intentionally not crashing the app. Video will simply remain blank.
    }

    return () => {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (peerInstance.current) peerInstance.current.destroy();
    };
  }, []);

  const callPeer = (id) => {
    if (!id || !localStreamRef.current) return;
    setIsCalling(true);
    const call = peerInstance.current.call(id, localStreamRef.current);
    currentCallRef.current = call;
    call.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    });
  };

  const endCall = () => {
    if (currentCallRef.current) { currentCallRef.current.close(); currentCallRef.current = null; }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsCalling(false);
  };

  const copyId = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="consult-container animate-fade-in">
      <div className="consult-header">
        <h2>Live Medical Consultation</h2>
        <p>Connect face-to-face with certified doctors via peer-to-peer encrypted video — no data saved to any server.</p>
      </div>

      <div className="video-grid">
        {/* ── Left: Local + Controls ── */}
        <div className="local-card">
          <div className="video-wrapper">
            <video ref={localVideoRef} autoPlay playsInline muted className="video-element" />
            <div className="video-label">You</div>
          </div>

          <div className="connection-panel">
            <p className="panel-label">Your connection ID</p>
            <div className="peer-id-box">
              <span className="peer-id-text">{peerId || 'Generating...'}</span>
              <button className="icon-btn" onClick={copyId} title="Copy ID">
                {copied ? <CheckCircle2 size={17} color="#34d399" /> : <Copy size={17} />}
              </button>
            </div>

            <div className="divider">or dial directly</div>
            <p className="panel-label">Call a doctor by ID</p>
            <div className="call-controls">
              <input
                type="text"
                placeholder="Paste doctor's peer ID"
                value={remotePeerId}
                onChange={e => setRemotePeerId(e.target.value)}
                disabled={isCalling}
              />
              {!isCalling ? (
                <button className="btn btn-primary" onClick={() => callPeer(remotePeerId)}>
                  <Phone size={16} /> Call
                </button>
              ) : (
                <button className="btn btn-danger" onClick={endCall}>
                  <PhoneOff size={16} /> End
                </button>
              )}
            </div>

            {/* Live doctor directory */}
            <div className="divider" style={{ marginTop: '1.25rem' }}>
              Available Specialists
              <button className="refresh-btn" onClick={fetchDoctors} title="Refresh">
                <RefreshCw size={13} />
              </button>
            </div>

            <div className="doctor-directory">
              {loadingDocs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                  <Loader2 size={22} className="spin" color="#4a5d80" />
                </div>
              ) : doctors.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: '#334155', textAlign: 'center', padding: '1rem' }}>
                  No doctors registered yet.
                </p>
              ) : (
                doctors.map((doc) => (
                  <div key={doc.user_id} className="doctor-card">
                    <div className="doc-avatar">
                      {doc.avatar_url ? (
                        <img src={doc.avatar_url} alt={doc.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <User size={18} color="#a78bfa" />
                      )}
                    </div>
                    <div className="doc-info">
                      <h4>{doc.full_name || 'Doctor'}</h4>
                      <span className="doc-specialty">{doc.specialty || 'General Practice'}</span>
                      <div className={`doc-status ${doc.is_online ? 'status-online' : 'status-offline'}`}>
                        <span className="dot" />
                        {doc.is_online ? 'Online' : 'Offline'}
                      </div>
                    </div>
                    {doc.is_online && doc.peer_id && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', borderRadius: '8px', marginLeft: 'auto' }}
                        onClick={() => { setRemotePeerId(doc.peer_id); callPeer(doc.peer_id); }}
                        disabled={isCalling}
                      >
                        <Video size={14} /> Call
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Remote Video ── */}
        <div className="remote-card">
          <div className="remote-wrapper">
            {isCalling ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="video-element remote-video" />
            ) : (
              <div className="empty-state">
                <Video size={44} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <h3>Waiting for connection</h3>
                <p>When a doctor connects, their secure video stream will appear here.</p>
              </div>
            )}
            {isCalling && <div className="video-label remote-label">Doctor</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
