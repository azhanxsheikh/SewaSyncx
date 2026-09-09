import { useState } from 'react';
import type { Screen } from '../../data/mockData';
import Header, { SOSProgress } from '../../components/Header';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
  selectedService: string;
}

const questions: Record<string, { q: string; opts: string[] }[]> = {
  electrical: [
    { q: 'What is affected?', opts: ['Entire home', 'One room', 'One appliance', 'Not sure'] },
    { q: 'Is there smoke, sparks, or burning smell?', opts: ['Yes', 'No', 'Not sure'] },
    { q: 'When did this start?', opts: ['Just now', 'A few hours ago', 'Yesterday', 'A few days ago'] },
  ],
  plumbing: [
    { q: 'What is the issue?', opts: ['Burst pipe', 'Blocked drain', 'Leaking tap', 'No water supply', 'Other'] },
    { q: 'Is water damaging the property?', opts: ['Yes, actively', 'Some dampness', 'No, contained'] },
  ],
  ac: [
    { q: 'What is the problem?', opts: ['No cooling', 'No power', 'Unusual noise', 'Water dripping', 'Remote not working'] },
    { q: 'How old is the AC?', opts: ['Less than 2 years', '2–5 years', '5–10 years', 'More than 10 years'] },
  ],
  default: [
    { q: "What best describes the issue?", opts: ["Completely stopped working", "Working poorly", "Making strange sounds", "Visible damage"] },
    { q: 'Is there any immediate safety risk?', opts: ['Yes', 'No', 'Not sure'] },
  ],
};

export default function Questionnaire({ navigate, onBack, selectedService }: Props) {
  const qs = questions[selectedService] || questions.default;
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showWarning, setShowWarning] = useState(false);

  const handleAnswer = (qIdx: number, opt: string) => {
    setAnswers(prev => ({ ...prev, [qIdx]: opt }));
    if (opt === 'Yes' && qs[qIdx].q.includes('smoke')) setShowWarning(true);
    else if (opt !== 'Yes') setShowWarning(false);
  };

  const allAnswered = qs.every((_, i) => answers[i]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Emergency SOS" onBack={onBack} showNotification={false} />
      <SOSProgress step={5} total={7} label="Quick questions" />

      <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full">
        <div className="mb-6">
          <h2 className="font-display font-800 text-xl text-gray-900">A few quick questions</h2>
          <p className="text-gray-500 text-sm mt-1">Helps us send the right technician with the right tools</p>
        </div>

        {showWarning && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 fade-in">
            <span className="text-red-500 text-lg flex-shrink-0">🚨</span>
            <div>
              <p className="text-red-800 font-700 text-sm">Safety warning</p>
              <p className="text-red-700 text-xs mt-0.5">
                If you see smoke, sparks or smell burning — turn off the main switch and leave the area immediately. Do not touch electrical fittings.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {qs.map((q, qi) => (
            <div key={qi}>
              <p className="font-display font-700 text-gray-900 text-sm mb-3">{qi + 1}. {q.q}</p>
              <div className="space-y-2">
                {q.opts.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(qi, opt)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                      answers[qi] === opt
                        ? 'border-red-400 bg-red-50 text-red-700 font-600'
                        : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      answers[qi] === opt ? 'border-red-500' : 'border-gray-300'
                    }`}>
                      {answers[qi] === opt && <div className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('sos-pricing')}
            className="w-full py-4 rounded-xl font-display font-700 text-base bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 active:scale-[0.98] transition-all"
          >
            See Pricing →
          </button>
          {!allAnswered && (
            <button onClick={() => navigate('sos-pricing')} className="w-full text-gray-400 text-sm mt-2 py-2">
              Skip and continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
