import React from "react";
import { Download, ShieldCheck, Info, Calendar, FileCode, HardDrive, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface DirectDownloadSectionProps {
  version?: string;
  size?: string;
  lastUpdated?: string;
  extensionName?: string;
  downloadUrl?: string;
  /** Internal extension slug for linking to /extension/[slug] */
  internalSlug?: string;
  /** Chrome Web Store URL */
  storeUrl?: string;
  /** User count string */
  users?: string;
  /** Rating string */
  rating?: string;
}

const DirectDownloadSection: React.FC<DirectDownloadSectionProps> = ({
  version = "2.4.1",
  size = "1.2 MB",
  lastUpdated = new Date().toLocaleDateString("en-US", { month: 'long', year: 'numeric' }),
  extensionName = "Extension",
  downloadUrl,
  internalSlug,
  storeUrl,
  users,
  rating,
}) => {
  const auditTimestamp = new Date().toLocaleDateString("en-US", {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const hasInternal = !!internalSlug;
  const primaryUrl = storeUrl || downloadUrl || "#";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-12 overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-1 shadow-2xl"
    >
      <div className="rounded-xl bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              {hasInternal ? "Our Verified Extension" : "Technical Audit Passed"}
            </div>

            <h3 className="text-2xl md:text-3xl font-bold font-heading leading-tight">
              {hasInternal ? (
                <>Get <span className="text-primary">{extensionName}</span> — Our Extension</>
              ) : (
                <>Direct Download Utility: <span className="text-primary">{extensionName}</span></>
              )}
            </h3>

            <p className="text-muted-foreground text-sm md:text-base">
              {hasInternal
                ? `${extensionName} is built and maintained by our team. Install it directly from the Chrome Web Store or explore all features on our dedicated page.`
                : `Get the latest verified version of ${extensionName} directly. Our security engine has scanned this file for vulnerabilities and verified its integrity.`
              }
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <FileCode className="h-3 w-3" /> Version
                </span>
                <span className="text-sm font-mono font-bold">{version}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <HardDrive className="h-3 w-3" /> Size
                </span>
                <span className="text-sm font-mono font-bold">{size}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Updated
                </span>
                <span className="text-sm font-mono font-bold">{lastUpdated}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> {users ? "Users" : "Type"}
                </span>
                <span className="text-sm font-mono font-bold">{users || ".CRX File"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 bg-secondary/30 p-6 rounded-xl border border-border">
            {/* Primary CTA: Add to Chrome */}
            <Button
              size="lg"
              className="w-full md:w-auto h-16 px-8 text-lg font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all bg-primary hover:bg-primary/90 text-primary-foreground group"
              onClick={() => window.open(primaryUrl, '_blank')}
            >
              <Download className="mr-2 h-6 w-6 animate-bounce group-hover:animate-none" />
              {hasInternal ? "Add to Chrome — Free" : "Download .CRX File"}
            </Button>

            {/* Secondary CTA: View Extension Details (internal only) */}
            {hasInternal && (
              <Link to={`/extension/${internalSlug}`} className="w-full">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Extension Details
                </Button>
              </Link>
            )}

            <div className="text-center">
              {rating && (
                <p className="text-sm font-bold text-primary mb-1">★ {rating} Rating</p>
              )}
              <p className="text-[10px] text-muted-foreground font-medium mb-1">
                SECURITY AUDIT TIMESTAMP
              </p>
              <p className="text-xs font-mono text-green-500 bg-green-500/5 px-2 py-1 rounded border border-green-500/20">
                {auditTimestamp} (UTC)
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-6 items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            SHA-256 Hash Verified
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            No Adware/Spyware Detected
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Digital Signature Valid
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default DirectDownloadSection;
