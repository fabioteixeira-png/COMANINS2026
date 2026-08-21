const fs = require('fs');

let content = fs.readFileSync('src/lib/firebase.ts', 'utf-8');

const targetStr = `  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalibrationAuditLog));
      list.sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
      setLocalCache('calibrationAuditLogs', list);
      callback(list);
    }
  });`;

const newStr = `  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalibrationAuditLog));
    list.sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
    setLocalCache('calibrationAuditLogs', list);
    callback(list);
  });`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/lib/firebase.ts', content);
console.log("Patched syncCalibrationAuditLogs");
