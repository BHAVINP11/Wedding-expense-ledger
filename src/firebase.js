import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCzAmkj-vk1Wdo8YGNwRfVxzwrBrgfdW8E",
  authDomain: "wedding-tracker-d2aab-dcac1.firebaseapp.com",
  projectId: "wedding-tracker-d2aab-dcac1",
  storageBucket: "wedding-tracker-d2aab-dcac1.firebasestorage.app",
  messagingSenderId: "29733100407",
  appId: "1:29733100407:web:644ceafd7f346f408ddf72"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export default app
