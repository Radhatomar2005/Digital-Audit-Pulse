import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { getScoreTone } from '../utils/auditHelpers';

interface ScoreGaugeProps {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  previousScore?: number | null;
}

export function ScoreGauge({ score, grade, previousScore }: ScoreGaugeProps) {
  const tone = getScoreTone(score);
  const data = [{ name: 'Score', value: score, fill: tone.hex }];

  const delta =
    typeof previousScore === 'number' ? score - previousScore : null;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="74%"
            outerRadius="96%"
            data={data}
            startAngle={220}
            endAngle={-40}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'rgba(148, 163, 184, 0.18)' }}
              dataKey="value"
              cornerRadius={8}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-4xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {score}
          </span>
          <span className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            out of 100
          </span>
          <span
            className={`mt-1.5 rounded-md px-2 py-0.5 text-xs font-bold ${tone.bgSoftClass} ${tone.textClass}`}
          >
            Grade {grade} · {tone.label}
          </span>
        </div>
      </div>

      {delta !== null && (
        <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
          {delta > 0 ? (
            <>
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-700 dark:text-emerald-400">+{delta} pts vs previous</span>
            </>
          ) : delta < 0 ? (
            <>
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span className="text-rose-700 dark:text-rose-400">{delta} pts vs previous</span>
            </>
          ) : (
            <>
              <Minus className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Unchanged vs previous</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
