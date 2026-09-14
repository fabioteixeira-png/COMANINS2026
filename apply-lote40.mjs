import fs from 'fs';
const patchPath = 'COMANINS_LOTE_40_ETIQUETA_BPC_IMPRESSAO_36X36.patch';
const patchContent = fs.readFileSync(patchPath, 'utf8');
const files = patchContent.split(/^diff --git a\//m).slice(1);
for (const filePatch of files) {
    const lines = filePatch.split('\n');
    const fileName = lines[0].split(' b/')[0];
    console.log(`Applying patch to ${fileName}...`);
    let content = fs.readFileSync(fileName, 'utf8');
    const chunks = filePatch.split(/^@@ /m).slice(1);
    for (const chunk of chunks) {
        const chunkLines = chunk.split('\n');
        chunkLines[0] = chunkLines[0].replace(/.*@@ /, '');
        let searchStr = '';
        let replaceStr = '';
        for (let i = 1; i < chunkLines.length; i++) {
            const line = chunkLines[i];
            if (line.startsWith('-')) {
                searchStr += line.substring(1) + '\n';
            } else if (line.startsWith('+')) {
                replaceStr += line.substring(1) + '\n';
            } else if (line.startsWith(' ')) {
                searchStr += line.substring(1) + '\n';
                replaceStr += line.substring(1) + '\n';
            } else if (line === '') {
            }
        }
        searchStr = searchStr.replace(/\n$/, '');
        replaceStr = replaceStr.replace(/\n$/, '');
        if (content.includes(searchStr)) {
            content = content.replace(searchStr, replaceStr);
            console.log(`  Chunk applied successfully.`);
        } else {
            console.error(`  Failed to apply chunk! Search string not found.`);
        }
    }
    fs.writeFileSync(fileName, content);
}
