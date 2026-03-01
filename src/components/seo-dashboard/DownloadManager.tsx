import { useState } from "react";
import { Download, Plus, Trash2, Save, FileArchive, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface DownloadLink {
  id: string;
  articleSlug: string;
  articleTitle: string;
  fileType: "crx" | "xpi" | "zip" | "exe";
  url: string;
  version: string;
  platform: "chrome" | "firefox" | "edge" | "all";
}

interface Article {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  articles: Article[];
}

export default function DownloadManager({ articles }: Props) {
  const [links, setLinks] = useState<DownloadLink[]>([]);
  const [selectedArticle, setSelectedArticle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newVersion, setNewVersion] = useState("1.0.0");
  const [newFileType, setNewFileType] = useState<DownloadLink["fileType"]>("crx");
  const [newPlatform, setNewPlatform] = useState<DownloadLink["platform"]>("chrome");
  const { toast } = useToast();

  const handleAdd = () => {
    if (!selectedArticle || !newUrl) {
      toast({ title: "Error", description: "Select an article and provide a URL", variant: "destructive" });
      return;
    }
    const article = articles.find(a => a.slug === selectedArticle);
    if (!article) return;

    const link: DownloadLink = {
      id: crypto.randomUUID(),
      articleSlug: article.slug,
      articleTitle: article.title,
      fileType: newFileType,
      url: newUrl,
      version: newVersion,
      platform: newPlatform,
    };
    setLinks(prev => [...prev, link]);
    setNewUrl("");
    setNewVersion("1.0.0");
    toast({ title: "Added", description: `Download link added for ${article.title}` });
  };

  const handleRemove = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(links, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "download-links.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${links.length} download links exported` });
  };

  const fileTypeColors: Record<string, string> = {
    crx: "bg-green-500/20 text-green-400 border-green-500/30",
    xpi: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    zip: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    exe: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  const platformIcons: Record<string, string> = {
    chrome: "🌐",
    firefox: "🦊",
    edge: "🔷",
    all: "🔗",
  };

  return (
    <div className="space-y-6">
      {/* Add Download Link */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
          <FileArchive className="h-5 w-5 text-primary" />
          Add Download Link
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Article</Label>
            <Select value={selectedArticle} onValueChange={setSelectedArticle}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select article..." />
              </SelectTrigger>
              <SelectContent>
                {articles.slice(0, 50).map(a => (
                  <SelectItem key={a.slug} value={a.slug}>
                    {a.title.slice(0, 60)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Download URL</Label>
            <Input
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Version</Label>
            <Input
              value={newVersion}
              onChange={e => setNewVersion(e.target.value)}
              placeholder="1.0.0"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">File Type</Label>
            <Select value={newFileType} onValueChange={v => setNewFileType(v as DownloadLink["fileType"])}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="crx">.crx (Chrome)</SelectItem>
                <SelectItem value="xpi">.xpi (Firefox)</SelectItem>
                <SelectItem value="zip">.zip (Archive)</SelectItem>
                <SelectItem value="exe">.exe (Installer)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Platform</Label>
            <Select value={newPlatform} onValueChange={v => setNewPlatform(v as DownloadLink["platform"])}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chrome">Chrome</SelectItem>
                <SelectItem value="firefox">Firefox</SelectItem>
                <SelectItem value="edge">Edge</SelectItem>
                <SelectItem value="all">All Platforms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} className="gap-2 bg-primary text-primary-foreground w-full">
              <Plus className="h-4 w-4" />
              Add Link
            </Button>
          </div>
        </div>
      </div>

      {/* Links Table */}
      {links.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">{links.length} download links</h3>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Save className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Article</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map(link => (
                  <TableRow key={link.id}>
                    <TableCell className="text-sm max-w-[200px] truncate">{link.articleTitle}</TableCell>
                    <TableCell>
                      <Badge className={fileTypeColors[link.fileType]}>.{link.fileType}</Badge>
                    </TableCell>
                    <TableCell>{platformIcons[link.platform]} {link.platform}</TableCell>
                    <TableCell className="font-mono text-sm">{link.version}</TableCell>
                    <TableCell>
                      <a href={link.url} target="_blank" rel="noopener" className="text-primary hover:underline text-sm flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Link
                      </a>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(link.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
