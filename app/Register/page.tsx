"use client";

import React, { useState, useEffect } from "react";
import { FaCopy, FaBars } from "react-icons/fa";
import QRCode from "qrcode.react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { getAnalytics, logEvent, Analytics, isSupported } from "firebase/analytics";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDYyK2hE1OtMwpKnycaYMrQFcQ-GMSabvI",
  authDomain: "urldoc.firebaseapp.com",
  projectId: "urldoc",
  storageBucket: "urldoc.appspot.com",
  messagingSenderId: "1067418314404",
  appId: "1:1067418314404:web:8e19aad69c24f2bc72a831",
  measurementId: "G-HB6KNZ9MCT",
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

let analytics: Analytics | undefined;

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    logEvent(analytics, 'page_view');
  }
});

export default function Home() {
  const [url, setUrl] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (url.trim() === "") {
      setError("URL is required");
      return;
    }

    setError(null);

    try {
      const shortUrl = await saveUrlToFirestore(url, customUrl);
      setShortenedUrl(shortUrl);
      if (analytics) {
        logEvent(analytics, 'url_shortened', { url, shortUrl });
      }
    } catch (err) {
      setError("An error occurred while shortening the URL.");
    }
  };

  const saveUrlToFirestore = async (url: string, customUrl: string): Promise<string> => {
    const shortUrl = `https://urldoc/${customUrl || "shortened"}`;
    const urlRef = doc(firestore, "urls", customUrl || "shortened");

    await setDoc(urlRef, {
      originalUrl: url,
      shortenedUrl: shortUrl,
    });

    return shortUrl;
  };

  const handleCopy = () => {
    if (shortenedUrl) {
      navigator.clipboard.writeText(shortenedUrl)
        .then(() => alert('Link copied to clipboard'))
        .catch(err => alert('Failed to copy link'));
    }
  };

  const handleRedirect = async () => {
    if (typeof window !== "undefined") {
      const urlRef = doc(firestore, "urls", customUrl || "shortened");
      const urlDoc = await getDoc(urlRef);

      if (urlDoc.exists()) {
        const originalUrl = urlDoc.data()?.originalUrl;
        window.location.href = originalUrl;
      } else {
        alert("URL not found");
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError("Authentication failed. Please check your credentials.");
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setAuthError("Google sign-in failed.");
    }
  };

  const handleForgotPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent.');
    } catch (err) {
      setAuthError("Failed to send password reset email.");
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 style={styles.heading}>
        <span style={{ color: '#0070f3' }}>Url</span>Doc
      </h1>

      {/* Burger Menu */}
      <div style={{ position: 'relative' }}>
        <FaBars onClick={toggleMenu} style={styles.burgerIcon} />
        {menuOpen && (
          <div style={styles.menu}>
            <a href="#shorten-url" onClick={toggleMenu} style={styles.menuItem}>Shorten URL</a>
            <a href="#qrcode" onClick={toggleMenu} style={styles.menuItem}>QR Code</a>
          </div>
        )}
      </div>

      {/* Authentication Form */}
      <form onSubmit={handleAuthSubmit} style={styles.authForm}>
        <div style={styles.inputGroup}>
          <label htmlFor="email" style={styles.label}>Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="Your email"
          />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="password" style={styles.label}>Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Your password"
          />
        </div>
        {authError && <p style={styles.errorText}>{authError}</p>}
        <button type="submit" style={styles.button}>
          {authMode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
        <p style={styles.switchMode} onClick={switchAuthMode}>
          {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </p>
        {authMode === 'login' && (
          <p style={styles.forgotPassword} onClick={handleForgotPassword}>
            Forgot Password?
          </p>
        )}
        <button type="button" onClick={handleGoogleSignIn} style={styles.button}>
          Sign In with Google
        </button>
      </form>

      {/* Form for URL shortening */}
      <form onSubmit={handleSubmit} style={styles.form} id="shorten-url">
        <div style={styles.inputGroup}>
          <label htmlFor="url" style={styles.label}>Enter URL:</label>
          <input required
            type="text"
            id="url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={styles.input}
            placeholder="https://example.com"
          />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="customUrl" style={styles.label}>Custom Alias (optional):</label>
          <input
            type="text"
            id="customUrl"
            name="customUrl"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            style={styles.input}
            placeholder="custom-alias"
          />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="shortenedUrl" style={styles.label}>Shortened URL:</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              id="shortenedUrl"
              name="shortenedUrl"
              value={shortenedUrl || ""}
              readOnly
              style={{ ...styles.input, color: "#000" }} // Output color set to black
              placeholder="Shortened URL will appear here"
            />
            <FaCopy onClick={handleCopy} style={{ cursor: 'pointer', marginLeft: '10px' }} />
          </div>
        </div>
        <button type="submit" style={styles.button}>
          Shorten URL
        </button>
        {shortenedUrl && (
          <div id="qrcode">
            <QRCode value={shortenedUrl} size={128} style={{ marginTop: '20px' }} />
            <p>Hold or right-click to save image</p>
            <button onClick={handleRedirect} style={{ ...styles.button, marginTop: '10px' }}>
              Go to Link
            </button>
          </div>
        )}
      </form>
    </main>
  );
}

// Internal CSS styles
const styles = {
  heading: {
    fontSize: "24px",
    fontWeight: "bold",
    letterSpacing: "2px",
    margin: "3%",
  },
  authForm: {
    width: "100%",
    maxWidth: "400px",
    margin: "20px auto",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
  },
  inputGroup: {
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  button: {
    display: "block",
    width: "100%",
    padding: "10px",
    borderRadius: "4px",
    backgroundColor: "#0070f3",
    color: "#fff",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
  },
  errorText: {
    color: "red",
    marginBottom: "10px",
  },
  switchMode: {
    cursor: "pointer",
    color: "#0070f3",
    textAlign: "center" as "center", // Adjusted to correct type
    marginTop: "10px",
  },
  forgotPassword: {
    cursor: "pointer",
    color: "#0070f3",
    textAlign: "center" as "center", // Adjusted to correct type
    marginTop: "10px",
  },
  burgerIcon: {
    cursor: "pointer",
    fontSize: "24px",
    marginLeft: "3%",
  },
  menu: {
    position: "absolute" as "absolute",
    top: "30px",
    right: "0",
    backgroundColor: "#fff",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
    borderRadius: "4px",
    zIndex: 1000,
  },
  menuItem: {
    padding: "10px 20px",
    display: "block",
    textDecoration: "none",
    color: "#000",
    borderBottom: "1px solid #ccc",
    cursor: "pointer",
  },
  form: {
    width: "100%",
    maxWidth: "500px",
    margin: "20px auto",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  },
};
