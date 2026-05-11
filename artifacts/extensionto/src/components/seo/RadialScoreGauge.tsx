import { motion } from "framer-motion";

interface RadialScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function RadialScoreGauge({ 
  score, 
  size = 200, 
  strokeWidth = 12 
}: RadialScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;
  
  const getScoreColor = (score: number): string => {
    if (score < 50) return 'hsl(0, 84%, 60%)'; // Red
    if (score < 80) return 'hsl(45, 93%, 47%)'; // Yellow/Orange
    return 'hsl(142, 76%, 36%)'; // Green
  };
  
  const getScoreLabel = (score: number): string => {
    if (score < 30) return 'Poor';
    if (score < 50) return 'Needs Work';
    if (score < 70) return 'Good';
    if (score < 85) return 'Very Good';
    return 'Excellent';
  };
  
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  
  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 10px ${color})`
          }}
        />
      </svg>
      
      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-5xl font-bold font-heading"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <motion.span 
          className="text-sm font-medium text-muted-foreground mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {label}
        </motion.span>
      </div>
    </div>
  );
}
