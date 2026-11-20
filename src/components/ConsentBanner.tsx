"use client";
import { useEffect, useState } from "react";

// Only essential cookies are used today. No analytics/marketing scripts load, so there is nothing to gate yet.
// Choice is stored in a first-party cookie. When you add analytics, load it ONLY if analytics === true.
export default function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!document.cookie.includes("consent=")); }, []);
  if (!show) return null;
  const save = (analytics: boolean) => {
    document.cookie = `consent=${analytics ? "analytics" : "essential"}; max-age=15552000; path=/; SameSite=Lax`;
    setShow(false);
  };
  return (
    <div className="consent" role="dialog" aria-label="Cookie preferences">
      <div className="wrap">
        <p style={{ margin: "0 0 8px" }}>We use essential cookies to keep you signed in. Optional analytics stay off unless you accept. See our <a href="/legal/cookies">Cookie Policy</a>.</p>
        <button className="btn" onClick={() => save(false)}>Essential only</button>{" "}
        <button className="btn secondary" onClick={() => save(true)}>Accept analytics</button>
      </div>
    </div>
  );
}
