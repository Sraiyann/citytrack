
import { useRef, useState } from "react";
import "./Login.css";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
} from "firebase/auth";

import { auth } from "../firebase";

import {
  Bus,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

export default function Login() {
  const [mode, setMode] = useState("login");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recaptchaRef = useRef(null);
  const verifierRef = useRef(null);

  // ==========================================
  // SEND OTP
  // ==========================================
  const sendOtp = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (mode === "register" && fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    const cleanPhone = phone.trim();

    const formattedPhone = cleanPhone.startsWith("+")
      ? cleanPhone
      : `+91${cleanPhone}`;

    if (!/^\+[1-9]\d{7,14}$/.test(formattedPhone)) {
      setError("Enter a valid mobile number with country code.");
      return;
    }

    setLoading(true);

    try {
      if (verifierRef.current) {
        verifierRef.current.clear();
        verifierRef.current = null;
      }

      const verifier = new RecaptchaVerifier(
        auth,
        recaptchaRef.current,
        { size: "normal" }
      );

      verifierRef.current = verifier;

      const result = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        verifier
      );

      setConfirmation(result);
      setMessage("OTP sent successfully. Check your phone.");
    } catch (err) {
      console.error("OTP error:", err);

      setError(
        err.message || "Unable to send OTP. Please try again."
      );

      if (verifierRef.current) {
        verifierRef.current.clear();
        verifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VERIFY OTP
  // ==========================================
  const verifyOtp = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const result = await confirmation.confirm(otp.trim());

      // ======================================
      // SAVE REGISTRATION NAME TO FIREBASE
      // ======================================
      if (mode === "register") {
        const name = fullName.trim();

        await updateProfile(result.user, {
          displayName: name,
        });

        // Reload Firebase user to get updated profile.
        await result.user.reload();

        // Refresh CityTrack to load the saved name.
        window.location.reload();

        return;
      }

      // Existing login: App.jsx detects signed-in user.
    } catch (err) {
      console.error("OTP verification error:", err);

      setError(
        err.code === "auth/invalid-verification-code"
          ? "Incorrect OTP. Please try again."
          : err.message || "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CHANGE LOGIN / REGISTER MODE
  // ==========================================
  const changeMode = (newMode) => {
    setMode(newMode);
    setFullName("");
    setPhone("");
    setOtp("");
    setConfirmation(null);
    setError("");
    setMessage("");

    if (verifierRef.current) {
      verifierRef.current.clear();
      verifierRef.current = null;
    }
  };

  // ==========================================
  // CHANGE MOBILE NUMBER
  // ==========================================
  const resetVerification = () => {
    setConfirmation(null);
    setOtp("");
    setError("");
    setMessage("");

    if (verifierRef.current) {
      verifierRef.current.clear();
      verifierRef.current = null;
    }
  };

  // ==========================================
  // UI
  // ==========================================
  return (
    <div className="login-page">
      <div className="login-card">

        {/* LOGO */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Bus size={30} />
          </div>

          <h1>
            City<span>Track</span>
          </h1>

          <p>Smart City Bus Tracking System</p>
        </div>

        {/* HEADING */}
        <div className="login-heading">
          <h2>
            {confirmation
              ? "Verify your number"
              : mode === "register"
              ? "Create your account"
              : "Welcome aboard!"}
          </h2>

          <p>
            {confirmation
              ? "Enter the OTP sent to your mobile number."
              : mode === "register"
              ? "Enter your details to get started with CityTrack."
              : "Login using your registered mobile number."}
          </p>
        </div>

        {/* PHONE AND REGISTRATION FORM */}
        {!confirmation ? (
          <form onSubmit={sendOtp}>

            {mode === "register" && (
              <>
                <label>Full name</label>

                <div className="phone-input">
                  <User size={19} />

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </>
            )}

            <label>Mobile number</label>

            <div className="phone-input">
              <Phone size={19} />

              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div
              id="recaptcha-container"
              ref={recaptchaRef}
            ></div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            {/* LOGIN / REGISTER SWITCH */}
            <div className="login-switch">
              {mode === "login" ? (
                <p>
                  New to CityTrack?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("register")}
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("login")}
                  >
                    Login
                  </button>
                </p>
              )}
            </div>

          </form>
        ) : (

          /* OTP VERIFICATION FORM */
          <form onSubmit={verifyOtp}>

            <label>One-time password</label>

            <div className="phone-input">
              <ShieldCheck size={19} />

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, ""))
                }
                required
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Verifying..."
                : mode === "register"
                ? "Create Account"
                : "Verify and Continue"}
            </button>

            <button
              type="button"
              className="back-button"
              onClick={resetVerification}
            >
              Change mobile number
            </button>

          </form>
        )}

        {/* SUCCESS MESSAGE */}
        {message && (
          <p className="auth-success">{message}</p>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <p className="auth-error">{error}</p>
        )}

        {/* FOOTER */}
        <div className="login-footer">
          Secure phone verification powered by Firebase
        </div>

      </div>
    </div>
  );
}
