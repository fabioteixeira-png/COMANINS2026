export const getFirestore = (app?: any, dbId?: string) => ({});

export function collection(db: any, name: string) {
  return { _isCollection: true, name };
}

export function doc(...args: any[]) { const [dbOrCol, colOrId, id] = args; let collectionName = typeof dbOrCol === "object" && dbOrCol._isCollection ? dbOrCol : colOrId; let docId = typeof dbOrCol === "object" && dbOrCol._isCollection ? colOrId : id;
  if (typeof collectionName === 'object' && collectionName._isCollection) {
    return { _isDoc: true, collectionName: collectionName.name, id: docId };
  }
  return { _isDoc: true, collectionName, id: docId };
}

export function query(col: any, ...args: any[]) {
  return { ...col, args };
}

export function orderBy(field: string, dir: string = 'asc') {
  return { _type: 'orderBy', field, dir };
}

export function limit(n: number) {
  return { _type: 'limit', n };
}

export async function getDocs(q: any) {
  try {
    let url = `/api/fs/${q.name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    
    // Sort in memory if orderBy was passed
    if (q.args) {
      const whereArgs = q.args.filter((a: any) => a._type === 'where');
      for (const w of whereArgs) {
        for (let i = data.length - 1; i >= 0; i--) {
          const v = data[i].data[w.field];
          if (w.op === '==') {
            if (v !== w.value) data.splice(i, 1);
          } else if (w.op === 'array-contains') {
            if (!Array.isArray(v) || !v.includes(w.value)) data.splice(i, 1);
          } else if (w.op === 'in') {
            if (!Array.isArray(w.value) || !w.value.includes(v)) data.splice(i, 1);
          } else if (w.op === '>') {
            if (v <= w.value) data.splice(i, 1);
          } else if (w.op === '<') {
            if (v >= w.value) data.splice(i, 1);
          } else if (w.op === '>=') {
            if (v < w.value) data.splice(i, 1);
          } else if (w.op === '<=') {
            if (v > w.value) data.splice(i, 1);
          }
        }
      }
      
      const orderByArg = q.args.find((a: any) => a._type === 'orderBy');
      if (orderByArg) {
        data.sort((a: any, b: any) => {
          const v1 = a.data[orderByArg.field];
          const v2 = b.data[orderByArg.field];
          if (v1 < v2) return orderByArg.dir === 'asc' ? -1 : 1;
          if (v1 > v2) return orderByArg.dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
      const limitArg = q.args.find((a: any) => a._type === 'limit');
      if (limitArg && data.length > limitArg.n) {
        data.length = limitArg.n;
      }
    }

    const docs = data.map((d: any) => ({
      id: d.id,
      data: () => d.data,
      exists: () => true
    }));
    return {
      empty: docs.length === 0,
      docs,
      forEach: (callback: (doc: any) => void) => docs.forEach(callback)
    };
  } catch (err) {
    // console.warn("fake-firestore fetch error:", err);
    return { empty: true, docs: [], forEach: () => {} };
  }
}

export async function getDoc(docRef: any) {
  try {
    const res = await fetch(`/api/fs/${docRef.collectionName}/${docRef.id}`);
    if (res.status === 404) return { exists: () => false, data: () => null, id: docRef.id };
    if (!res.ok) throw new Error('Fetch failed');
    const d = await res.json();
    return { exists: () => true, data: () => d.data, id: d.id };
  } catch (err) {
    // console.warn("fake-firestore fetch getDoc error:", err);
    return { exists: () => false, data: () => null, id: docRef.id };
  }
}

export async function setDoc(docRef: any, data: any, options?: any) {
  await fetch(`/api/fs/${docRef.collectionName}/${docRef.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function addDoc(colRef: any, data: any) {
  const res = await fetch(`/api/fs/${colRef.name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  return { id: json.id };
}

export async function updateDoc(docRef: any, data: any) {
  await fetch(`/api/fs/${docRef.collectionName}/${docRef.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function deleteDoc(docRef: any) {
  await fetch(`/api/fs/${docRef.collectionName}/${docRef.id}`, {
    method: 'DELETE'
  });
}

export function onSnapshot(q: any, onNext: (snapshot: any) => void, onError?: (err: any) => void) {
  let isCancelled = false;
  
  const fetchAndCall = async () => {
    if (isCancelled) return;
    try {
      let res;
      if (q._isDoc) {
        res = await getDoc(q);
      } else {
        res = await getDocs(q);
      }
      if (isCancelled) return;
      onNext(res);
    } catch(e) {
      if (isCancelled) return;
      onError && onError(e);
    }
  };
  
  fetchAndCall();
  const interval = setInterval(fetchAndCall, 5000);
  
  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}
export const deleteField = () => {}; export const startAfter = (...args: any[]) => {}; export type DocumentData = any; export type QueryDocumentSnapshot<T = DocumentData> = any;
export function where(field: string, op: string, value: any) {
  return { _type: 'where', field, op, value };
}
