import React from "react";

interface IconButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center w-24 h-24 m-2 p-2 rounded-xl bg-white shadow-md hover:bg-gray-100"
    >
      <img src={icon} alt={label} className="w-10 h-10 mb-1" />
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  );
};

export default IconButton;
