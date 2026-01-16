import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ExternalLink, Camera, Moon, Shield, Cpu, XCircle, Calculator, Key, WifiOff, Cookie } from "lucide-react";

const extensions = [
  {
    icon: Camera,
    name: "Quick Screenshot Lite",
    description: "Capture full page or visible area screenshots instantly. Save, copy, or download with one click.",
    users: "2K+",
    rating: "4.9",
    color: "from-primary to-cyan-400",
    storeUrl: "https://chromewebstore.google.com/detail/quick-screenshot-lite/hddickadgkbfpcelmckpjhcfnoeognee",
  },
  {
    icon: Moon,
    name: "Auto Dark Mode Switcher",
    description: "Automatically switch between dark and light modes based on time or system preferences.",
    users: "3K+",
    rating: "4.8",
    color: "from-violet-500 to-purple-400",
    storeUrl: "https://chromewebstore.google.com/detail/auto-dark-mode-switcher-u/obbhliekbfgpcdippngphefofiicgjml",
  },
  {
    icon: Shield,
    name: "Redirect Shield",
    description: "Stop automatic redirects and protect yourself from malicious redirect chains.",
    users: "5K+",
    rating: "4.9",
    color: "from-emerald-500 to-green-400",
    storeUrl: "https://chromewebstore.google.com/detail/redirect-shield-stop-auto/pofolffdhjffglfphiagpbnlegjbnbhp",
  },
  {
    icon: Cpu,
    name: "ProTab Suspender",
    description: "Automatically suspend inactive tabs to save memory and boost browser performance.",
    users: "4K+",
    rating: "4.7",
    color: "from-orange-500 to-amber-400",
    storeUrl: "https://chromewebstore.google.com/detail/protab-suspender-memory-s/gghjdfjjffegohpjhmcmgeonmcomilgj",
  },
  {
    icon: XCircle,
    name: "Light Popup Blocker",
    description: "Block annoying popups and intrusive ads for a cleaner, faster browsing experience.",
    users: "6K+",
    rating: "4.8",
    color: "from-red-500 to-rose-400",
    storeUrl: "https://chromewebstore.google.com/detail/light-popup-blocker-ad-de/oimngcokgckajdlphggpjpbeljoakpii",
  },
  {
    icon: Calculator,
    name: "Formula Builder Pro",
    description: "Build and calculate complex formulas right in your browser. Perfect for students and professionals.",
    users: "1.5K+",
    rating: "4.9",
    color: "from-blue-500 to-indigo-400",
    storeUrl: "https://chromewebstore.google.com/detail/formula-builder-pro/ecmfloopolmkamoklcepdonahkigjlnn",
  },
  {
    icon: Key,
    name: "SecuraKey Pro",
    description: "Secure password manager with encryption. Generate and store strong passwords safely.",
    users: "3.5K+",
    rating: "4.9",
    color: "from-pink-500 to-fuchsia-400",
    storeUrl: "https://chromewebstore.google.com/detail/securakey-pro-password-ma/omeencccnkninlofbggfcfiohapajhgi",
  },
  {
    icon: WifiOff,
    name: "Offline Reader Pro",
    description: "Save web pages for offline reading. Access your favorite content anywhere, anytime.",
    users: "2.5K+",
    rating: "4.8",
    color: "from-teal-500 to-cyan-400",
    storeUrl: "https://chromewebstore.google.com/detail/offline-reader-pro/bgbojccanmjdniomhccefkakjaedajhf",
  },
  {
    icon: Cookie,
    name: "Cookie Banner Blocker",
    description: "Automatically dismiss annoying cookie consent banners for seamless browsing.",
    users: "7K+",
    rating: "4.9",
    color: "from-amber-500 to-yellow-400",
    storeUrl: "https://chromewebstore.google.com/detail/cookie-banner-blocker-pri/mlmiefaloipcahfcgfbccadnnjgpipge",
  },
];

const ExtensionsSection = () => {
  return (
    <section id="extensions" className="relative py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Our Extensions
          </span>
          <h2 className="mb-4 font-heading text-3xl font-bold md:text-5xl">
            Powerful Tools for Every Need
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Each extension is carefully crafted with performance and user experience in mind. 
            Install multiple to create your perfect browsing setup.
          </p>
        </motion.div>

        {/* Extensions Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {extensions.map((extension, index) => (
            <motion.div
              key={extension.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group glass-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
            >
              {/* Icon */}
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${extension.color}`}>
                <extension.icon className="h-6 w-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="mb-2 font-heading text-xl font-semibold">
                {extension.name}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {extension.description}
              </p>

              {/* Stats */}
              <div className="mb-4 flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{extension.users}</strong> users
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">★ {extension.rating}</strong>
                </span>
              </div>

              {/* CTA */}
              <Button 
                variant="glass" 
                size="sm" 
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                onClick={() => window.open(extension.storeUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Add to Chrome
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExtensionsSection;
