/**
 * Google Apps Script Backend for SEAMEDU Admissions FMS
 * Copy and paste this code into Extensions > Apps Script in your Google Spreadsheet named:
 * SEAMEDU_ADMISSIONS_FMS
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * SEAMEDU ADMISSIONS FMS - GOOGLE APPS SCRIPT API BACKEND
 * Spreadsheet Name: SEAMEDU_ADMISSIONS_FMS
 * =========================================================================
 */

const SHEET_NAMES = {
  ALUMNI: 'Alumni',
  SC_USERS: 'SC_Users',
  LEADS: 'Leads',
  CALL_LOGS: 'Call_Logs',
  FOLLOWUPS: 'Followups',
  REFERENCE_RESPONSES: 'Reference_Responses',
  SETTINGS: 'Settings'
};

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
    const params = (e && e.parameter) ? e.parameter : {};

    let result = {};

    switch (action) {
      case 'ping':
        result = { success: true, message: 'SEAMEDU Admissions FMS API is active', timestamp: new Date().toISOString() };
        break;

      case 'initSheets':
        result = setupSpreadsheetSheets();
        break;

      case 'getAllData':
        result = fetchAllData(params.scId);
        break;

      case 'getAlumni':
        result = getSheetData(SHEET_NAMES.ALUMNI);
        break;

      case 'getSCUsers':
        result = getSheetData(SHEET_NAMES.SC_USERS);
        break;

      case 'getLeads':
        result = getSheetData(SHEET_NAMES.LEADS);
        break;

      case 'getCallLogs':
        result = getSheetData(SHEET_NAMES.CALL_LOGS);
        break;

      case 'getFollowups':
        result = getSheetData(SHEET_NAMES.FOLLOWUPS);
        break;

      case 'getReferences':
        result = getSheetData(SHEET_NAMES.REFERENCE_RESPONSES);
        break;

      case 'validateToken':
        result = validateReferenceToken(params.token);
        break;

      default:
        result = { success: false, error: 'Unknown GET action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action;
    let result = {};

    switch (action) {
      case 'login':
        result = handleLogin(payload.username, payload.password);
        break;

      case 'importAlumni':
        result = handleImportAlumni(payload.alumniList, payload.distributeOption);
        break;

      case 'updateAlumni':
        result = handleUpdateAlumni(payload.alumniId, payload.updates);
        break;

      case 'batchUpdateAlumni':
        result = handleBatchUpdateAlumni(payload.updatesList);
        break;

      case 'logCall':
        result = handleLogCall(payload.callData);
        break;

      case 'createLead':
        result = handleCreateLead(payload.leadData);
        break;

      case 'createFollowup':
        result = handleCreateFollowup(payload.followupData);
        break;

      case 'updateLeadStatus':
        result = handleUpdateLeadStatus(payload.leadId, payload.newStatus, payload.nextFollowup, payload.counsellingDate, payload.remark, payload.scId, payload.scName);
        break;

      case 'submitReference':
        result = handleSubmitReference(payload.referenceData);
        break;

      case 'reassignAlumni':
        result = handleReassignAlumni(payload.alumniIds, payload.newScId, payload.newScName);
        break;

      case 'createOrUpdateSC':
        result = handleCreateOrUpdateSC(payload.scData);
        break;

      case 'toggleSCStatus':
        result = handleToggleSCStatus(payload.scId, payload.newStatus);
        break;

      case 'syncAll':
        result = handleSyncAll(payload.data);
        break;

      default:
        result = { success: false, error: 'Unknown POST action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper: Setup Sheets and Headers if they don't exist
 */
function setupSpreadsheetSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const schemas = {
    [SHEET_NAMES.ALUMNI]: [
      'Alumni_ID', 'Name', 'Mobile', 'Email', 'Course', 'Batch', 'Passing_Year',
      'Assigned_SC_ID', 'Assigned_SC_Name', 'Call_Status', 'Last_Call_Date',
      'Reference_Received', 'Reference_Count', 'Next_Followup', 'Remark', 'Created_Date'
    ],
    [SHEET_NAMES.SC_USERS]: [
      'SC_ID', 'SC_Name', 'Username', 'Password_Hash', 'Role', 'Status', 'Mobile', 'Email', 'Created_Date'
    ],
    [SHEET_NAMES.LEADS]: [
      'Lead_ID', 'Source_Alumni_ID', 'Source_Alumni_Name', 'SC_ID', 'SC_Name',
      'Reference_Name', 'Relation', 'Mobile', 'Email', 'Course_Interest',
      'Lead_Status', 'Next_Followup', 'Counselling_Date', 'Created_Date', 'Remark'
    ],
    [SHEET_NAMES.CALL_LOGS]: [
      'Call_ID', 'Alumni_ID', 'SC_ID', 'SC_Name', 'Call_Date', 'Call_Status', 'Call_Result', 'Remark', 'Next_Followup'
    ],
    [SHEET_NAMES.FOLLOWUPS]: [
      'Followup_ID', 'Lead_ID', 'SC_ID', 'SC_Name', 'Followup_Date', 'Status', 'Remark', 'Created_Date'
    ],
    [SHEET_NAMES.REFERENCE_RESPONSES]: [
      'Response_ID', 'Token', 'Source_Alumni_ID', 'Source_SC_ID', 'Reference_Name',
      'Relation', 'Mobile', 'Email', 'Course_Interest', 'Preferred_Contact_Time',
      'Remark', 'Submitted_Date', 'Lead_ID'
    ],
    [SHEET_NAMES.SETTINGS]: ['Key', 'Value', 'Updated_Date']
  };

  Object.keys(schemas).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schemas[sheetName]);
      sheet.getRange(1, 1, 1, schemas[sheetName].length).setFontWeight('bold').setBackground('#E2E8F0');
      sheet.setFrozenRows(1);
    }
  });

  return { success: true, message: 'All sheets verified and initialized with required schema headers.' };
}

/**
 * Read table data with object key mapping
 */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, data: [] };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: true, data: [] };

  const headers = values[0];
  const rows = values.slice(1);

  const data = rows.map(row => {
    const obj = {};
    headers.forEach((h, index) => {
      obj[h] = row[index];
    });
    return obj;
  });

  return { success: true, data: data };
}

/**
 * Fetch all data tables in one call
 */
function fetchAllData(scId) {
  const alumni = getSheetData(SHEET_NAMES.ALUMNI).data || [];
  const leads = getSheetData(SHEET_NAMES.LEADS).data || [];
  const callLogs = getSheetData(SHEET_NAMES.CALL_LOGS).data || [];
  const followups = getSheetData(SHEET_NAMES.FOLLOWUPS).data || [];
  const scUsers = getSheetData(SHEET_NAMES.SC_USERS).data || [];
  const references = getSheetData(SHEET_NAMES.REFERENCE_RESPONSES).data || [];

  return {
    success: true,
    data: {
      alumni: alumni,
      leads: leads,
      callLogs: callLogs,
      followups: followups,
      scUsers: scUsers,
      references: references
    }
  };
}

/**
 * Handle Updating an Alumni record
 */
function handleUpdateAlumni(alumniId, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);
  if (!sheet) return { success: false, error: 'Alumni sheet not found' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: false, error: 'Alumni sheet is empty' };

  const headers = values[0];
  const idCol = headers.indexOf('Alumni_ID');
  if (idCol === -1) return { success: false, error: 'Alumni_ID column missing' };

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(alumniId)) {
      const rowIdx = i + 1;
      Object.keys(updates).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1 && updates[key] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(updates[key]);
        }
      });
      return { success: true, message: 'Alumni updated successfully', alumniId: alumniId };
    }
  }

  return { success: false, error: 'Alumni ID not found: ' + alumniId };
}

/**
 * Handle Batch Updating Alumni
 */
function handleBatchUpdateAlumni(updatesList) {
  if (!updatesList || !updatesList.length) return { success: true, updatedCount: 0 };
  let count = 0;
  updatesList.forEach(item => {
    const res = handleUpdateAlumni(item.id, item);
    if (res.success) count++;
  });
  return { success: true, updatedCount: count };
}

/**
 * Handle Call Logging
 */
function handleLogCall(callData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(SHEET_NAMES.CALL_LOGS);
  const alumniSheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);

  const callId = callData.callId || ('CALL-' + Utilities.getUuid().substring(0, 8).toUpperCase());
  const now = callData.callDate || new Date().toISOString();

  // 1. Add record to Call_Logs
  logSheet.appendRow([
    callId,
    callData.alumniId,
    callData.scId,
    callData.scName || '',
    now,
    callData.callStatus,
    callData.callResult || '',
    callData.remark || '',
    callData.nextFollowup || ''
  ]);

  // 2. Update Alumni row with latest call status and followup
  const alumniData = alumniSheet.getDataRange().getValues();
  const headers = alumniData[0];
  const idCol = headers.indexOf('Alumni_ID');
  const statusCol = headers.indexOf('Call_Status');
  const lastCallCol = headers.indexOf('Last_Call_Date');
  const nextFollowCol = headers.indexOf('Next_Followup');
  const remarkCol = headers.indexOf('Remark');
  const refRecCol = headers.indexOf('Reference_Received');
  const refCountCol = headers.indexOf('Reference_Count');

  for (let i = 1; i < alumniData.length; i++) {
    if (alumniData[i][idCol] == callData.alumniId) {
      const rowIdx = i + 1;
      alumniSheet.getRange(rowIdx, statusCol + 1).setValue(callData.callStatus);
      alumniSheet.getRange(rowIdx, lastCallCol + 1).setValue(now);
      if (callData.nextFollowup) {
        alumniSheet.getRange(rowIdx, nextFollowCol + 1).setValue(callData.nextFollowup);
      }
      if (callData.remark) {
        alumniSheet.getRange(rowIdx, remarkCol + 1).setValue(callData.remark);
      }
      if (callData.referenceReceived === 'Yes') {
        alumniSheet.getRange(rowIdx, refRecCol + 1).setValue('Yes');
        const currentCount = Number(alumniData[i][refCountCol] || 0);
        alumniSheet.getRange(rowIdx, refCountCol + 1).setValue(currentCount + 1);
      }
      break;
    }
  }

  return { success: true, callId: callId, message: 'Call logged successfully' };
}

/**
 * Handle Creating an Admission Lead
 */
function handleCreateLead(leadData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadsSheet = ss.getSheetByName(SHEET_NAMES.LEADS);
  const alumniSheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);

  const leadId = leadData.leadId || ('LEAD-' + Utilities.getUuid().substring(0, 8).toUpperCase());
  const now = leadData.createdDate || new Date().toISOString();

  // 1. Append to Leads sheet
  leadsSheet.appendRow([
    leadId,
    leadData.sourceAlumniId || '',
    leadData.sourceAlumniName || '',
    leadData.scId || '',
    leadData.scName || '',
    leadData.referenceName || '',
    leadData.relation || 'Other',
    leadData.mobile || '',
    leadData.email || '',
    leadData.courseInterest || '',
    leadData.leadStatus || 'New',
    leadData.nextFollowup || '',
    leadData.counsellingDate || '',
    now,
    leadData.remark || ''
  ]);

  // 2. If sourceAlumniId exists, increment reference stats on Alumni row
  if (leadData.sourceAlumniId && alumniSheet) {
    const alumniData = alumniSheet.getDataRange().getValues();
    const headers = alumniData[0];
    const idCol = headers.indexOf('Alumni_ID');
    const refRecCol = headers.indexOf('Reference_Received');
    const refCountCol = headers.indexOf('Reference_Count');

    for (let i = 1; i < alumniData.length; i++) {
      if (String(alumniData[i][idCol]) === String(leadData.sourceAlumniId)) {
        const rowIdx = i + 1;
        alumniSheet.getRange(rowIdx, refRecCol + 1).setValue('Yes');
        const count = Number(alumniData[i][refCountCol] || 0) + 1;
        alumniSheet.getRange(rowIdx, refCountCol + 1).setValue(count);
        break;
      }
    }
  }

  return { success: true, leadId: leadId, message: 'Lead created successfully' };
}

/**
 * Handle Creating a Followup log
 */
function handleCreateFollowup(followupData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const followupsSheet = ss.getSheetByName(SHEET_NAMES.FOLLOWUPS);
  const leadsSheet = ss.getSheetByName(SHEET_NAMES.LEADS);

  const followupId = followupData.followupId || ('FUP-' + Utilities.getUuid().substring(0, 8).toUpperCase());
  const now = followupData.createdDate || new Date().toISOString();

  // 1. Append to Followups
  followupsSheet.appendRow([
    followupId,
    followupData.leadId,
    followupData.scId,
    followupData.scName || '',
    followupData.followupDate || now.split('T')[0],
    followupData.status || 'Follow-up',
    followupData.remark || '',
    now
  ]);

  // 2. Update Lead row
  if (leadsSheet) {
    const leadsData = leadsSheet.getDataRange().getValues();
    const headers = leadsData[0];
    const idCol = headers.indexOf('Lead_ID');
    const statusCol = headers.indexOf('Lead_Status');
    const nextCol = headers.indexOf('Next_Followup');
    const remarkCol = headers.indexOf('Remark');
    const counsCol = headers.indexOf('Counselling_Date');

    for (let i = 1; i < leadsData.length; i++) {
      if (String(leadsData[i][idCol]) === String(followupData.leadId)) {
        const rowIdx = i + 1;
        leadsSheet.getRange(rowIdx, statusCol + 1).setValue(followupData.status);
        if (followupData.nextFollowup) {
          leadsSheet.getRange(rowIdx, nextCol + 1).setValue(followupData.nextFollowup);
        }
        if (followupData.counsellingDate && counsCol !== -1) {
          leadsSheet.getRange(rowIdx, counsCol + 1).setValue(followupData.counsellingDate);
        }
        if (followupData.remark) {
          leadsSheet.getRange(rowIdx, remarkCol + 1).setValue(followupData.remark);
        }
        break;
      }
    }
  }

  return { success: true, followupId: followupId, message: 'Followup logged successfully' };
}

/**
 * Handle Updating Lead Status
 */
function handleUpdateLeadStatus(leadId, newStatus, nextFollowup, counsellingDate, remark, scId, scName) {
  return handleCreateFollowup({
    leadId: leadId,
    scId: scId,
    scName: scName,
    followupDate: nextFollowup || new Date().toISOString().split('T')[0],
    status: newStatus,
    remark: remark,
    nextFollowup: nextFollowup,
    counsellingDate: counsellingDate
  });
}

/**
 * Handle Submitting Reference Response
 */
function handleSubmitReference(refData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const refSheet = ss.getSheetByName(SHEET_NAMES.REFERENCE_RESPONSES);

  refSheet.appendRow([
    refData.id || ('RESP-' + Utilities.getUuid().substring(0, 8).toUpperCase()),
    refData.token || '',
    refData.sourceAlumniId || '',
    refData.sourceSCId || '',
    refData.referenceName || '',
    refData.relation || 'Other',
    refData.mobile || '',
    refData.email || '',
    refData.courseInterest || '',
    refData.preferredContactTime || 'Anytime',
    refData.remark || '',
    refData.submittedDate || new Date().toISOString(),
    refData.leadId || ''
  ]);

  return { success: true, message: 'Reference response submitted successfully' };
}

/**
 * Handle Alumni Import
 */
function handleImportAlumni(alumniList, distributeOption) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);
  if (!sheet) return { success: false, error: 'Alumni sheet not found' };

  let added = 0;
  alumniList.forEach(a => {
    sheet.appendRow([
      a.id, a.name, a.mobile, a.email, a.course, a.batch, a.passingYear,
      a.assignedSCId, a.assignedSCName, a.callStatus, a.lastCallDate || '',
      a.referenceReceived || 'No', a.referenceCount || 0, a.nextFollowup || '',
      a.remark || '', a.createdDate || new Date().toISOString()
    ]);
    added++;
  });

  return { success: true, added: added, message: 'Imported ' + added + ' alumni records.' };
}

/**
 * Handle Reassigning Alumni
 */
function handleReassignAlumni(alumniIds, newScId, newScName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);
  if (!sheet) return { success: false, error: 'Alumni sheet not found' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('Alumni_ID');
  const scIdCol = headers.indexOf('Assigned_SC_ID');
  const scNameCol = headers.indexOf('Assigned_SC_Name');

  let updated = 0;
  for (let i = 1; i < values.length; i++) {
    if (alumniIds.indexOf(values[i][idCol]) !== -1) {
      const rowIdx = i + 1;
      sheet.getRange(rowIdx, scIdCol + 1).setValue(newScId);
      sheet.getRange(rowIdx, scNameCol + 1).setValue(newScName);
      updated++;
    }
  }

  return { success: true, updated: updated, message: 'Reassigned ' + updated + ' alumni.' };
}

/**
 * Handle SC User Creation/Update
 */
function handleCreateOrUpdateSC(scData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SC_USERS);
  if (!sheet) return { success: false, error: 'SC_Users sheet missing' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('SC_ID');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] == scData.id) {
      const rowIdx = i + 1;
      sheet.getRange(rowIdx, 2).setValue(scData.name);
      sheet.getRange(rowIdx, 3).setValue(scData.username);
      sheet.getRange(rowIdx, 6).setValue(scData.status);
      return { success: true, message: 'SC updated' };
    }
  }

  sheet.appendRow([
    scData.id, scData.name, scData.username, scData.passwordHash || 'sc123',
    scData.role || 'SC', scData.status || 'Active', scData.mobile || '',
    scData.email || '', scData.createdDate || new Date().toISOString()
  ]);

  return { success: true, message: 'SC created' };
}

/**
 * Handle Toggle SC Status
 */
function handleToggleSCStatus(scId, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SC_USERS);
  if (!sheet) return { success: false, error: 'SC_Users sheet missing' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('SC_ID');
  const statusCol = headers.indexOf('Status');

  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] == scId) {
      sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
      return { success: true, message: 'Status updated to ' + newStatus };
    }
  }

  return { success: false, error: 'SC not found' };
}

/**
 * Full Sync All Data
 */
function handleSyncAll(data) {
  setupSpreadsheetSheets();
  return { success: true, message: 'Sheets synced successfully' };
}
`;
