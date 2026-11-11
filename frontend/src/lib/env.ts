/**
 * LOOMERA — Environment Variable Configuration & Production Validator
 * Validates critical environment settings without leaking secrets in logs.
 */

export interface EnvIssue {
  variable: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  message: string;
}

export interface EnvValidationResult {
  isValid: boolean;
  isProductionReady: boolean;
  environment: string;
  issues: EnvIssue[];
  diagnostics: Record<string, string>;
}

/**
 * Safely masks secret values for logging and diagnostic output.
 */
export function maskSecret(value?: string | null): string {
  if (!value || value.trim().length === 0) {
    return "[NOT SET]";
  }
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return "********";
  }
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

/**
 * Performs a comprehensive validation of the active environment variables.
 */
export function validateEnvironment(): EnvValidationResult {
  const issues: EnvIssue[] = [];
  const env = process.env.NODE_ENV || "development";
  const isProd = env === "production";

  // 1. Database Connection
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    issues.push({
      variable: "DATABASE_URL",
      severity: "CRITICAL",
      message: "Database connection string is required.",
    });
  } else if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    issues.push({
      variable: "DATABASE_URL",
      severity: "CRITICAL",
      message: "DATABASE_URL must be a valid PostgreSQL connection URI.",
    });
  } else if (isProd && !dbUrl.includes("sslmode=") && process.env.DATABASE_SSL !== "true") {
    issues.push({
      variable: "DATABASE_URL",
      severity: "WARNING",
      message: "Production database connection should enforce SSL encryption (sslmode=require).",
    });
  }

  // 2. Application Base URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    issues.push({
      variable: "NEXT_PUBLIC_APP_URL",
      severity: isProd ? "CRITICAL" : "WARNING",
      message: "Application URL is required for canonical metadata and absolute links.",
    });
  } else if (isProd && !appUrl.startsWith("https://")) {
    issues.push({
      variable: "NEXT_PUBLIC_APP_URL",
      severity: "CRITICAL",
      message: "Production application URL must strictly use HTTPS protocol.",
    });
  }

  // 3. Razorpay Payments
  const rzpKeyId = process.env.RAZORPAY_KEY_ID;
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const rzpWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (isProd) {
    if (!rzpKeyId || rzpKeyId.includes("sandbox") || rzpKeyId.startsWith("rzp_test_")) {
      issues.push({
        variable: "RAZORPAY_KEY_ID",
        severity: "CRITICAL",
        message: "Production requires live Razorpay key (rzp_live_...). Sandbox key detected.",
      });
    }
    if (!rzpKeySecret || rzpKeySecret.includes("sandbox")) {
      issues.push({
        variable: "RAZORPAY_KEY_SECRET",
        severity: "CRITICAL",
        message: "Production requires genuine live Razorpay secret key.",
      });
    }
    if (!rzpWebhookSecret || rzpWebhookSecret.includes("sandbox")) {
      issues.push({
        variable: "RAZORPAY_WEBHOOK_SECRET",
        severity: "CRITICAL",
        message: "Production requires configured live Razorpay webhook secret for payment confirmation.",
      });
    }
  } else {
    if (!rzpKeyId) {
      issues.push({
        variable: "RAZORPAY_KEY_ID",
        severity: "INFO",
        message: "Using deterministic sandbox fallback for payment gateway.",
      });
    }
  }

  // 4. Transactional Notifications (Email)
  const resendKey = process.env.RESEND_API_KEY;
  if (isProd) {
    if (!resendKey || resendKey.includes("mock")) {
      issues.push({
        variable: "RESEND_API_KEY",
        severity: "WARNING",
        message: "Transactional emails will fall back to local logger. Configure RESEND_API_KEY or SMTP for live patron transmissions.",
      });
    }
  }

  // 5. AI Concierge Configuration
  const aiProvider = process.env.AI_PROVIDER || "curated_nlu";
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (aiProvider === "gemini" && !geminiKey) {
    issues.push({
      variable: "GEMINI_API_KEY",
      severity: "WARNING",
      message: "AI_PROVIDER is set to 'gemini' but GEMINI_API_KEY is missing. Assistant will automatically use Curated NLU.",
    });
  } else if (aiProvider === "openai" && !openaiKey) {
    issues.push({
      variable: "OPENAI_API_KEY",
      severity: "WARNING",
      message: "AI_PROVIDER is set to 'openai' but OPENAI_API_KEY is missing. Assistant will automatically use Curated NLU.",
    });
  }

  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const isValid = criticalCount === 0;
  const isProductionReady = isValid && issues.filter((i) => i.severity === "WARNING").length === 0;

  const diagnostics: Record<string, string> = {
    NODE_ENV: env,
    DATABASE_URL: maskSecret(dbUrl),
    NEXT_PUBLIC_APP_URL: appUrl || "[NOT SET]",
    RAZORPAY_KEY_ID: maskSecret(rzpKeyId),
    RAZORPAY_KEY_SECRET: maskSecret(rzpKeySecret),
    RAZORPAY_WEBHOOK_SECRET: maskSecret(rzpWebhookSecret),
    RESEND_API_KEY: maskSecret(resendKey),
    AI_PROVIDER: aiProvider,
    GEMINI_API_KEY: maskSecret(geminiKey),
    OPENAI_API_KEY: maskSecret(openaiKey),
  };

  return {
    isValid,
    isProductionReady,
    environment: env,
    issues,
    diagnostics,
  };
}
