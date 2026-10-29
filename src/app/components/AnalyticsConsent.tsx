import { useEffect, useState } from "react";
import { ANALYTICS_CONSENT_KEY, clarityIsConfigured, loadClarity, readAnalyticsConsent, revokeClarity, writeAnalyticsConsent } from "../../platform/analytics";

export function AnalyticsConsent() {
  const [consent, setConsent] = useState(readAnalyticsConsent);
  const [open, setOpen] = useState(() => readAnalyticsConsent() === null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadClarity();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_KEY && event.key !== null) return;
      const next = readAnalyticsConsent();
      setConsent(next);
      if (next === "granted") loadClarity();
      else if (document.getElementById("tinkleme-clarity")) {
        window.clarity?.("consentv2", { analytics_Storage: "denied", ad_Storage: "denied" });
        window.location.reload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!clarityIsConfigured()) return null;

  const accept = () => {
    if (!writeAnalyticsConsent("granted")) {
      setError("Your browser could not save this preference. Analytics stays off.");
      return;
    }
    setConsent("granted");
    setOpen(false);
    setError("");
    loadClarity();
  };
  const decline = () => {
    revokeClarity();
    setConsent("denied");
    setOpen(false);
    setError("");
  };

  return <div className="analytics-preferences">
    <button type="button" className="privacy-link" aria-expanded={open} aria-controls="analytics-preferences" onClick={() => setOpen((value) => !value)}>Privacy preferences</button>
    {open && <section id="analytics-preferences" className="consent-card" aria-labelledby="analytics-title">
      <div>
        <h2 id="analytics-title">Help TinkleMe feel better.</h2>
        <p>With your permission, Microsoft Clarity uses cookies and records how you use this page to help us improve it. Calendar, task and reminder content is masked. Advertising storage stays off.</p>
        <p className="consent-detail">Optional. Change your choice here anytime. {consent === "granted" ? "Turning analytics off reloads this page." : "Analytics is currently off."} <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">Microsoft privacy statement</a></p>
        {error && <p className="errors" role="alert">{error}</p>}
      </div>
      <div className="consent-actions">
        <button type="button" className="secondary" onClick={decline}>{consent === "granted" ? "Turn off & reload" : "No thanks"}</button>
        <button type="button" onClick={accept}>{consent === "granted" ? "Keep enabled" : "Allow analytics"}</button>
      </div>
    </section>}
  </div>;
}
