
import { useState } from "react";
import { updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import "./Login.css";
import { Bus, User } from "lucide-react";

export default function ProfileSetup({ onComplete }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const saveName = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Please enter a name with at least 2 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
      });

      onComplete(trimmedName);
    } catch (err) {
      console.error("Profile update error:", err);
      setError("Unable to save your name. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Bus size={30} />
          </div>
          <h1>
            City<span>Track</span>
          </h1>
          <p>Smart City Bus Tracking System</p>
        </div>

        <div className="login-heading">
          <h2>Welcome aboard!</h2>
          <p>Let's get to know you. What should we call you?</p>
        </div>

        <form onSubmit={saveName}>
          <label>Your name</label>

          <div className="phone-input">
            <User size={19} />
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Saving..." : "Continue to CityTrack"}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}

        <div className="login-footer">
          Your profile helps personalize your CityTrack experience.
        </div>
      </div>
    </div>
  );
}
