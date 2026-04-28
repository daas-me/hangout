import { API_BASE, getAuthHeaders } from '../../shared/api/apiClient';

export async function getEventDetails(id) {
  const headers = getAuthHeaders();
  console.log(`[getEventDetails] Fetching event ${id} with headers:`, { Authorization: headers.Authorization ? 'Bearer [token]' : 'NO_TOKEN' });

  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    let errorMsg = 'Failed to fetch event';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // ignore parse error
    }
    
    // Enhanced logging for 401 errors
    if (res.status === 401) {
      console.error(`[getEventDetails] 401 Unauthorized - Token may be missing or expired`, {
        hasAuthHeader: !!headers.Authorization,
        tokenExists: !!localStorage.getItem('hangout_token'),
        errorMsg
      });
    }
    
    const fullError = `${errorMsg} (${res.status})`;
    console.error(`[getEventDetails] Error:`, fullError);
    throw new Error(fullError);
  }

  const data = await res.json();
  console.log(`[getEventDetails] Successfully fetched event ${id}`);
  return data;
}

export async function createEvent(payload) {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to create event';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to create this event';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  return data;
}

export async function updateEvent(id, payload) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to update event';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to update this event';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  return data;
}

export async function deleteEvent(id) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to delete event';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to delete this event';
    }
    throw new Error(errorMsg);
  }
}

export async function publishEvent(id) {
  const res = await fetch(`${API_BASE}/events/${id}/publish`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to publish event';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to publish this event';
    }
    throw new Error(errorMsg);
  }
  const data = await res.json();
  return data;
}

export async function unpublishEvent(id) {
  const res = await fetch(`${API_BASE}/events/${id}/unpublish`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to unpublish event';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to unpublish this event';
    }
    throw new Error(errorMsg);
  }
  const data = await res.json();
  return data;
}

// ── RSVP Functions ────────────────────────────────────────────────────────

export async function rsvpEvent(eventId, payload = {}) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to RSVP for event';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to RSVP for this event';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  return data;
}

export async function cancelRSVP(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to cancel RSVP';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }
  const data = await res.json();
  return data;
}

export async function checkRSVPStatus(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/check`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to check RSVP status';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }
  const data = await res.json();
  return data;
}

export async function getEventAttendees(eventId) {
  const headers = getAuthHeaders();
  console.log('Token in storage:', localStorage.getItem('hangout_token'));
  console.log('Headers being sent:', headers);
  const res = await fetch(`${API_BASE}/events/${eventId}/attendees`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to fetch attendees';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }
  const data = await res.json();
  return data;
}

export async function approvePayment(eventId, rsvpId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/${rsvpId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to approve payment';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to approve payments for this event';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  return data;
}

export async function rejectPayment(eventId, rsvpId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/${rsvpId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to reject payment';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to reject payments for this event';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  return data;
}

export async function rejectAttendee(eventId, rsvpId, rejectionNote) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/${rsvpId}/reject-attendee`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejectionNote }),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to reject attendee';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to reject attendees for this event';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  return data;
}

export async function submitPaymentProof(eventId, file) {
  const formData = new FormData();
  formData.append('paymentProof', file);

  const headers = getAuthHeaders();
  // Don't set Content-Type for FormData - browser will set it with boundary
  delete headers['Content-Type'];

  console.log(`[submitPaymentProof] Uploading payment proof for event ${eventId}`, { Authorization: headers.Authorization ? 'Bearer [token]' : 'NO_TOKEN' });

  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/payment-proof`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = 'Failed to submit payment proof';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = "You do not have permission to submit payment proof for this event. Please ensure you have RSVP'd to the event.";
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
      else if (res.status === 400) errorMsg = 'Invalid payment proof file. Please try again.';
    }
    console.error(`[submitPaymentProof] Error (${res.status}):`, errorMsg);
    throw new Error(`${errorMsg} (${res.status})`);
  }

  const data = await res.json();
  console.log('[submitPaymentProof] Payment proof submitted successfully');
  return data;
}