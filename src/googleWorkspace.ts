// Google Workspace APIs Integration services

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  updated: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from?: string;
  subject?: string;
  date?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime: string;
}

/**
 * ----------------------------------------
 * 1. GOOGLE TASKS
 * ----------------------------------------
 */

export async function listGoogleTasks(accessToken: string): Promise<GoogleTask[]> {
  const url = 'https://tasks.googleapis.com/v1/lists/@default/tasks?maxResults=50';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to list Google Tasks: ${res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createGoogleTask(accessToken: string, title: string, notes?: string): Promise<GoogleTask> {
  const url = 'https://tasks.googleapis.com/v1/lists/@default/tasks';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      notes,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create Google Task: ${res.statusText}`);
  }

  return await res.json();
}

export async function updateGoogleTaskStatus(
  accessToken: string,
  taskId: string,
  status: 'completed' | 'needsAction'
): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/v1/lists/@default/tasks/${taskId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update Google Task: ${res.statusText}`);
  }

  return await res.json();
}

export async function deleteGoogleTask(accessToken: string, taskId: string): Promise<boolean> {
  const url = `https://tasks.googleapis.com/v1/lists/@default/tasks/${taskId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete Google Task: ${res.statusText}`);
  }

  return true;
}

/**
 * ----------------------------------------
 * 2. GMAIL
 * ----------------------------------------
 */

export async function listGmailMessages(accessToken: string): Promise<GmailMessage[]> {
  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to list Gmail messages: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.messages) return [];

  // Fetch individual details for first few messages in parallel
  const detailPromises = data.messages.slice(0, 8).map(async (msg: { id: string }) => {
    try {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!detailRes.ok) return null;
      const detailData = await detailRes.json();
      
      const subjectHeader = detailData.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'subject');
      const fromHeader = detailData.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'from');
      const dateHeader = detailData.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'date');

      return {
        id: detailData.id,
        threadId: detailData.threadId,
        snippet: detailData.snippet || '',
        from: fromHeader?.value || 'Unknown Sender',
        subject: subjectHeader?.value || 'No Subject',
        date: dateHeader?.value ? new Date(dateHeader.value).toLocaleString() : 'No Date',
      };
    } catch {
      return null;
    }
  });

  const details = await Promise.all(detailPromises);
  return details.filter((d): d is GmailMessage => d !== null);
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  
  // Construct email in RFC 2822 format and convert to base64url
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body.replace(/\n/g, '<br/>'),
  ];
  
  const rawEmail = emailLines.join('\r\n');
  
  // Base64Url encode (standard for Gmail API)
  const base64Encoded = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64Encoded,
    }),
  });

  if (!res.ok) {
    const errorDetails = await res.text();
    console.error('Gmail API Error response:', errorDetails);
    throw new Error(`Failed to send email: ${res.statusText}`);
  }

  return true;
}

/**
 * ----------------------------------------
 * 3. GOOGLE DRIVE, DOCUMENTS AND SPREADSHEETS
 * ----------------------------------------
 */

export async function listDriveFiles(accessToken: string): Promise<DriveFile[]> {
  // Query to filter for spreadsheets, docs, and files created in this app context
  const url = `https://www.googleapis.com/drive/v3/files?q=mimeType%20%3D%20'application%2Fvnd.google-apps.document'%20or%20mimeType%20%3D%20'application%2Fvnd.google-apps.spreadsheet'&pageSize=20&fields=files(id,name,mimeType,webViewLink,modifiedTime)&orderBy=modifiedTime%20desc`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Drive files: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function createGoogleDocument(accessToken: string, title: string): Promise<{ documentId: string; title: string }> {
  const url = 'https://docs.googleapis.com/v1/documents';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create Google Document: ${res.statusText}`);
  }

  return await res.json();
}

export async function createGoogleSpreadsheet(accessToken: string, title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create Google Spreadsheet: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

export async function appendRowToGoogleSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  values: string[]
): Promise<boolean> {
  const range = 'Sheet1!A1';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [values],
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to append spreadsheet row: ${res.statusText}`);
  }

  return true;
}
