const fs = require('fs');

let content = fs.readFileSync('src/lib/firebase.ts', 'utf-8');

// Replace:
// if (!snapshot.empty) {
//   ... code ...
// }
// with:
// if (!snapshot.empty) {
//   ... code ...
// } else {
//   callback([]);
// }

// For each function let's manually patch using regex or exact replacements.

// clients
content = content.replace(
`      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Client));
          onData(list);
        }
      }, onError);`,
`      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Client));
        onData(list);
      }, onError);`);

// instruments
content = content.replace(
`      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Instrument));
          onData(list);
        }
      }, onError);`,
`      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Instrument));
        onData(list);
      }, onError);`);

// calibrationReports
content = content.replace(
`      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalibrationReport));
          onData(list);
        }
      }, onError);`,
`      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalibrationReport));
        onData(list);
      }, onError);`);

// employeeBirthdays
content = content.replace(
`  return onSnapshot(q, async (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeBirthday));
      setLocalCache('employeeBirthdays', list);
      callback(list);
    }
  }, (err) => {`,
`  return onSnapshot(q, async (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeBirthday));
    setLocalCache('employeeBirthdays', list);
    callback(list);
  }, (err) => {`);

// medical_exams
content = content.replace(
`  return onSnapshot(q, async (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MedicalExam));
      setLocalCache('medical_exams', list);
      callback(list);
    }
  }, (err) => {`,
`  return onSnapshot(q, async (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MedicalExam));
    setLocalCache('medical_exams', list);
    callback(list);
  }, (err) => {`);

// calibrationAuditLogs
content = content.replace(
`  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalibrationAuditLog));
      list.sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
      setLocalCache('calibrationAuditLogs', list);
      callback(list);
    }
  }, (err) => {`,
`  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalibrationAuditLog));
    list.sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
    setLocalCache('calibrationAuditLogs', list);
    callback(list);
  }, (err) => {`);

// rncReports
content = content.replace(
`  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as RncReport));
      setLocalCache('rncReports', list);
      callback(list);
    }
  }, (err) => {`,
`  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as RncReport));
    setLocalCache('rncReports', list);
    callback(list);
  }, (err) => {`);

fs.writeFileSync('src/lib/firebase.ts', content);
console.log("Patched all snapshot empty blocks!");
