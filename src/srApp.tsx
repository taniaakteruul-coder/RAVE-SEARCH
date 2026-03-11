import React, { useState } from "react";
import { Search } from "lucide-react";

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }: any) => {
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default function App() {
  const [view, setView] = useState<"landing" | "finder" | "owner">("landing");

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {view === "landing" ? (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-8 px-6">
          <h1 className="text-5xl sm:text-6xl font-black text-indigo-600 italic">RAVE SEARCH</h1>
          <p className="text-slate-600 text-center max-w-xl">
            A simple Lost & Found system. Finders can register items, and owners can search by item name and location.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Button onClick={() => setView("finder")}>I Found Something</Button>
            <Button onClick={() => setView("owner")} variant="secondary">
              I Lost Something
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-8 max-w-4xl mx-auto">
          <Button onClick={() => setView("landing")} variant="secondary" className="mb-8">
            Back
          </Button>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {view === "finder" ? "Finder Dashboard" : "Owner Dashboard"}
              </h2>
            </div>

            <p className="text-slate-600">
              Your full Finder/Owner dashboard UI goes here (forms, upload, saving, and search results).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
