import React from "react";
import clsx from "clsx";

interface NeonButtonProps {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

export const NeonButton = ({ label, icon, active, onClick }: NeonButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={clsx("menu-button", { active })}
    >
      {icon && <span className="icon">{icon}</span>} {label}
    </button>
  );
};
