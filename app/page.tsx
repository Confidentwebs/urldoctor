"use client";

import { useState, useEffect } from "react";
import { FaCopy, FaBars } from "react-icons/fa";
import QRCode from "qrcode.react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getAnalytics, logEvent, Analytics, isSupported } from "firebase/analytics";

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

let analytics: Analytics | undefined;

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    logEvent(analytics, "page_view");
  }
});

export default function Home() {
  const [url, setUrl] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [urlHistory, setUrlHistory] = useState<any[]>([]);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUrlHistory(currentUser.uid);
      }
    });
  }, []);

  const fetchUrlHistory = async (userId: string) => {
    const q = query(collection(firestore, "urls"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const urls: any[] = [];
    querySnapshot.forEach((doc) => {
      urls.push(doc.data());
    });
    setUrlHistory(urls);
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUrlHistory([]);
  };

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
        logEvent(analytics, "url_shortened", { url, shortUrl });
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
      userId: user?.uid,
    });

    return shortUrl;
  };

  const handleCopy = () => {
    if (shortenedUrl) {
      navigator.clipboard.writeText(shortenedUrl)
        .then(() => alert("Link copied to clipboard"))
        .catch((err) => alert("Failed to copy link"));
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

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 style={{ fontSize: "24px", fontWeight: "bold", letterSpacing: "2px", margin: "3%" }}>
        <span style={{ color: "#0070f3" }}>Url</span>Doc
      </h1>

      {/* Burger Menu */}
      <div style={{ position: "relative" }}>
        <FaBars onClick={toggleMenu} style={{ cursor: "pointer", fontSize: "24px", marginLeft: "3%" }} />
        {menuOpen && (
          <div style={menuStyles}>
            <a href="#shorten-url" onClick={toggleMenu} style={menuItemStyles}>Shorten URL</a>
            <a href="#qrcode" onClick={toggleMenu} style={menuItemStyles}>QR Code</a>
          </div>
        )}
      </div>

      {/* Auth Form */}
      {!user && (
        <form onSubmit={handleAuth} style={formStyles}>
          <h2>{isLogin ? "Login" : "Sign Up"}</h2>
          <div style={inputGroupStyles}>
            <label htmlFor="email" style={labelStyles}>Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyles}
              required
            />
          </div>
          <div style={inputGroupStyles}>
            <label htmlFor="password" style={labelStyles}>Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyles}
              required
            />
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" style={buttonStyles}>{isLogin ? "Login" : "Sign Up"}</button>
          <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: "pointer", color: "#0070f3", marginTop: "10px" }}>
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </p>
        </form>
      )}

      {/* Logged-in view */}
      {user && (
        <>
          <p>Welcome, {user.email}</p>
          <button onClick={handleLogout} style={buttonStyles}>Logout</button>

          {/* Form for URL shortening */}
          <form onSubmit={handleSubmit} style={formStyles} id="shorten-url">
            <div style={inputGroupStyles}>
              <label htmlFor="url" style={labelStyles}>Enter URL:</label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={inputStyles}
                placeholder="https://example.com"
                required
              />
            </div>
            <div style={inputGroupStyles}>
              <label htmlFor="customUrl" style={labelStyles}>Custom Alias (optional):</label>
              <input
                type="text"
                id="customUrl"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                style={inputStyles}
                placeholder="custom-alias"
              />
            </div>
            <div style={inputGroupStyles}>
              <label htmlFor="shortenedUrl" style={labelStyles}>Shortened URL:</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  id="shortenedUrl"
                  value={shortenedUrl || ""}
                  readOnly
                  style={{ ...inputStyles, color: "#000" }}
                  placeholder="Shortened URL will appear here"
                />
                <FaCopy onClick={handleCopy} style={{ cursor: "pointer", marginLeft: "10px" }} />
              </div>
            </div>
            <button type="submit" style={buttonStyles}>Shorten URL</button>
            {shortenedUrl && (
              <div id="shortenedUrl">
                <button onClick={handleRedirect} style={{ ...buttonStyles, marginTop: "10px" }}>Open Link</button>
                <QRCode value={shortenedUrl} size={128} style={{ marginTop: "10px", textAlign: "center" }} />
              </div>
            )}
          </form>

          {/* URL History */}
          <div id="url-history" style={{ marginTop: "20px", textAlign: "center", padding: "10px", paddingBottom: "10px" }}>
            <h2>Your URL History</h2>
            {urlHistory.length > 0 ? (
              <ul>
                {urlHistory.map((urlData, index) => (
                  <li key={index}>
                    <p><strong>Original URL:</strong> {urlData.originalUrl}</p>
                    <p><strong>Shortened URL:</strong> {urlData.shortenedUrl}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No URL history available.</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}

// Styles
const formStyles: React.CSSProperties = {
  color: "#000",
  width: "100%",
  maxWidth: "400px",
  margin: "20px auto",
  padding: "20px",
  borderRadius: "8px",
  backgroundColor: "#f7f7f7",
  boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)"
};

const inputGroupStyles: React.CSSProperties = {
  marginBottom: "15px"
};

const labelStyles: React.CSSProperties = {
  
  display: "block",
  marginBottom: "5px",
  fontWeight: "bold"
};

const inputStyles: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc"
};

const buttonStyles: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  backgroundColor: "#0070f3",
  color: "#fff",
  borderRadius: "4px",
  cursor: "pointer",
  border: "none"
};

const menuStyles: React.CSSProperties = {
  position: "absolute",
  top: "30px",
  left: "0",
  backgroundColor: "#fff",
  boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
  borderRadius: "8px",
  padding: "10px",
  zIndex: 1000
};

const menuItemStyles: React.CSSProperties = {
  display: "block",
  padding: "10px",
  cursor: "pointer",
  textDecoration: "none",
  color: "#0070f3"
};
