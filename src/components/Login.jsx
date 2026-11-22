
import { useRef, useState } from "react";
import "./Login.css";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth } from "../firebase";
import { Bus, Phone, ShieldCheck } from "lucide-react";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recaptchaRef = useRef(null);
  const verifierRef = useRef(null);

  const sendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const formattedPhone = phone.trim().startsWith("+")
      ? phone.trim()
      : `+91${phone.trim()}`;

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
      console.error(err);
      setError(err.message || "Unable to send OTP. Please try again.");

      if (verifierRef.current) {
        verifierRef.current.clear();
        verifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

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
      await confirmation.confirm(otp.trim());
      // Firebase signs the user in.
      // App.jsx detects the signed-in user automatically.
    } catch (err) {
      console.error(err);
      setError("Invalid or expired OTP. Please try again.");
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
          <h1>City<span>Track</span></h1>
          <p>Smart City Bus Tracking System</p>
        </div>

        <div className="login-heading">
          <h2>{confirmation ? "Verify your number" : "Welcome aboard!"}</h2>
          <p>
            {confirmation
              ? "Enter the OTP sent to your mobile number."
              : "Login or create an account using your mobile number."}
          </p>
        </div>

        {!confirmation ? (
          <form onSubmit={sendOtp}>
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

            <div id="recaptcha-container" ref={recaptchaRef}></div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
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
              {loading ? "Verifying..." : "Verify and Continue"}
            </button>

            <button
              type="button"
              className="back-button"
              onClick={() => {
                setConfirmation(null);
                setOtp("");
                setError("");
                setMessage("");
              }}
            >
              Change mobile number
            </button>
          </form>
        )}

        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}

        <div className="login-footer">
          Secure phone verification powered by Firebase
        </div>
      </div>
    </div>
  );
}
