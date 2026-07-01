"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { TEAM_MEMBERS } from "@/lib/auth/team";
import type { TeamMember } from "@/lib/types";

interface UserContextValue {
  currentUser: TeamMember;
  setCurrentUser: (user: TeamMember) => void;
  isManager: boolean;
  isWorker: boolean;
  memoryRole: TeamMember["memoryRole"];
}

const UserContext = createContext<UserContextValue | null>(null);

const STORAGE_KEY = "andex-current-user";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<TeamMember>(TEAM_MEMBERS[1]); // default worker

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const member = TEAM_MEMBERS.find((m) => m.id === saved);
      if (member) setCurrentUserState(member);
    }
  }, []);

  const setCurrentUser = (user: TeamMember) => {
    setCurrentUserState(user);
    localStorage.setItem(STORAGE_KEY, user.id);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isManager: currentUser.role === "manager",
        isWorker: currentUser.role === "worker",
        memoryRole: currentUser.memoryRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
