import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const app = initializeApp();
getAuth(app).listUsers(1).then(res => console.log(res.users.length)).catch(e => console.error(e.message));
