import fs from 'fs';

function applyPatch(patchPath) {
    const patchContent = fs.readFileSync(patchPath, 'utf8');
    const files = patchContent.split(/^diff --git a\//m).slice(1);
    
    for (const filePatch of files) {
        const lines = filePatch.split('\n');
        const fileName = lines[0].split(' b/')[0];
        console.log(`Applying patch to ${fileName}...`);
        
        if (!fs.existsSync(fileName)) {
            console.error(`File ${fileName} does not exist!`);
            continue;
        }
        
        let content = fs.readFileSync(fileName, 'utf8');
        
        const chunks = filePatch.split(/^@@ /m).slice(1);
        for (const chunk of chunks) {
            const chunkLines = chunk.split('\n');
            // Remove the chunk header info e.g. "-435,6 +435,52 @@ service cloud.firestore {"
            chunkLines[0] = chunkLines[0].replace(/.*@@ /, '');
            
            // Build the search and replace strings
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
                    // empty line is usually a context line without the space prefix in some formats
                    // wait, git diff adds a space for empty lines, but let's be safe
                    // Actually, if it's strictly empty, we can treat it as empty context
                    // However, trailing newline of chunk
                }
            }
            
            // Remove the trailing newline
            searchStr = searchStr.replace(/\n$/, '');
            replaceStr = replaceStr.replace(/\n$/, '');
            
            // Try to find searchStr in content
            if (content.includes(searchStr)) {
                content = content.replace(searchStr, replaceStr);
                console.log(`  Chunk applied successfully.`);
            } else {
                console.error(`  Failed to apply chunk! Search string not found.`);
                // fallback: try ignoring exact whitespace at start/end
                const trimmedSearch = searchStr.trim();
                if (content.includes(trimmedSearch)) {
                     console.log('  Applied chunk using trimmed search string.');
                     content = content.replace(trimmedSearch, replaceStr.trim());
                } else {
                     console.log('  --- SEARCH STRING ---');
                     console.log(searchStr);
                     console.log('  ---------------------');
                }
            }
        }
        fs.writeFileSync(fileName, content);
    }
}

applyPatch('COMANINS_LOTE_38_CORRECAO_ADMINISTRATIVA_INSTRUMENTO.patch');
