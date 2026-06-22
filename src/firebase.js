import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBgwxWjDAT395AIy0EE1kwkiJKwtHXdnLk",
  authDomain: "gen-lang-client-0795348370.firebaseapp.com",
  projectId: "gen-lang-client-0795348370",
  storageBucket: "gen-lang-client-0795348370.firebasestorage.app",
  messagingSenderId: "667966088073",
  appId: "1:667966088073:web:bc901bd5525e65c4d9f758"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
