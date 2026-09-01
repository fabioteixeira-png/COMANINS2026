import { collection, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "./src/lib/firebase"; // this will fail if not compiled
