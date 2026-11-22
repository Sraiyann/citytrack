
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCic3L22WcBZqBLrdfCHGL8VNXuASgfR9g",
  authDomain: "citytrack-361aa.firebaseapp.com",
  projectId: "citytrack-361aa",
  storageBucket: "citytrack-361aa.firebasestorage.app",
  messagingSenderId: "1038443441094",
  appId: "1:1038443441094:web:063d8c8f647d7c9d83e0c7",
  measurementId: "G-YQ83HQXE51"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
