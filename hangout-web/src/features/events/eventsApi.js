import { API_BASE, getAuthHeaders, getPublicHeaders } from '../../shared/api/apiClient';
import { clearHomeCache } from '../home/homeApi';

export async function getEventDetails(id, useAuthHeader = false) {
  const headers = useAuthHeader ? getAuthHeaders() : getPublicHeaders();
  console.log(`[getEventDetails] Fetching event ${id} using ${useAuthHeader ? 'auth' : 'public'} headers`);

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
    
    if (res.status === 401) {
      console.error(`[getEventDetails] 401 Unauthorized`, {
        errorMsg
      });
      throw new Error(`${errorMsg} (401) - Please log in again`);
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
  const headers = getAuthHeaders();
  console.log('[rsvpEvent] Starting RSVP for event', eventId);
  console.log('[rsvpEvent] Headers:', headers);
  console.log('[rsvpEvent] Token in storage:', localStorage.getItem('hangout_token') ? 'EXISTS' : 'MISSING');
  console.log('[rsvpEvent] Payload:', payload);
  
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  console.log('[rsvpEvent] Response status:', res.status);
  
  if (!res.ok) {
    let errorMsg = 'Failed to RSVP for event';
    try {
      const data = await res.json();
      console.log('[rsvpEvent] Error response data:', data);
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to RSVP for this event';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in again.';
    }
    
    if (res.status === 401) {
      console.error(`[rsvpEvent] 401 Unauthorized - Token may have expired`, { errorMsg });
    }
    
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  clearHomeCache();
  console.log(`[rsvpEvent] Successfully RSVP'd to event ${eventId}`);
  return data;
}

export async function cancelRSVP(eventId, payload = {}) {
  const headers = getAuthHeaders();
  console.log('[cancelRSVP] Starting cancellation for event', eventId);
  console.log('[cancelRSVP] Headers:', headers);
  console.log('[cancelRSVP] Token in storage:', localStorage.getItem('hangout_token') ? 'EXISTS' : 'MISSING');
  console.log('[cancelRSVP] Payload:', payload);
  
  const requestOptions = {
    method: 'DELETE',
    headers,
    body: JSON.stringify(payload), // Always send body, even if empty
  };
  
  console.log('[cancelRSVP] Making request to:', `${API_BASE}/events/${eventId}/rsvp`);
  console.log('[cancelRSVP] Request options:', { method: requestOptions.method, hasBody: true });
  
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp`, requestOptions);
  console.log('[cancelRSVP] Response status:', res.status);
  
  if (!res.ok) {
    let errorMsg = 'Failed to cancel RSVP';
    try {
      const data = await res.json();
      console.log('[cancelRSVP] Error response data:', data);
      errorMsg = data.message || errorMsg;
    } catch (e) {
      console.log('[cancelRSVP] Failed to parse error response:', e);
      if (res.status === 403) errorMsg = 'You do not have permission to cancel this RSVP';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in again.';
      else if (res.status === 404) errorMsg = 'RSVP not found. You may not be registered for this event.';
    }
    
    if (res.status === 401) {
      console.error(`[cancelRSVP] 401 Unauthorized - Token may have expired`, { errorMsg });
      throw new Error(`${errorMsg} (${res.status})`);
    }
    
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  clearHomeCache();
  console.log(`[cancelRSVP] Successfully cancelled RSVP for event ${eventId}`);
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

export async function rejectAttendee(eventId, rsvpId, rejectionReason) {
  const headers = getAuthHeaders();
  console.log(`[rejectAttendee] Rejecting attendee for event ${eventId}, RSVP ${rsvpId}`, {
    Authorization: headers.Authorization ? 'Bearer [token]' : 'NO_TOKEN',
    token: localStorage.getItem('hangout_token') ? 'EXISTS' : 'MISSING'
  });
  
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/${rsvpId}/reject-attendee`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rejectionReason }),
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

export async function removeAttendeeFromHistory(eventId, rsvpId) {
  const headers = getAuthHeaders();
  console.log(`[removeAttendeeFromHistory] Removing attendee for event ${eventId}, RSVP ${rsvpId}`, {
    Authorization: headers.Authorization ? 'Bearer [token]' : 'NO_TOKEN',
  });
  
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/${rsvpId}/remove-from-history`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    let errorMsg = 'Failed to remove attendee';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = 'You do not have permission to remove attendees for this event';
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  return data;
}

export async function submitPaymentProof(eventId, file, acknowledged = null) {
  const formData = new FormData();
  formData.append('paymentProof', file);
  if (acknowledged !== null) {
    formData.append('acknowledged', String(acknowledged));
  }

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

  let data = null;
  try {
    data = await res.json();
  } catch (parseErr) {
    console.warn('[submitPaymentProof] Response body could not be parsed as JSON:', parseErr);
  }
  console.log('[submitPaymentProof] Payment proof submitted successfully');
  return data;
}

// ── Refund Endpoints ──────────────────────────────────────────────────────

export async function requestRefund(eventId, refundReason) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/refund`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ refundReason }),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to request refund';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = "You do not have permission to request a refund for this event";
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
      else if (res.status === 400) errorMsg = 'You cannot request a refund for this event';
    }
    console.error(`[requestRefund] Error (${res.status}):`, errorMsg);
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  console.log('[requestRefund] Refund requested successfully');
  return data;
}

export async function approveRefund(eventId, rsvpId, refundProofFile) {
  const formData = new FormData();
  formData.append('refundProof', refundProofFile);

  const headers = getAuthHeaders();
  delete headers['Content-Type'];

  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/${rsvpId}/approve-refund`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    let errorMsg = 'Failed to approve refund';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = "You do not have permission to approve refunds for this event";
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    console.error(`[approveRefund] Error (${res.status}):`, errorMsg);
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  console.log('[approveRefund] Refund approved successfully');
  return data;
}

export async function rejectRefund(eventId, rsvpId, rejectionReason) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/${rsvpId}/reject-refund`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ rejectionReason }),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to reject refund';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = "You do not have permission to reject refunds for this event";
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    console.error(`[rejectRefund] Error (${res.status}):`, errorMsg);
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  console.log('[rejectRefund] Refund rejected successfully');
  return data;
}

export async function acknowledgeRefund(eventId, acknowledgement, rejectionReason = null) {
  const payload = { acknowledgement };
  if (rejectionReason) {
    payload.rejectionReason = rejectionReason;
  }
  
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/acknowledge-refund`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to process refund acknowledgement';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      if (res.status === 403) errorMsg = "You do not have permission to acknowledge this refund";
      else if (res.status === 401) errorMsg = 'Authentication required. Please log in.';
    }
    console.error(`[acknowledgeRefund] Error (${res.status}):`, errorMsg);
    throw new Error(`${errorMsg} (${res.status})`);
  }
  const data = await res.json();
  console.log('[acknowledgeRefund] Refund acknowledgement processed successfully');
  return data;
}

// ── Remove from Attending List (Guest removes event from their list) ──────

export async function removeFromAttendingList(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/rsvp/remove-from-list`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to remove event from list';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // ignore parse error
    }
    console.error(`[removeFromAttendingList] Error (${res.status}):`, errorMsg);
    throw new Error(errorMsg);
  }
  const data = await res.json();
  clearHomeCache();
  console.log(`[removeFromAttendingList] Event ${eventId} removed from attending list`);
  return data;
}