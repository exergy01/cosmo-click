import React from "react";

export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} style={{ padding: "10px 20px", borderRadius: "8px", backgroundColor: "#222", color: "#fff" }}>
      {children}
    </button>
  );
}
