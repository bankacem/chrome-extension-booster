import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  MousePointerClick, 
  Eye, 
  Hash,
  Loader2,
  RefreshCw,
  AlertCircle,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SearchConsoleData {
  position: number;
  ctr: number;
  clicks: number;
  impressions: number;
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
}

interface GoogleSearchConsoleCardProps {
  articleSlug: string;
  articleUrl?: string;
}

export const GoogleSearchConsoleCard = ({ articleSlug, articleUrl }: GoogleSearchConsoleCardProps) => {
  const [data, setData] = useState<SearchConsoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'google_api' | 'simulated'>('simulated');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: response, error: funcError } = await supabase.functions.invoke('google-search-console', {
        body: { 
          articleSlug,
          articleUrl: articleUrl || `https://extensionto.com/blog/${articleSlug}`,
          domain: 'extensionto.com'
        }
      });

      if (funcError) throw funcError;
      
      if (response.success) {
        setData(response.data);
        setDataSource(response.source);
      } else {
        throw new Error(response.error || 'Failed to fetch data');
      }
    } catch (err: any) {
      console.error('GSC fetch error:', err);
      setError(err.message || 'Failed to load Search Console data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [articleSlug]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading Search Console data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 text-yellow-500 mb-4">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Search Console Connection</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Unable to connect to Google Search Console. Make sure OAuth is configured.
        </p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">Google Search Console</h3>
        </div>
        <div className="flex items-center gap-2">
          {dataSource === 'simulated' && (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              Demo Data
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Avg. Position</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.position.toFixed(1)}
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">CTR</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.ctr.toFixed(2)}%
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Clicks</span>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data.clicks.toLocaleString()}
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Impressions</span>
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.impressions.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Top Queries */}
      {data.topQueries && data.topQueries.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Top Search Queries</h4>
          <div className="space-y-2">
            {data.topQueries.map((query, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
              >
                <span className="text-sm font-medium truncate flex-1 mr-4">
                  {query.query}
                </span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3" />
                    {query.clicks}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {query.impressions}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <Hash className="w-3 h-3" />
                    {query.position.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dataSource === 'simulated' && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            <strong>ℹ️ Demo Mode:</strong> Showing simulated data. To connect real Google Search Console data, 
            you need to set up OAuth 2.0 authentication and add the access token to your backend secrets.
          </p>
        </div>
      )}
    </motion.div>
  );
};
