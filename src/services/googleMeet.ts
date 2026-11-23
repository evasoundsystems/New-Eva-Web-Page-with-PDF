/**
 * Client-side Google Meet REST API v2 integration.
 * Uses the in-memory OAuth access token obtained via Firebase Auth (`meetings.space.created`).
 * Zero server secrets — works identically in local dev, Cloud Run, GitHub Pages, or custom domains.
 */

export interface GoogleMeetSpaceResponse {
  name: string;
  meetingUri: string;
  meetingCode: string;
  config?: {
    accessType?: 'ACCESS_TYPE_UNSPECIFIED' | 'OPEN' | 'TRUSTED' | 'RESTRICTED';
    entryPointAccess?: 'ENTRY_POINT_ACCESS_UNSPECIFIED' | 'ALL' | 'CREATOR_APP_ONLY';
  };
  activeConference?: {
    conferenceRecord?: string;
  };
}

const MEET_API_BASE = 'https://meet.googleapis.com/v2';

async function parseMeetError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as {
      error?: { message?: string; status?: string; code?: number };
    };
    const msg = data?.error?.message;
    if (res.status === 401) {
      return 'Your Google Meet session expired. Please click "Sign in with Google" to reconnect.';
    }
    if (res.status === 403) {
      return (
        msg ||
        'Google Meet permission was not granted. Please sign in with Google again and allow Google Meet access.'
      );
    }
    return msg || `Google Meet API returned status ${res.status}.`;
  } catch {
    return `Google Meet request failed (HTTP ${res.status}).`;
  }
}

export async function createGoogleMeetSpace(
  accessToken: string,
  accessType: 'OPEN' | 'TRUSTED' = 'OPEN'
): Promise<GoogleMeetSpaceResponse> {
  const attempt = async (bodyPayload: Record<string, unknown>) =>
    fetch(`${MEET_API_BASE}/spaces`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

  let res = await attempt({
    config: {
      accessType,
    },
  });

  // Some consumer or restricted accounts reject explicit accessType; gracefully retry with default empty body
  if (!res.ok && res.status === 400) {
    res = await attempt({});
  }

  if (!res.ok) {
    throw new Error(await parseMeetError(res));
  }

  const data = (await res.json()) as GoogleMeetSpaceResponse;
  if (!data.meetingUri) {
    throw new Error('Google Meet created a space without returning a join link.');
  }
  return data;
}

export async function getGoogleMeetSpace(
  accessToken: string,
  spaceName: string
): Promise<GoogleMeetSpaceResponse> {
  const cleanName = spaceName.replace(/^\/+/, '');
  const res = await fetch(`${MEET_API_BASE}/${cleanName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error(await parseMeetError(res));
  }
  return (await res.json()) as GoogleMeetSpaceResponse;
}

/**
 * Ends an active Google Meet conference inside the given space.
 * Caller MUST present an explicit user confirmation dialog before invoking.
 */
export async function endActiveGoogleMeetConference(
  accessToken: string,
  spaceName: string
): Promise<void> {
  const cleanName = spaceName.replace(/^\/+/, '');
  const res = await fetch(`${MEET_API_BASE}/${cleanName}:endActiveConference`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await parseMeetError(res));
  }
}
