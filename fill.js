const fs = require('fs');
const { getAuthClients, fillSheet } = require('./google');
const keyFilePath = './zakyd-110698-d3f251d8ebcf.json';
const spreadsheetId = '1xamBiK7OK6u5uOFZ_fofs14LWcCBd9C7Syu7NhW2WFc';
const sheetName = 'Sheet1';
const result = fs.readFileSync('result.txt', 'utf-8').split('\n').filter(each => !!each).map(line => JSON.parse(line));

const main = async () => {
    console.log(result);
    console.log(result.length);
    const {
        sheets
    } = await getAuthClients(keyFilePath);

    await fillSheet(sheets, spreadsheetId, sheetName, 'A2', result);
    console.log('DONE');

}

main();