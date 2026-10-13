import {
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer
} from 'recharts';

const loadingData = [
  {
    date: '2024-01-31T17:35:00.000Z',
    value: 390
  },
  {
    date: '2024-02-05T23:55:00.000Z',
    value: 1300
  },
  {
    date: '2024-02-06T23:55:00.000Z',
    value: 990
  },
  {
    date: '2024-02-05T23:55:00.000Z',
    value: 1300
  },
  {
    date: '2024-02-06T23:55:00.000Z',
    value: 900
  },
  {
    date: '2024-02-07T10:15:00.000Z',
    value: 1900
  }
];

interface EmptyGraphProps {
  text: string;
  isLine?: boolean;
}

const EmptyGraph = ({ text, isLine = false }: EmptyGraphProps) => {
  return (
    <ResponsiveContainer aspect={3}>
      {!isLine ? (
        <BarChart data={loadingData}>
          <Legend
            content={
              <span className='flex justify-center text-xl font-semibold text-[var(--second-color)] opacity-50'>
                {text}
              </span>
            }
            verticalAlign='middle'
          />
          <Bar dataKey='value' fill='#1C9D7835' radius={5} />
        </BarChart>
      ) : (
        <LineChart data={loadingData}>
          <Legend
            content={
              <div className='flex justify-center text-xl font-semibold text-[var(--second-color)] opacity-50'>
                {text}
              </div>
            }
            verticalAlign='middle'
          />
          <Line
            type='monotone'
            dataKey='value'
            stroke='#1C9D7835'
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
};

export default EmptyGraph;
