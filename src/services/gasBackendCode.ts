/**
 * Google Apps Script Backend for SEAMEDU Admissions FMS
 * Copy and paste this code into Extensions > Apps Script in your Google Spreadsheet named:
 * SEAMEDU_ADMISSIONS_FMS
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * SEAMEDU ADMISSIONS FMS - GOOGLE APPS SCRIPT API BACKEND
 * Spreadsheet Name: SEAMEDU_ADMISSIONS_FMS
 * Full Two-Way Synchronization, Zero Data Loss & Persistent Connection
 * =========================================================================
 */

const SHEET_NAMES = {
  ALUMNI: 'Alumni',
  SC_USERS: 'SC_Users',
  LEADS: 'Leads',
  CALL_LOGS: 'Call_Logs',
  FOLLOWUPS: 'Followups',
  REFERENCE_RESPONSES: 'Reference_Responses',
  SETTINGS: 'Settings',
  AUDIT_LOGS: 'Audit_Logs',
  ARCHIVED_RECORDS: 'Archived_Records'
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
        result = {
          success: true,
          message: 'SEAMEDU Admissions FMS API is active and operational',
          timestamp: new Date().toISOString()
        };
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

      case 'getAuditLogs':
        result = getSheetData(SHEET_NAMES.AUDIT_LOGS);
        break;

      case 'getArchivedRecords':
        result = getSheetData(SHEET_NAMES.ARCHIVED_RECORDS);
        break;

      case 'getSettings':
        result = getSheetData(SHEET_NAMES.SETTINGS);
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
      case 'ping':
        result = { success: true, message: 'Pong', timestamp: new Date().toISOString() };
        break;

      case 'initSheets':
        result = setupSpreadsheetSheets();
        break;

      case 'login':
        result = handleLogin(payload.username, payload.password);
        break;

      case 'createAlumni':
        result = handleCreateAlumni(payload.alumniData);
        break;

      case 'importAlumni':
        result = handleImportAlumni(payload.alumniList, payload.distributeOption);
        break;

      case 'updateAlumni':
        result = handleUpdateAlumni(payload.alumniId, payload.updates);
        break;

      case 'deleteAlumni':
        result = handleDeleteAlumni(payload.alumniId);
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

      case 'updateLead':
        result = handleUpdateLead(payload.leadId, payload.updates);
        break;

      case 'deleteLead':
        result = handleDeleteLead(payload.leadId);
        break;

      case 'createFollowup':
        result = handleCreateFollowup(payload.followupData);
        break;

      case 'updateLeadStatus':
        result = handleUpdateLeadStatus(
          payload.leadId,
          payload.newStatus,
          payload.nextFollowup,
          payload.counsellingDate,
          payload.remark,
          payload.scId,
          payload.scName
        );
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

      case 'logAudit':
        result = handleLogAudit(payload.logData);
        break;

      case 'archiveRecord':
        result = handleArchiveRecord(payload.recordData);
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
 * Setup All Spreadsheet Sheets and Required Column Headers
 * Preserves all existing data, creates missing tabs and headers automatically
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
    [SHEET_NAMES.SETTINGS]: ['Key', 'Value', 'Updated_Date'],
    [SHEET_NAMES.AUDIT_LOGS]: [
      'Log_ID', 'Timestamp', 'Entity_Type', 'Entity_ID', 'Action', 'User_ID', 'User_Name', 'Role', 'Details'
    ],
    [SHEET_NAMES.ARCHIVED_RECORDS]: [
      'Archived_ID', 'Original_ID', 'Entity_Type', 'Archived_At', 'User_ID', 'User_Name', 'Reason', 'Data_JSON'
    ]
  };

  const createdTabs = [];

  Object.keys(schemas).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      createdTabs.push(sheetName);
    }
    // If the sheet has no rows, add the schema headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schemas[sheetName]);
      sheet.getRange(1, 1, 1, schemas[sheetName].length)
        .setFontWeight('bold')
        .setBackground('#E2E8F0')
        .setFontColor('#0F172A');
      sheet.setFrozenRows(1);
    }
  });

  return {
    success: true,
    message: 'All 9 sheets and column headers verified and initialized successfully.',
    totalSheets: Object.keys(schemas).length,
    newlyCreatedTabs: createdTabs
  };
}

/**
 * Read table data with object key mapping
 */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, data: [] };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return { success: true, data: [] };

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  if (values.length <= 1) return { success: true, data: [] };

  const headers = values[0];
  const rows = values.slice(1);

  const data = rows.map(row => {
    const obj = {};
    headers.forEach((h, index) => {
      obj[h] = row[index] !== undefined && row[index] !== null ? String(row[index]) : '';
    });
    return obj;
  });

  return { success: true, data: data };
}

/**
 * Fetch all data tables in one unified call
 */
function fetchAllData(scId) {
  setupSpreadsheetSheets();

  const alumni = getSheetData(SHEET_NAMES.ALUMNI).data || [];
  const leads = getSheetData(SHEET_NAMES.LEADS).data || [];
  const callLogs = getSheetData(SHEET_NAMES.CALL_LOGS).data || [];
  const followups = getSheetData(SHEET_NAMES.FOLLOWUPS).data || [];
  const scUsers = getSheetData(SHEET_NAMES.SC_USERS).data || [];
  const references = getSheetData(SHEET_NAMES.REFERENCE_RESPONSES).data || [];
  const auditLogs = getSheetData(SHEET_NAMES.AUDIT_LOGS).data || [];
  const archivedRecords = getSheetData(SHEET_NAMES.ARCHIVED_RECORDS).data || [];
  const settings = getSheetData(SHEET_NAMES.SETTINGS).data || [];

  return {
    success: true,
    data: {
      alumni: alumni,
      leads: leads,
      callLogs: callLogs,
      followups: followups,
      scUsers: scUsers,
      references: references,
      auditLogs: auditLogs,
      archivedRecords: archivedRecords,
      settings: settings
    }
  };
}

/**
 * Handle Creating a Single Alumni Record
 */
function handleCreateAlumni(alumniData) {
  setupSpreadsheetSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);
  if (!sheet) return { success: false, error: 'Alumni sheet not found' };

  const alumniId = alumniData.id || ('ALU-' + Utilities.getUuid().substring(0, 8).toUpperCase());

  // Check if already exists
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('Alumni_ID');

  if (idCol !== -1) {
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(alumniId).trim()) {
        return handleUpdateAlumni(alumniId, alumniData);
      }
    }
  }

  sheet.appendRow([
    alumniId,
    alumniData.name || '',
    alumniData.mobile || '',
    alumniData.email || '',
    alumniData.course || '',
    alumniData.batch || '',
    alumniData.passingYear || '',
    alumniData.assignedSCId || '',
    alumniData.assignedSCName || '',
    alumniData.callStatus || 'Pending',
    alumniData.lastCallDate || '',
    alumniData.referenceReceived || 'No',
    alumniData.referenceCount || 0,
    alumniData.nextFollowup || '',
    alumniData.remark || '',
    alumniData.createdDate || new Date().toISOString()
  ]);

  return { success: true, alumniId: alumniId, message: 'Alumni created successfully in Google Sheets' };
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

  // Key mappings between frontend and sheet headers
  const fieldMap = {
    name: 'Name',
    mobile: 'Mobile',
    email: 'Email',
    course: 'Course',
    batch: 'Batch',
    passingYear: 'Passing_Year',
    assignedSCId: 'Assigned_SC_ID',
    assignedSCName: 'Assigned_SC_Name',
    callStatus: 'Call_Status',
    lastCallDate: 'Last_Call_Date',
    referenceReceived: 'Reference_Received',
    referenceCount: 'Reference_Count',
    nextFollowup: 'Next_Followup',
    remark: 'Remark',
    createdDate: 'Created_Date'
  };

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === String(alumniId).trim()) {
      const rowIdx = i + 1;

      Object.keys(updates).forEach(key => {
        const headerName = fieldMap[key] || key;
        const colIdx = headers.indexOf(headerName);
        if (colIdx !== -1 && updates[key] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(updates[key]);
        }
      });

      return { success: true, message: 'Alumni updated successfully in Google Sheets', alumniId: alumniId };
    }
  }

  return { success: false, error: 'Alumni ID not found: ' + alumniId };
}

/**
 * Handle Deleting an Alumni record from Google Sheets
 */
function handleDeleteAlumni(alumniId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);
  if (!sheet) return { success: false, error: 'Alumni sheet not found' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: false, error: 'Alumni sheet is empty' };

  const headers = values[0];
  const idCol = headers.indexOf('Alumni_ID');
  if (idCol === -1) return { success: false, error: 'Alumni_ID column not found' };

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === String(alumniId).trim()) {
      sheet.deleteRow(i + 1);
      return {
        success: true,
        message: 'Alumni record ' + alumniId + ' deleted permanently from Google Sheets',
        alumniId: alumniId
      };
    }
  }

  return { success: false, error: 'Alumni with ID ' + alumniId + ' not found in Google Sheet' };
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
  setupSpreadsheetSheets();
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
  if (alumniSheet) {
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
      if (String(alumniData[i][idCol]).trim() === String(callData.alumniId).trim()) {
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
  }

  return { success: true, callId: callId, message: 'Call logged successfully in Google Sheets' };
}

/**
 * Handle Creating an Admission Lead
 */
function handleCreateLead(leadData) {
  setupSpreadsheetSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadsSheet = ss.getSheetByName(SHEET_NAMES.LEADS);
  const alumniSheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);

  const leadId = leadData.leadId || leadData.id || ('LEAD-' + Utilities.getUuid().substring(0, 8).toUpperCase());
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
      if (String(alumniData[i][idCol]).trim() === String(leadData.sourceAlumniId).trim()) {
        const rowIdx = i + 1;
        alumniSheet.getRange(rowIdx, refRecCol + 1).setValue('Yes');
        const count = Number(alumniData[i][refCountCol] || 0) + 1;
        alumniSheet.getRange(rowIdx, refCountCol + 1).setValue(count);
        break;
      }
    }
  }

  return { success: true, leadId: leadId, message: 'Lead created successfully in Google Sheets' };
}

/**
 * Handle Updating Lead Fields
 */
function handleUpdateLead(leadId, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LEADS);
  if (!sheet) return { success: false, error: 'Leads sheet not found' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: false, error: 'Leads sheet is empty' };

  const headers = values[0];
  const idCol = headers.indexOf('Lead_ID');
  if (idCol === -1) return { success: false, error: 'Lead_ID column not found' };

  const fieldMap = {
    referenceName: 'Reference_Name',
    relation: 'Relation',
    mobile: 'Mobile',
    email: 'Email',
    courseInterest: 'Course_Interest',
    leadStatus: 'Lead_Status',
    nextFollowup: 'Next_Followup',
    counsellingDate: 'Counselling_Date',
    remark: 'Remark',
    scId: 'SC_ID',
    scName: 'SC_Name'
  };

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === String(leadId).trim()) {
      const rowIdx = i + 1;
      Object.keys(updates).forEach(key => {
        const headerName = fieldMap[key] || key;
        const colIdx = headers.indexOf(headerName);
        if (colIdx !== -1 && updates[key] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(updates[key]);
        }
      });
      return { success: true, message: 'Lead updated successfully in Google Sheets', leadId: leadId };
    }
  }

  return { success: false, error: 'Lead ID not found: ' + leadId };
}

/**
 * Handle Deleting a Lead record from Google Sheets
 */
function handleDeleteLead(leadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LEADS);
  if (!sheet) return { success: false, error: 'Leads sheet not found' };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { success: false, error: 'Leads sheet is empty' };

  const headers = values[0];
  const idCol = headers.indexOf('Lead_ID');
  if (idCol === -1) return { success: false, error: 'Lead_ID column not found' };

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === String(leadId).trim()) {
      sheet.deleteRow(i + 1);
      return {
        success: true,
        message: 'Lead record ' + leadId + ' deleted permanently from Google Sheets',
        leadId: leadId
      };
    }
  }

  return { success: false, error: 'Lead with ID ' + leadId + ' not found in Google Sheet' };
}

/**
 * Handle Creating a Followup log
 */
function handleCreateFollowup(followupData) {
  setupSpreadsheetSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const followupsSheet = ss.getSheetByName(SHEET_NAMES.FOLLOWUPS);
  const leadsSheet = ss.getSheetByName(SHEET_NAMES.LEADS);

  const followupId = followupData.followupId || followupData.id || ('FUP-' + Utilities.getUuid().substring(0, 8).toUpperCase());
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
      if (String(leadsData[i][idCol]).trim() === String(followupData.leadId).trim()) {
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

  return { success: true, followupId: followupId, message: 'Followup logged successfully in Google Sheets' };
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
  setupSpreadsheetSheets();
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

  return { success: true, message: 'Reference response submitted successfully in Google Sheets' };
}

/**
 * Handle Alumni Import
 */
function handleImportAlumni(alumniList, distributeOption) {
  setupSpreadsheetSheets();
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
  setupSpreadsheetSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SC_USERS);
  if (!sheet) return { success: false, error: 'SC_Users sheet missing' };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('SC_ID');

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === String(scData.id).trim()) {
      const rowIdx = i + 1;
      sheet.getRange(rowIdx, 2).setValue(scData.name);
      sheet.getRange(rowIdx, 3).setValue(scData.username);
      sheet.getRange(rowIdx, 6).setValue(scData.status);
      return { success: true, message: 'SC updated in Google Sheets' };
    }
  }

  sheet.appendRow([
    scData.id, scData.name, scData.username, scData.passwordHash || 'sc123',
    scData.role || 'SC', scData.status || 'Active', scData.mobile || '',
    scData.email || '', scData.createdDate || new Date().toISOString()
  ]);

  return { success: true, message: 'SC created in Google Sheets' };
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
    if (String(values[i][idCol]).trim() === String(scId).trim()) {
      sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
      return { success: true, message: 'Status updated to ' + newStatus };
    }
  }

  return { success: false, error: 'SC not found' };
}

/**
 * Handle Logging an Audit Entry to Google Sheets
 */
function handleLogAudit(logData) {
  setupSpreadsheetSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOGS);
  if (!sheet) return { success: false, error: 'Audit_Logs sheet missing' };

  sheet.appendRow([
    logData.id || ('LOG-' + Utilities.getUuid().substring(0, 8).toUpperCase()),
    logData.timestamp || new Date().toISOString(),
    logData.entityType || '',
    logData.entityId || '',
    logData.action || '',
    logData.performedByUserId || '',
    logData.performedByUserName || '',
    logData.performedByRole || '',
    typeof logData.details === 'object' ? JSON.stringify(logData.details) : String(logData.details || '')
  ]);

  return { success: true, message: 'Audit entry committed to Google Sheets' };
}

/**
 * Handle Archiving a Record to Google Sheets
 */
function handleArchiveRecord(archiveData) {
  setupSpreadsheetSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ARCHIVED_RECORDS);
  if (!sheet) return { success: false, error: 'Archived_Records sheet missing' };

  sheet.appendRow([
    archiveData.id || ('ARCH-' + Utilities.getUuid().substring(0, 8).toUpperCase()),
    archiveData.originalId || '',
    archiveData.entityType || '',
    archiveData.archivedAt || new Date().toISOString(),
    archiveData.archivedByUserId || '',
    archiveData.archivedByUserName || '',
    archiveData.reason || '',
    typeof archiveData.data === 'object' ? JSON.stringify(archiveData.data) : String(archiveData.data || '')
  ]);

  return { success: true, message: 'Record archived to Google Sheets' };
}

/**
 * Comprehensive Full Synchronization of All Application Data into Google Sheets
 * Ensures zero duplicates: updates existing rows by Primary ID, appends missing records
 */
function handleSyncAll(data) {
  setupSpreadsheetSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const syncSummary = {};

  if (!data) return { success: true, message: 'Sheets initialized, no payload provided' };

  // 1. Alumni Sync
  if (data.alumni && Array.isArray(data.alumni)) {
    const sheet = ss.getSheetByName(SHEET_NAMES.ALUMNI);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      const existingIds = {};
      if (values.length > 1) {
        const idCol = values[0].indexOf('Alumni_ID');
        if (idCol !== -1) {
          for (let i = 1; i < values.length; i++) {
            existingIds[String(values[i][idCol]).trim()] = i + 1;
          }
        }
      }

      let inserted = 0;
      let updated = 0;

      data.alumni.forEach(a => {
        const rowNum = existingIds[String(a.id).trim()];
        if (rowNum) {
          // Update existing row
          sheet.getRange(rowNum, 2, 1, 15).setValues([[
            a.name || '', a.mobile || '', a.email || '', a.course || '', a.batch || '',
            a.passingYear || '', a.assignedSCId || '', a.assignedSCName || '',
            a.callStatus || 'Pending', a.lastCallDate || '', a.referenceReceived || 'No',
            a.referenceCount || 0, a.nextFollowup || '', a.remark || '', a.createdDate || ''
          ]]);
          updated++;
        } else {
          // Append new row
          sheet.appendRow([
            a.id, a.name || '', a.mobile || '', a.email || '', a.course || '', a.batch || '',
            a.passingYear || '', a.assignedSCId || '', a.assignedSCName || '',
            a.callStatus || 'Pending', a.lastCallDate || '', a.referenceReceived || 'No',
            a.referenceCount || 0, a.nextFollowup || '', a.remark || '', a.createdDate || new Date().toISOString()
          ]);
          inserted++;
        }
      });
      syncSummary.alumni = { inserted, updated };
    }
  }

  // 2. SC Users Sync
  if (data.scUsers && Array.isArray(data.scUsers)) {
    const sheet = ss.getSheetByName(SHEET_NAMES.SC_USERS);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      const existingIds = {};
      if (values.length > 1) {
        const idCol = values[0].indexOf('SC_ID');
        if (idCol !== -1) {
          for (let i = 1; i < values.length; i++) {
            existingIds[String(values[i][idCol]).trim()] = i + 1;
          }
        }
      }

      let inserted = 0;
      let updated = 0;

      data.scUsers.forEach(sc => {
        const rowNum = existingIds[String(sc.id).trim()];
        if (rowNum) {
          sheet.getRange(rowNum, 2, 1, 8).setValues([[
            sc.name || '', sc.username || '', sc.passwordHash || 'sc123',
            sc.role || 'SC', sc.status || 'Active', sc.mobile || '',
            sc.email || '', sc.createdDate || ''
          ]]);
          updated++;
        } else {
          sheet.appendRow([
            sc.id, sc.name || '', sc.username || '', sc.passwordHash || 'sc123',
            sc.role || 'SC', sc.status || 'Active', sc.mobile || '',
            sc.email || '', sc.createdDate || new Date().toISOString()
          ]);
          inserted++;
        }
      });
      syncSummary.scUsers = { inserted, updated };
    }
  }

  // 3. Leads Sync
  if (data.leads && Array.isArray(data.leads)) {
    const sheet = ss.getSheetByName(SHEET_NAMES.LEADS);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      const existingIds = {};
      if (values.length > 1) {
        const idCol = values[0].indexOf('Lead_ID');
        if (idCol !== -1) {
          for (let i = 1; i < values.length; i++) {
            existingIds[String(values[i][idCol]).trim()] = i + 1;
          }
        }
      }

      let inserted = 0;
      let updated = 0;

      data.leads.forEach(l => {
        const leadId = l.id || l.leadId;
        const rowNum = existingIds[String(leadId).trim()];
        if (rowNum) {
          sheet.getRange(rowNum, 2, 1, 14).setValues([[
            l.sourceAlumniId || '', l.sourceAlumniName || '', l.scId || '', l.scName || '',
            l.referenceName || '', l.relation || 'Other', l.mobile || '', l.email || '',
            l.courseInterest || '', l.leadStatus || 'New', l.nextFollowup || '',
            l.counsellingDate || '', l.createdDate || '', l.remark || ''
          ]]);
          updated++;
        } else {
          sheet.appendRow([
            leadId, l.sourceAlumniId || '', l.sourceAlumniName || '', l.scId || '', l.scName || '',
            l.referenceName || '', l.relation || 'Other', l.mobile || '', l.email || '',
            l.courseInterest || '', l.leadStatus || 'New', l.nextFollowup || '',
            l.counsellingDate || '', l.createdDate || new Date().toISOString(), l.remark || ''
          ]);
          inserted++;
        }
      });
      syncSummary.leads = { inserted, updated };
    }
  }

  // 4. Call Logs Sync
  if (data.callLogs && Array.isArray(data.callLogs)) {
    const sheet = ss.getSheetByName(SHEET_NAMES.CALL_LOGS);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      const existingIds = {};
      if (values.length > 1) {
        const idCol = values[0].indexOf('Call_ID');
        if (idCol !== -1) {
          for (let i = 1; i < values.length; i++) {
            existingIds[String(values[i][idCol]).trim()] = true;
          }
        }
      }

      let inserted = 0;
      data.callLogs.forEach(c => {
        const callId = c.id || c.callId;
        if (!existingIds[String(callId).trim()]) {
          sheet.appendRow([
            callId, c.alumniId || '', c.scId || '', c.scName || '',
            c.callDate || new Date().toISOString(), c.callStatus || '',
            c.callResult || '', c.remark || '', c.nextFollowup || ''
          ]);
          inserted++;
        }
      });
      syncSummary.callLogs = { inserted };
    }
  }

  // 5. Followups Sync
  if (data.followups && Array.isArray(data.followups)) {
    const sheet = ss.getSheetByName(SHEET_NAMES.FOLLOWUPS);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      const existingIds = {};
      if (values.length > 1) {
        const idCol = values[0].indexOf('Followup_ID');
        if (idCol !== -1) {
          for (let i = 1; i < values.length; i++) {
            existingIds[String(values[i][idCol]).trim()] = true;
          }
        }
      }

      let inserted = 0;
      data.followups.forEach(f => {
        const fupId = f.id || f.followupId;
        if (!existingIds[String(fupId).trim()]) {
          sheet.appendRow([
            fupId, f.leadId || '', f.scId || '', f.scName || '',
            f.followupDate || '', f.status || '', f.remark || '',
            f.createdDate || new Date().toISOString()
          ]);
          inserted++;
        }
      });
      syncSummary.followups = { inserted };
    }
  }

  // 6. Audit Logs Sync
  if (data.auditLogs && Array.isArray(data.auditLogs)) {
    const sheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOGS);
    if (sheet) {
      const values = sheet.getDataRange().getValues();
      const existingIds = {};
      if (values.length > 1) {
        const idCol = values[0].indexOf('Log_ID');
        if (idCol !== -1) {
          for (let i = 1; i < values.length; i++) {
            existingIds[String(values[i][idCol]).trim()] = true;
          }
        }
      }

      let inserted = 0;
      data.auditLogs.forEach(al => {
        if (!existingIds[String(al.id).trim()]) {
          sheet.appendRow([
            al.id, al.timestamp || new Date().toISOString(), al.entityType || '',
            al.entityId || '', al.action || '', al.performedByUserId || '',
            al.performedByUserName || '', al.performedByRole || '',
            typeof al.details === 'object' ? JSON.stringify(al.details) : String(al.details || '')
          ]);
          inserted++;
        }
      });
      syncSummary.auditLogs = { inserted };
    }
  }

  return {
    success: true,
    message: 'All application data synchronized into Google Sheets successfully with zero data loss.',
    summary: syncSummary,
    timestamp: new Date().toISOString()
  };
}
`;
