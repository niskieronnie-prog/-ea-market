"use client";

import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  required?: boolean;
};

export default function PasswordField({ id, name, autoComplete, minLength, required }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const visibilityId = `${id}-visibility`;

  return (
    <>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
      />
      <label htmlFor={visibilityId} style={{ display: "flex", gap: 6, alignItems: "center", margin: "6px 0 0", fontWeight: 400 }}>
        <input
          id={visibilityId}
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
          aria-controls={id}
          style={{ width: "auto" }}
        />
        Show password
      </label>
    </>
  );
}
