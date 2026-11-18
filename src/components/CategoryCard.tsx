import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { getScoreTone } from '../utils/auditHelpers';

interface CategoryCardProps {
  title: string;
  subtitle: string;
  score: number;
  onClick?: () => void;
}

export function CategoryCard({ title, subtitle, score, onClick }: CategoryCardProps) {
  const tone = getScoreTone(score);
  const data = [{ name: title, value: score, fill: tone.hex }];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">
          {title}
        </div>
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtitle}
        </div>
        <div className={`mt-2 text-xs font-semibold ${tone.textClass}`}>{tone.label}</div>
      </div>

      <div className="relative h-16 w-16 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
            barSize={6}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'rgba(148, 163, 184, 0.18)' }}
              dataKey="value"
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
            {score}
          </span>
        </div>
      </div>
    </button>
  );
}
