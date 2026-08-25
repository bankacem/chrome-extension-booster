import { 
  FileText, 
  Heading1, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  ExternalLink,
  Percent,
  Type,
  AlignLeft
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SEOStatsCardsProps {
  wordCount: number;
  headingsCount: { h1: number; h2: number; h3: number };
  imagesCount: number;
  internalLinks: number;
  externalLinks: number;
  keywordDensity: number;
  titleLength: number;
  metaDescriptionLength: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'good' | 'warning' | 'error' | 'neutral';
  delay?: number;
}

function StatCard({ icon, label, value, subValue, status = 'neutral', delay = 0 }: StatCardProps) {
  const statusColors = {
    good: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    error: 'border-destructive/30 bg-destructive/5',
    neutral: 'border-border bg-card'
  };
  
  const iconColors = {
    good: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-destructive',
    neutral: 'text-primary'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "p-4 rounded-xl border transition-all hover:scale-[1.02]",
        statusColors[status]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg bg-background/50",
          iconColors[status]
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold font-heading">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function SEOStatsCards({
  wordCount,
  headingsCount,
  imagesCount,
  internalLinks,
  externalLinks,
  keywordDensity,
  titleLength,
  metaDescriptionLength
}: SEOStatsCardsProps) {
  const getWordCountStatus = (): 'good' | 'warning' | 'error' => {
    if (wordCount >= 1500) return 'good';
    if (wordCount >= 800) return 'warning';
    return 'error';
  };
  
  const getTitleStatus = (): 'good' | 'warning' | 'error' => {
    if (titleLength >= 30 && titleLength <= 60) return 'good';
    if (titleLength > 0) return 'warning';
    return 'error';
  };
  
  const getMetaStatus = (): 'good' | 'warning' | 'error' => {
    if (metaDescriptionLength >= 120 && metaDescriptionLength <= 160) return 'good';
    if (metaDescriptionLength > 0) return 'warning';
    return 'error';
  };
  
  const getDensityStatus = (): 'good' | 'warning' | 'error' => {
    if (keywordDensity >= 1 && keywordDensity <= 2.5) return 'good';
    if (keywordDensity > 0 && keywordDensity < 3) return 'warning';
    return 'error';
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<FileText className="w-5 h-5" />}
        label="Word Count"
        value={wordCount.toLocaleString()}
        subValue={wordCount >= 1500 ? "Optimal length" : "Recommended: 1500+"}
        status={getWordCountStatus()}
        delay={0}
      />
      
      <StatCard
        icon={<Heading1 className="w-5 h-5" />}
        label="Headings"
        value={headingsCount.h1 + headingsCount.h2 + headingsCount.h3}
        subValue={`H1: ${headingsCount.h1} | H2: ${headingsCount.h2} | H3: ${headingsCount.h3}`}
        status={headingsCount.h1 === 1 ? 'good' : 'warning'}
        delay={0.1}
      />
      
      <StatCard
        icon={<ImageIcon className="w-5 h-5" />}
        label="Images"
        value={imagesCount}
        subValue={imagesCount > 0 ? "Images found" : "No images"}
        status={imagesCount > 0 ? 'good' : 'warning'}
        delay={0.2}
      />
      
      <StatCard
        icon={<LinkIcon className="w-5 h-5" />}
        label="Internal Links"
        value={internalLinks}
        subValue={internalLinks >= 2 ? "Good linking" : "Add more links"}
        status={internalLinks >= 2 ? 'good' : 'warning'}
        delay={0.3}
      />
      
      <StatCard
        icon={<ExternalLink className="w-5 h-5" />}
        label="External Links"
        value={externalLinks}
        subValue="Outbound links"
        status={externalLinks > 0 ? 'good' : 'neutral'}
        delay={0.4}
      />
      
      <StatCard
        icon={<Percent className="w-5 h-5" />}
        label="Keyword Density"
        value={`${keywordDensity.toFixed(1)}%`}
        subValue="Optimal: 1% - 2.5%"
        status={getDensityStatus()}
        delay={0.5}
      />
      
      <StatCard
        icon={<Type className="w-5 h-5" />}
        label="Title Length"
        value={titleLength}
        subValue={`${titleLength}/60 characters`}
        status={getTitleStatus()}
        delay={0.6}
      />
      
      <StatCard
        icon={<AlignLeft className="w-5 h-5" />}
        label="Meta Description"
        value={metaDescriptionLength}
        subValue={`${metaDescriptionLength}/160 characters`}
        status={getMetaStatus()}
        delay={0.7}
      />
    </div>
  );
}
