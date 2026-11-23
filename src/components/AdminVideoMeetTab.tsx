import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Mail,
  PhoneOff,
  Radio,
  Save,
  Trash2,
  Video,
} from 'lucide-react';
import {
  clearCachedMeetAccessToken,
  formatFirebaseAuthError,
  getCachedMeetAccessToken,
  signInWithGoogleForMeet,
} from '../services/firebase';
import {
  createGoogleMeetSpace,
  endActiveGoogleMeetConference,
} from '../services/googleMeet';
import type {
  QuoteRecord,
  SiteContent,
  VideoMeetingConfig,
  VideoMeetingRoomRecord,
} from '../types/site';
import {
  extractGoogleMeetCode,
  mergeVideoMeetingConfig,
  normalizeGoogleMeetUrl,
} from '../utils/siteLogic';

interface AdminVideoMeetTabProps {
  siteContent: SiteContent;
  onChangeContent: (next: SiteContent) => Promise<void> | void;
  quotes: QuoteRecord[];
}

export function AdminVideoMeetTab({
  siteContent,
  onChangeContent,
  quotes,
}: AdminVideoMeetTabProps) {
  const initialConfig = useMemo(
    () => mergeVideoMeetingConfig(siteContent.videoMeeting),
    [siteContent.videoMeeting]
  );

  const [draft, setDraft] = useState<VideoMeetingConfig>(initialConfig);
  const [meetToken, setMeetToken] = useState<string | null>(() => getCachedMeetAccessToken());
  const [connectedEmail, setConnectedEmail] = useState<string>('');
  const [accessType, setAccessType] = useState<'OPEN' | 'TRUSTED'>('OPEN');
  const [connecting, setConnecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [endingCall, setEndingCall] = useState(false);
  const [confirmEndRoom, setConfirmEndRoom] = useState<{
    spaceName: string;
    meetingUri: string;
    title: string;
  } | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    setDraft(initialConfig);
  }, [initialConfig]);

  const videoRequests = useMemo(
    () =>
      quotes.filter((q) =>
        /google meet|video|walkthrough|videollamada/i.test(
          `${q.serviceRequested} ${q.notes}`
        )
      ),
    [quotes]
  );

  async function copyText(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2200);
    } catch {
      // Ignore clipboard failure
    }
  }

  async function persistMeetingConfig(nextConfig: VideoMeetingConfig, message: string) {
    setSaving(true);
    setErrorMsg('');
    try {
      await onChangeContent({
        ...siteContent,
        videoMeeting: nextConfig,
      });
      setDraft(nextConfig);
      setStatusMsg(message);
      setTimeout(() => setStatusMsg(''), 3200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save Google Meet settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignInGoogleMeet() {
    setErrorMsg('');
    setConnecting(true);
    try {
      const res = await signInWithGoogleForMeet();
      setMeetToken(res.accessToken);
      setConnectedEmail(res.user.email || '');
      setStatusMsg(`Connected Google Meet as ${res.user.email || 'Google Account'}.`);
      setTimeout(() => setStatusMsg(''), 3500);
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setConnecting(false);
    }
  }

  async function handleCreateMeetRoom(publishLiveImmediately: boolean) {
    setErrorMsg('');
    let token = meetToken || getCachedMeetAccessToken();
    if (!token) {
      setConnecting(true);
      try {
        const res = await signInWithGoogleForMeet();
        token = res.accessToken;
        setMeetToken(res.accessToken);
        setConnectedEmail(res.user.email || '');
      } catch (err) {
        setErrorMsg(formatFirebaseAuthError(err));
        setConnecting(false);
        return;
      } finally {
        setConnecting(false);
      }
    }

    setCreating(true);
    try {
      const space = await createGoogleMeetSpace(token, accessType);
      const code = space.meetingCode || extractGoogleMeetCode(space.meetingUri);
      const newRecord: VideoMeetingRoomRecord = {
        id: `meet-${Date.now()}`,
        spaceName: space.name,
        meetingUri: space.meetingUri,
        meetingCode: code,
        title: draft.activeRoomTitleEn || 'E.V.A Sanctuary Consultation',
        createdAt: new Date().toISOString(),
        createdBy: connectedEmail || 'Luis Martinez',
        accessType,
      };
      const nextConfig: VideoMeetingConfig = {
        ...draft,
        enabled: true,
        isLiveNow: publishLiveImmediately ? true : draft.isLiveNow,
        activeMeetingUri: space.meetingUri,
        activeMeetingCode: code,
        activeSpaceName: space.name,
        recentRooms: [newRecord, ...(draft.recentRooms || [])].slice(0, 15),
      };
      await persistMeetingConfig(
        nextConfig,
        publishLiveImmediately
          ? `Google Meet created & published LIVE on storefront (${code}).`
          : `Google Meet room created (${code}).`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create Google Meet space.';
      if (msg.toLowerCase().includes('expired')) {
        clearCachedMeetAccessToken();
        setMeetToken(null);
      }
      setErrorMsg(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveManualSettings() {
    const rawUrl = draft.activeMeetingUri.trim();
    if (rawUrl) {
      const normalized = normalizeGoogleMeetUrl(rawUrl);
      if (!normalized) {
        setErrorMsg(
          'Please enter a valid Google Meet link (e.g. https://meet.google.com/abc-defg-hij) or room code (abc-defg-hij), or leave blank.'
        );
        return;
      }
      const nextConfig: VideoMeetingConfig = {
        ...draft,
        activeMeetingUri: normalized,
        activeMeetingCode: extractGoogleMeetCode(normalized),
      };
      await persistMeetingConfig(nextConfig, 'Google Meet storefront settings saved.');
      return;
    }

    const nextConfig: VideoMeetingConfig = {
      ...draft,
      activeMeetingUri: '',
      activeMeetingCode: '',
      activeSpaceName: '',
      isLiveNow: false,
    };
    await persistMeetingConfig(nextConfig, 'Google Meet storefront settings saved.');
  }

  async function executeEndActiveConference() {
    if (!confirmEndRoom) return;
    const token = meetToken || getCachedMeetAccessToken();
    if (!token) {
      setConfirmEndRoom(null);
      setErrorMsg('Please sign in with Google first to end an active Google Meet call.');
      return;
    }

    setEndingCall(true);
    setErrorMsg('');
    try {
      await endActiveGoogleMeetConference(token, confirmEndRoom.spaceName);
      const nextConfig: VideoMeetingConfig = {
        ...draft,
        isLiveNow: false,
      };
      await persistMeetingConfig(
        nextConfig,
        'Active Google Meet conference ended and storefront Live badge turned off.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not end active conference.';
      setErrorMsg(msg);
    } finally {
      setEndingCall(false);
      setConfirmEndRoom(null);
    }
  }

  function removeRecentRoom(roomId: string) {
    const nextConfig: VideoMeetingConfig = {
      ...draft,
      recentRooms: (draft.recentRooms || []).filter((r) => r.id !== roomId),
    };
    void persistMeetingConfig(nextConfig, 'Removed room from history.');
  }

  function buildCustomerInviteMailto(q: QuoteRecord): string {
    const link = draft.activeMeetingUri || 'https://meet.google.com/new';
    const subject = encodeURIComponent(
      `Your Free Google Meet Video Consultation — E.V.A Worship Engineer (${q.refCode})`
    );
    const body = encodeURIComponent(
      [
        `Hi ${q.contactName},`,
        '',
        `Here is your free Google Meet video consultation link with Luis Martinez (${siteContent.brand.companyFull}):`,
        link,
        '',
        `Reference: ${q.refCode}`,
        `Topic: ${q.serviceRequested}`,
        q.timeline ? `Time Window: ${q.timeline}` : '',
        '',
        `Call or text ${siteContent.brand.phoneDisplay} if you need anything before we hop on!`,
        `— ${siteContent.brand.leadEngineer}`,
      ]
        .filter((line) => line !== undefined)
        .join('\n')
    );
    return `mailto:${q.email}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="space-y-6">
      {/* Header & Google Sign-In */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-lg font-bold text-[#141518]">
                Google Meet Video Consultations (Free Gmail Compatible)
              </h3>
              {draft.isLiveNow && draft.activeMeetingUri && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <Radio className="w-3 h-3 animate-pulse" />
                  LIVE ON STOREFRONT
                </span>
              )}
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Create instant Google Meet rooms in 1 click, publish a Live Consultation Room on your homepage, and send invites to churches &amp; event clients. (Note: Google Chat API requires paid Workspace, whereas Google Meet is free with Gmail.)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!meetToken ? (
              <button
                type="button"
                onClick={handleSignInGoogleMeet}
                disabled={connecting}
                className="gsi-material-button inline-flex items-center justify-center gap-2.5 px-4 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 shadow-xs text-xs font-semibold text-[#1f1f1f] cursor-pointer disabled:opacity-60"
              >
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-4 h-4 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span>{connecting ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <Check className="w-3.5 h-3.5" />
                <span>Google Meet Ready {connectedEmail ? `(${connectedEmail})` : ''}</span>
              </span>
            )}
          </div>
        </div>

        {/* Instant Create Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <label htmlFor="meet-access-type" className="text-xs font-semibold text-stone-700">
              Room Access:
            </label>
            <select
              id="meet-access-type"
              value={accessType}
              onChange={(e) => setAccessType(e.target.value as 'OPEN' | 'TRUSTED')}
              className="px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
            >
              <option value="OPEN">Open (Any customer with link)</option>
              <option value="TRUSTED">Trusted (Host admits guests)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => handleCreateMeetRoom(true)}
            disabled={creating || connecting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" />
            <span>
              {creating ? 'Creating Room...' : 'Create & Publish LIVE Google Meet Room'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCreateMeetRoom(false)}
            disabled={creating || connecting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Create Private Meet Link</span>
          </button>
        </div>

        {statusMsg && (
          <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {statusMsg}
          </p>
        )}
        {errorMsg && (
          <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Active Storefront Meeting Room Card */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-display text-sm font-bold text-[#141518]">
            Storefront Consultation Room Settings
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                className="rounded border-stone-300"
              />
              <span>Show "Video Meet" Button on Website</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isLiveNow}
                disabled={!draft.activeMeetingUri.trim()}
                onChange={(e) => setDraft({ ...draft, isLiveNow: e.target.checked })}
                className="rounded border-stone-300"
              />
              <span>Show "Live Now" Green Badge</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label
              htmlFor="admin-meet-uri"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              Active Google Meet URL (auto-filled when you create a room, or paste your own)
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="admin-meet-uri"
                type="text"
                value={draft.activeMeetingUri}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    activeMeetingUri: e.target.value,
                    activeMeetingCode: extractGoogleMeetCode(e.target.value),
                  })
                }
                placeholder="https://meet.google.com/abc-defg-hij"
                className="flex-1 min-w-[240px] px-3 py-2 text-sm font-mono bg-white border border-stone-300 rounded-lg"
              />
              {draft.activeMeetingUri && normalizeGoogleMeetUrl(draft.activeMeetingUri) && (
                <>
                  <button
                    type="button"
                    onClick={() => copyText('admin-active', draft.activeMeetingUri)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-800 cursor-pointer"
                  >
                    {copiedId === 'admin-active' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === 'admin-active' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={normalizeGoogleMeetUrl(draft.activeMeetingUri)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Join Room</span>
                  </a>
                  {draft.activeSpaceName && meetToken && (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmEndRoom({
                          spaceName: draft.activeSpaceName!,
                          meetingUri: draft.activeMeetingUri,
                          title: draft.activeRoomTitleEn,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>End Active Call</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Room Title (English)
            </label>
            <input
              type="text"
              value={draft.activeRoomTitleEn}
              onChange={(e) => setDraft({ ...draft, activeRoomTitleEn: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Room Title (Spanish)
            </label>
            <input
              type="text"
              value={draft.activeRoomTitleEs}
              onChange={(e) => setDraft({ ...draft, activeRoomTitleEs: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Video Hours (English)
            </label>
            <input
              type="text"
              value={draft.availabilityHoursEn}
              onChange={(e) => setDraft({ ...draft, availabilityHoursEn: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Video Hours (Spanish)
            </label>
            <input
              type="text"
              value={draft.availabilityHoursEs}
              onChange={(e) => setDraft({ ...draft, availabilityHoursEs: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveManualSettings}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#141518] hover:bg-[#272A30] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#E0A446]" />
            <span>{saving ? 'Saving...' : 'Save Google Meet Settings'}</span>
          </button>
        </div>
      </div>

      {/* Customer Video Meeting Requests */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
        <h4 className="font-display text-sm font-bold text-[#141518]">
          Customer Video Meeting Requests ({videoRequests.length})
        </h4>
        {videoRequests.length === 0 ? (
          <p className="text-xs text-stone-500">
            No customer Google Meet walkthrough requests yet. When a visitor books a free video consultation from your site, it will appear right here and in Estimates &amp; Leads.
          </p>
        ) : (
          <div className="space-y-2.5">
            {videoRequests.map((q) => (
              <div
                key={q.id}
                className="rounded-lg border border-stone-200 bg-[#F8F8F6] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold text-[#9A6315]">
                      {q.refCode}
                    </span>
                    <span className="text-sm font-bold text-[#141518]">{q.contactName}</span>
                    {q.organization && (
                      <span className="text-xs text-stone-600">· {q.organization}</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-700 font-medium">{q.serviceRequested}</p>
                  <p className="text-[11px] text-stone-500">
                    {q.phone} {q.email ? `· ${q.email}` : ''} {q.timeline ? `· ${q.timeline}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {q.email && (
                    <a
                      href={buildCustomerInviteMailto(q)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Meet Invite</span>
                    </a>
                  )}
                  {draft.activeMeetingUri && (
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          `inv-${q.id}`,
                          `Hi ${q.contactName}, join Luis Martinez on Google Meet: ${draft.activeMeetingUri}`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 cursor-pointer"
                    >
                      {copiedId === `inv-${q.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === `inv-${q.id}` ? 'Copied SMS' : 'Copy Text Invite'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Created Google Meet Rooms */}
      {(draft.recentRooms || []).length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
          <h4 className="font-display text-sm font-bold text-[#141518]">
            Recent Google Meet Rooms ({draft.recentRooms!.length})
          </h4>
          <div className="space-y-2">
            {draft.recentRooms!.map((room) => (
              <div
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#141518] font-mono break-all">
                    {room.meetingUri}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Code: {room.meetingCode} · Created {room.createdAt.slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyText(room.id, room.meetingUri)}
                    className="px-2.5 py-1 rounded border border-stone-300 bg-white text-[11px] font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                  >
                    {copiedId === room.id ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      persistMeetingConfig(
                        {
                          ...draft,
                          isLiveNow: true,
                          activeMeetingUri: room.meetingUri,
                          activeMeetingCode: room.meetingCode,
                          activeSpaceName: room.spaceName || '',
                        },
                        `Set ${room.meetingCode} as LIVE storefront Google Meet room.`
                      )
                    }
                    className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Set Live
                  </button>
                  <a
                    href={room.meetingUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-[#141518] text-white text-[11px] font-semibold"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => removeRecentRoom(room.id)}
                    aria-label={`Remove room ${room.meetingCode}`}
                    className="p-1.5 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explicit Confirmation Dialog before ending an active Google Meet conference */}
      {confirmEndRoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-end-meet-title"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 p-4"
        >
          <div className="bg-white rounded-xl border border-stone-200 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4
                  id="confirm-end-meet-title"
                  className="font-display text-base font-bold text-[#141518]"
                >
                  End Active Google Meet Conference?
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  This will immediately disconnect all current participants in{' '}
                  <span className="font-mono font-semibold text-stone-900">
                    {confirmEndRoom.meetingUri}
                  </span>{' '}
                  and turn off your Live storefront indicator.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setConfirmEndRoom(null)}
                disabled={endingCall}
                className="px-4 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeEndActiveConference}
                disabled={endingCall}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                {endingCall ? 'Ending Conference...' : 'Confirm & End Call'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
