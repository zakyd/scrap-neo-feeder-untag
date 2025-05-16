const {
    google
} = require('googleapis');
const path = require('path');

// 🔐 Create authenticated clients
async function getAuthClients(keyFilePath) {
    const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });

    const authClient = await auth.getClient();
    const drive = google.drive({
        version: 'v3',
        auth: authClient
    });
    const sheets = google.sheets({
        version: 'v4',
        auth: authClient
    });

    return {
        drive,
        sheets
    };
}

// 📁 Create folder inside another folder
async function createFolder(drive, folderName, parentFolderId) {
    const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
    };

    const res = await drive.files.create({
        resource: metadata,
        fields: 'id, name',
    });

    return res.data.id;
}

// 📄 Create spreadsheet and return its ID
async function createSpreadsheet(sheets, title) {
    const res = await sheets.spreadsheets.create({
        resource: {
            properties: {
                title: title,
            },
        },
    });

    return res.data.spreadsheetId;
}

// 📂 Move file (spreadsheet) into folder
async function moveFileToFolder(drive, fileId, newParentFolderId) {
    const file = await drive.files.get({
        fileId,
        fields: 'parents',
    });

    const previousParents = file.data.parents.join(',');

    await drive.files.update({
        fileId,
        addParents: newParentFolderId,
        removeParents: previousParents,
        fields: 'id, parents',
    });
}

async function copySpreadsheet(drive, spreadsheetId, spreadsheetName, targetFolderId) {
  const response = await drive.files.copy({
    fileId: spreadsheetId,
    requestBody: {
      name: spreadsheetName,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [targetFolderId],
    },
  });

  return response.data.id;
}

async function copySheet(sheets, targetSheetName, sourceSpreadsheetId, targetSpreadsheetId, sourceSheetId = 0) {
    const response = await sheets.spreadsheets.sheets.copyTo({
        spreadsheetId: sourceSpreadsheetId,
        sheetId: sourceSheetId,
        requestBody: {
            destinationSpreadsheetId: targetSpreadsheetId,
        },
    });

    const sheetId = response.data.sheetId;
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: targetSpreadsheetId,
        requestBody: {
            requests: [
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId,
                            title: targetSheetName,
                        },
                        fields: 'title',
                    },
                },
            ],
        },
    });

    return sheetId;
}

async function getSheets(sheets, spreadsheetId) {
    const response = await sheets.spreadsheets.get({
        spreadsheetId,
    });

    const sheetList = response.data.sheets.map(sheet => ({
        title: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
    }));

    return sheetList;
}

async function renameFolder(drive, folderId, newName) {
    await drive.files.update({
        fileId: folderId,
        resource: {
            name: newName
        },
        fields: 'id, name',
    });
}

/**
 * range: "'Data Pengguna'!A1" 
 * values: [['Nama', 'Email', 'Status'], ['Rina', 'rina@example.com', 'Aktif'], ['Doni', 'doni@example.com', 'Nonaktif']]
 */
async function fillSheet(sheets, spreadsheetId, sheetName, row, values, valueInputOption = 'USER_ENTERED') {
    const range = `'${sheetName}'!${row}`;
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption,
        requestBody: { values },
    });
}

async function deleteSheet(sheets, spreadsheetId, sheetId) {
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    deleteSheet: {
                        sheetId,
                    },
                },
            ],
        },
    });
}

/**
 * Example usage:
 */
async function runWorkflow({
    keyFilePath,
    parentFolderId,
    newFolderName,
    spreadsheetTitle,
    renamedFolderName,
}) {
    const {
        drive,
        sheets
    } = await getAuthClients(keyFilePath);

    const newFolderId = await createFolder(drive, newFolderName, parentFolderId);
    console.log(`✅ Folder created: ${newFolderName} (${newFolderId})`);

    const spreadsheetId = await createSpreadsheet(sheets, spreadsheetTitle);
    console.log(`✅ Spreadsheet created: ${spreadsheetTitle} (${spreadsheetId})`);

    await moveFileToFolder(drive, spreadsheetId, newFolderId);
    console.log(`✅ Spreadsheet moved to folder.`);

    await renameFolder(drive, newFolderId, renamedFolderName);
    console.log(`✅ Folder renamed to: ${renamedFolderName}`);

    return {
        folderId: newFolderId,
        spreadsheetId
    };
}

module.exports = {
    getAuthClients,
    createFolder,
    createSpreadsheet,
    moveFileToFolder,
    renameFolder,
    copySpreadsheet,
    copySheet,
    getSheets,
    fillSheet,
    deleteSheet,
};
