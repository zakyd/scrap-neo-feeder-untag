const fs = require('fs');

const { getAuthClients, fillSheet } = require('./google');
const { host, token, keyFilePath, spreadsheetId, sheetName, filter: setFilter, startRow, startColumn } = require('./config');

const main = async () => {
    fs.writeFileSync('result.txt', '');
    const {
        sheets
    } = await getAuthClients(keyFilePath);

    let idx = 1;
    const params = new URLSearchParams({});
    params.append('pagination', JSON.stringify({
        sortBy: 'st.nm_smt',
        descending: true,
        page: 1,
        rowsPerPage: 1000,
        rowsNumber: 0
    }));
    params.append('filter', '');
    params.append('columnSearch[]', 'nm_lemb');
    params.append('columnSearch[]', 'judul_akt_mhs');
    params.append('setFilter', JSON.stringify(setFilter));
    params.append('extendFilter', JSON.stringify({
        filter_sync:'semua'
    }));
    const response = await fetch(`${host}/ws/nilaiaktmhs/index?${params.toString()}`, {
        headers: {
            'Authorization': token,
        },
    });
    const data = await response.json();
    if (data) {
        const result = [];
        const [activities, rows] = data;
        for (let i = 0; i < activities.length; i++) {
            console.log('ACTIVITY', i + 1, 'of', activities.length);
            
            const activity = activities[i];
            const respDetail = await fetch(`${host}/ws/nilaiaktmhs/edit/${activity.id_akt_mhs}`, {
                headers: {
                    'Authorization': token,
                },
            });
            const dataDetail = await respDetail.json();
            if (dataDetail) {
                const { data: activityDetailArr, anggota: members } = dataDetail;
                const [activityDetail] = activityDetailArr;
                if (members && members?.length) {
                    for (let j = 0; j < members.length; j++) {
                        const member = members[j];
                        // /ws/nilaiaktmhs/transfermatkul/${member.id_ang_akt_mhs}
                        const respMember = await fetch(`${host}/ws/nilaiaktmhs/transfermatkul/${member.id_ang_akt_mhs}`, {
                            headers: {
                                'Authorization': token,
                            },
                        });
                        const dataMember = await respMember.json();
                        if (dataMember) {
                            const { anggota: memberData, konversi: convertions } = dataMember;
                            if (convertions && convertions?.length) {
                                for (let k = 0; k < convertions.length; k++) {
                                    const convertion = convertions[k];

                                    const values = [
                                        '',
                                        activityDetail.nm_lemb,
                                        activityDetail.nm_jns_akt_mhs,
                                        activityDetail.judul_akt_mhs,
                                        member.nipd,
                                        member.nm_pd,
                                        activityDetail.nm_smt,
                                        convertion.nm_mk,
                                        parseInt(convertion.sks_mk),
                                        parseFloat(convertion.nilai_angka),
                                        convertion.nilai_huruf.trim(),
                                        parseFloat(convertion.nilai_indeks),
                                    ];
                                    console.log(idx, JSON.stringify(values));
                                    result.push(values);
                                    fs.appendFileSync('result.txt', JSON.stringify(values) + '\n');

                                    idx++;
                                }
                            }
                        }
                    }
                }
            }
        }

        await fillSheet(sheets, spreadsheetId, sheetName, `${startColumn}${startRow}`, result);
    }
    console.log('DONE');

}

main();