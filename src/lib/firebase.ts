import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace this with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCWHwuuLQJJx_AbetLn_gbICSSAj6ZFYAg",
    authDomain: "doa40-d67c5.firebaseapp.com",
    projectId: "doa40-d67c5",
    storageBucket: "doa40-d67c5.firebasestorage.app",
    messagingSenderId: "629293598105",
    appId: "1:629293598105:web:40ad0e5b9acde960b37f08"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
