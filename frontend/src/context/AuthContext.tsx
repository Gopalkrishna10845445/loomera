"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role?: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    fullName: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          if (isSubscribed && data.authenticated && data.user) {
            setUser(data.user);
            return;
          }
        }
        if (isSubscribed) setUser(null);
      } catch {
        if (isSubscribed) setUser(null);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    loadSession();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Collect any guest cart & wishlist from localStorage to merge
      let anonymousCart = [];
      let anonymousWishlist = [];
      try {
        const savedCart = localStorage.getItem("loomera_cart");
        if (savedCart) anonymousCart = JSON.parse(savedCart);
        const savedWishlist = localStorage.getItem("loomera_wishlist");
        if (savedWishlist) anonymousWishlist = JSON.parse(savedWishlist);
      } catch {
        // Ignore JSON parsing errors
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          anonymousCart,
          anonymousWishlist,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error during login. Please try again." };
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ) => {
    try {
      let anonymousCart = [];
      let anonymousWishlist = [];
      try {
        const savedCart = localStorage.getItem("loomera_cart");
        if (savedCart) anonymousCart = JSON.parse(savedCart);
        const savedWishlist = localStorage.getItem("loomera_wishlist");
        if (savedWishlist) anonymousWishlist = JSON.parse(savedWishlist);
      } catch {
        // Ignore
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          passwordConfirmation,
          anonymousCart,
          anonymousWishlist,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error during registration." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      login: async () => ({ success: false, error: "Auth provider missing" }),
      register: async () => ({ success: false, error: "Auth provider missing" }),
      logout: async () => {},
      checkAuth: async () => {},
    };
  }
  return context;
}
